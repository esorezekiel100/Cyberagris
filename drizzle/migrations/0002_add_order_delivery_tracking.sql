ALTER TABLE public.orders
  ADD COLUMN fulfillment_status text NOT NULL DEFAULT 'awaiting_payment',
  ADD COLUMN delivery_method text NOT NULL DEFAULT 'cyberagris_rider',
  ADD COLUMN courier_name text,
  ADD COLUMN courier_phone text,
  ADD COLUMN estimated_delivery date,
  ADD COLUMN fulfillment_updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_status_check CHECK (fulfillment_status IN ('awaiting_payment','preparing','ready_for_pickup','in_transit','delivered','cancelled'));
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_method_check CHECK (delivery_method IN ('cyberagris_rider','farmer_delivery','buyer_pickup'));

UPDATE public.orders SET fulfillment_status = 'preparing' WHERE status = 'confirmed';

-- Order changes now go only through secure functions
DROP POLICY IF EXISTS "Related users can update order status" ON public.orders;

CREATE TABLE public.order_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_tracking_events TO authenticated;
GRANT ALL ON public.order_tracking_events TO service_role;
ALTER TABLE public.order_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants can view tracking" ON public.order_tracking_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid())));
CREATE INDEX order_tracking_events_order_idx ON public.order_tracking_events(order_id, created_at);

INSERT INTO public.order_tracking_events (order_id, status, note, created_by)
SELECT id, 'preparing', 'Payment received. The farmer is preparing your order.', buyer_id FROM public.orders WHERE status = 'confirmed';

CREATE OR REPLACE FUNCTION public.update_order_fulfillment(
  _order_id uuid, _status text, _note text DEFAULT NULL, _delivery_method text DEFAULT NULL,
  _courier_name text DEFAULT NULL, _courier_phone text DEFAULT NULL, _estimated_delivery date DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders;
  v_steps text[] := ARRAY['preparing','ready_for_pickup','in_transit','delivered'];
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.farmer_id <> auth.uid() OR NOT public.has_role(auth.uid(), 'farmer') THEN RAISE EXCEPTION 'Only the farmer can update delivery'; END IF;
  IF v_order.status <> 'confirmed' THEN RAISE EXCEPTION 'Delivery can only be updated after payment'; END IF;
  IF NOT (_status = ANY(v_steps)) THEN RAISE EXCEPTION 'Invalid delivery status'; END IF;
  IF v_order.fulfillment_status = 'delivered' THEN RAISE EXCEPTION 'This order has already been delivered'; END IF;
  IF array_position(v_steps, _status) < coalesce(array_position(v_steps, v_order.fulfillment_status), 0) THEN RAISE EXCEPTION 'Delivery status cannot move backwards'; END IF;
  IF _note IS NOT NULL AND char_length(_note) > 500 THEN RAISE EXCEPTION 'Note is too long'; END IF;

  UPDATE public.orders SET
    fulfillment_status = _status,
    delivery_method = coalesce(_delivery_method, delivery_method),
    courier_name = coalesce(nullif(trim(_courier_name), ''), courier_name),
    courier_phone = coalesce(nullif(trim(_courier_phone), ''), courier_phone),
    estimated_delivery = coalesce(_estimated_delivery, estimated_delivery),
    fulfillment_updated_at = now()
  WHERE id = _order_id;

  INSERT INTO public.order_tracking_events (order_id, status, note, created_by)
  VALUES (_order_id, _status, nullif(trim(_note), ''), auth.uid());
END; $$;
REVOKE ALL ON FUNCTION public.update_order_fulfillment(uuid, text, text, text, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_fulfillment(uuid, text, text, text, text, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.pay_for_order(_order_id uuid, _payment_reference text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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

  UPDATE public.orders SET status = 'confirmed', fulfillment_status = 'preparing', fulfillment_updated_at = now() WHERE id = v_order.id;

  INSERT INTO public.order_tracking_events (order_id, status, note, created_by)
  VALUES (v_order.id, 'preparing', 'Payment received. The farmer is preparing your order.', auth.uid());

  INSERT INTO public.farmer_balances (farmer_id, balance, total_earned)
  VALUES (v_order.farmer_id, v_order.total, v_order.total)
  ON CONFLICT (farmer_id) DO UPDATE
  SET balance = public.farmer_balances.balance + EXCLUDED.balance,
      total_earned = public.farmer_balances.total_earned + EXCLUDED.total_earned,
      updated_at = now();

  RETURN jsonb_build_object('order_id', v_order.id, 'payment_id', v_payment.id, 'status', 'paid', 'amount', v_order.total);
END;
$function$;