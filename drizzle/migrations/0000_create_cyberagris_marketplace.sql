CREATE TYPE public.app_role AS ENUM ('farmer', 'buyer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL,
  phone text,
  location text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users choose own initial role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND NOT EXISTS (SELECT 1 FROM public.user_roles existing WHERE existing.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  description text NOT NULL DEFAULT '',
  category text NOT NULL CHECK (category IN ('Fresh Produce','Fish & Seafood','Pantry Staples','Meat & Poultry','Grains & Oils','Farm Inputs')),
  price numeric(12,2) NOT NULL CHECK (price > 0),
  unit text NOT NULL DEFAULT 'item',
  stock integer NOT NULL DEFAULT 1 CHECK (stock >= 0),
  image_url text,
  location text,
  is_deal boolean NOT NULL DEFAULT false,
  discount_percent integer NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 90),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','sold_out')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can browse active products" ON public.products FOR SELECT TO anon, authenticated USING (status = 'active' OR farmer_id = auth.uid());
CREATE POLICY "Farmers can add products" ON public.products FOR INSERT TO authenticated WITH CHECK (farmer_id = auth.uid() AND public.has_role(auth.uid(), 'farmer'));
CREATE POLICY "Farmers can update own products" ON public.products FOR UPDATE TO authenticated USING (farmer_id = auth.uid() AND public.has_role(auth.uid(), 'farmer')) WITH CHECK (farmer_id = auth.uid() AND public.has_role(auth.uid(), 'farmer'));
CREATE POLICY "Farmers can delete own products" ON public.products FOR DELETE TO authenticated USING (farmer_id = auth.uid() AND public.has_role(auth.uid(), 'farmer'));
CREATE INDEX products_category_status_idx ON public.products (category, status, created_at DESC);
CREATE INDEX products_farmer_idx ON public.products (farmer_id, created_at DESC);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  farmer_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total numeric(12,2) NOT NULL CHECK (total > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','delivered','cancelled')),
  delivery_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers and farmers can view related orders" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR farmer_id = auth.uid());
CREATE POLICY "Buyers can place orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid() AND public.has_role(auth.uid(), 'buyer') AND farmer_id = (SELECT p.farmer_id FROM public.products p WHERE p.id = product_id AND p.status = 'active'));
CREATE POLICY "Related users can update order status" ON public.orders FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR farmer_id = auth.uid()) WITH CHECK (buyer_id = auth.uid() OR farmer_id = auth.uid());
CREATE INDEX orders_buyer_idx ON public.orders (buyer_id, created_at DESC);
CREATE INDEX orders_farmer_idx ON public.orders (farmer_id, created_at DESC);

CREATE POLICY "Product images are publicly readable" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'product-images');
CREATE POLICY "Farmers can upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'farmer') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Farmers can update own product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND owner_id = auth.uid()::text) WITH CHECK (bucket_id = 'product-images' AND owner_id = auth.uid()::text);
CREATE POLICY "Farmers can delete own product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND owner_id = auth.uid()::text);