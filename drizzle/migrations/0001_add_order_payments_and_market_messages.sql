CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
  buyer_id uuid NOT NULL,
  farmer_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded')),
  payment_reference text NOT NULL UNIQUE,
  paid_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Related users can view payments" ON public.payments FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR farmer_id = auth.uid());
CREATE INDEX payments_buyer_idx ON public.payments (buyer_id, paid_at DESC);
CREATE INDEX payments_farmer_idx ON public.payments (farmer_id, paid_at DESC);

CREATE TABLE public.farmer_balances (
  farmer_id uuid PRIMARY KEY,
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.farmer_balances TO authenticated;
GRANT ALL ON public.farmer_balances TO service_role;
ALTER TABLE public.farmer_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farmers can view their balance" ON public.farmer_balances FOR SELECT TO authenticated USING (farmer_id = auth.uid() AND public.has_role(auth.uid(), 'farmer'));
CREATE INDEX farmer_balances_farmer_idx ON public.farmer_balances (farmer_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  farmer_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id),
  order_id uuid REFERENCES public.orders(id),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR farmer_id = auth.uid());
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND ((buyer_id = auth.uid() AND public.has_role(auth.uid(), 'buyer')) OR (farmer_id = auth.uid() AND public.has_role(auth.uid(), 'farmer')))
  AND (
    (order_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = buyer_id AND o.farmer_id = farmer_id AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())))
    OR
    (product_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.farmer_id = farmer_id AND p.status = 'active'))
  )
);
CREATE INDEX messages_buyer_idx ON public.messages (buyer_id, created_at DESC);
CREATE INDEX messages_farmer_idx ON public.messages (farmer_id, created_at DESC);
CREATE INDEX messages_order_idx ON public.messages (order_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.pay_for_order(_order_id uuid, _payment_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_payment public.payments;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.buyer_id <> auth.uid() THEN RAISE EXCEPTION 'Only the buyer can pay for this order'; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'This order has already been processed'; END IF;
  IF _payment_reference IS NULL OR char_length(_payment_reference) < 8 THEN RAISE EXCEPTION 'A valid payment reference is required'; END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE order_id = v_order.id) THEN RAISE EXCEPTION 'This order has already been paid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = v_order.product_id AND stock >= v_order.quantity AND status = 'active') THEN RAISE EXCEPTION 'This product is no longer available in the requested quantity'; END IF;

  INSERT INTO public.payments (order_id, buyer_id, farmer_id, amount, payment_reference)
  VALUES (v_order.id, v_order.buyer_id, v_order.farmer_id, v_order.total, _payment_reference)
  RETURNING * INTO v_payment;

  UPDATE public.products
  SET stock = stock - v_order.quantity,
      status = CASE WHEN stock - v_order.quantity = 0 THEN 'sold_out' ELSE status END,
      updated_at = now()
  WHERE id = v_order.product_id;

  UPDATE public.orders SET status = 'confirmed' WHERE id = v_order.id;

  INSERT INTO public.farmer_balances (farmer_id, balance, total_earned)
  VALUES (v_order.farmer_id, v_order.total, v_order.total)
  ON CONFLICT (farmer_id) DO UPDATE
  SET balance = public.farmer_balances.balance + EXCLUDED.balance,
      total_earned = public.farmer_balances.total_earned + EXCLUDED.total_earned,
      updated_at = now();

  RETURN jsonb_build_object('order_id', v_order.id, 'payment_id', v_payment.id, 'status', 'paid', 'amount', v_order.total);
END;
$$;
GRANT EXECUTE ON FUNCTION public.pay_for_order(uuid, text) TO authenticated;

COMMENT ON TABLE public.payments IS 'Payment records created only by pay_for_order after buyer authentication.';
COMMENT ON TABLE public.farmer_balances IS 'Farmer earnings updated only by pay_for_order.';