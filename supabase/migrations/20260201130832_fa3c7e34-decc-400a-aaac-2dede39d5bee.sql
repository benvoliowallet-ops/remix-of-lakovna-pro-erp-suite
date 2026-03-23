-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'worker');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('prijate', 'vo_vyrobe', 'ukoncene', 'odovzdane');

-- Create enum for payment method
CREATE TYPE public.payment_method AS ENUM ('hotovost', 'karta', 'prevod', 'postova_poukazka', 'interne');

-- Create enum for transport type
CREATE TYPE public.transport_type AS ENUM ('zakaznik', 'zvoz');

-- Create enum for item type
CREATE TYPE public.item_type AS ENUM ('ram', 'vypln', 'lamely', 'sito');

-- Create enum for structure type
CREATE TYPE public.structure_type AS ENUM ('hladka', 'jemna', 'hruba', 'antik', 'kladivkova');

-- Create enum for gloss type
CREATE TYPE public.gloss_type AS ENUM ('leskle', 'matne', 'polomatne', 'satenovane');

-- Companies table (Moje firmy)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_vat_payer BOOLEAN DEFAULT FALSE,
    ico TEXT,
    dic TEXT,
    ic_dph TEXT,
    bank_account TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    pin_code TEXT CHECK (pin_code ~ '^\d{4}$'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'worker',
    UNIQUE (user_id, role)
);

-- Customers table (Zákazníci)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    billing_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colors table (Sklad farieb)
CREATE TABLE public.colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ral_code TEXT NOT NULL,
    structure structure_type NOT NULL DEFAULT 'hladka',
    gloss gloss_type NOT NULL DEFAULT 'matne',
    density NUMERIC(4,2) DEFAULT 1.5,
    price_per_kg NUMERIC(10,2) DEFAULT 0,
    stock_kg NUMERIC(10,3) DEFAULT 0,
    min_stock_alert NUMERIC(10,3) DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price list table (Cenník charakterov)
CREATE TABLE public.price_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type item_type NOT NULL UNIQUE,
    price_per_m2 NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table (Zákazky)
CREATE TABLE public.orders (
    id SERIAL PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id),
    customer_id UUID REFERENCES public.customers(id),
    status order_status DEFAULT 'prijate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deadline_at TIMESTAMPTZ,
    transport_in transport_type DEFAULT 'zakaznik',
    transport_out transport_type DEFAULT 'zakaznik',
    payment_method payment_method DEFAULT 'hotovost',
    notes TEXT
);

-- Order items table (Položky zákazky)
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE,
    description TEXT,
    price_list_id UUID REFERENCES public.price_list(id),
    color_id UUID REFERENCES public.colors(id),
    is_double_layer BOOLEAN DEFAULT FALSE,
    area_m2 NUMERIC(10,4) DEFAULT 0,
    total_price NUMERIC(10,2) DEFAULT 0,
    is_rework BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production logs table (Výroba)
CREATE TABLE public.production_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES auth.users(id),
    weight_before NUMERIC(10,3),
    weight_after NUMERIC(10,3),
    consumed_kg NUMERIC(10,3) GENERATED ALWAYS AS (weight_before - weight_after) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles (only admins can manage)
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for companies (all authenticated can view, admins can modify)
CREATE POLICY "Authenticated can view companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage companies" ON public.companies FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for customers
CREATE POLICY "Authenticated can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for colors
CREATE POLICY "Authenticated can view colors" ON public.colors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage colors" ON public.colors FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers can update stock" ON public.colors FOR UPDATE TO authenticated USING (true);

-- RLS Policies for price_list
CREATE POLICY "Authenticated can view price_list" ON public.price_list FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage price_list" ON public.price_list FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Authenticated can view orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update orders" ON public.orders FOR UPDATE TO authenticated USING (true);

-- RLS Policies for order_items
CREATE POLICY "Authenticated can view order_items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage order_items" ON public.order_items FOR ALL TO authenticated USING (true);

-- RLS Policies for production_logs
CREATE POLICY "Authenticated can view production_logs" ON public.production_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Workers can create production_logs" ON public.production_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = worker_id);

-- Trigger to update stock after production log
CREATE OR REPLACE FUNCTION public.update_stock_after_production()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.colors
    SET stock_kg = stock_kg - NEW.consumed_kg
    WHERE id = (SELECT color_id FROM public.order_items WHERE id = NEW.order_item_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_stock
AFTER INSERT ON public.production_logs
FOR EACH ROW EXECUTE FUNCTION public.update_stock_after_production();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'worker');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert initial data: Companies
INSERT INTO public.companies (name, is_vat_payer, ico, dic, ic_dph) VALUES
('Lakovňa s.r.o.', true, '12345678', '2012345678', 'SK2012345678'),
('Jozef Živnostník', false, '87654321', '1087654321', NULL);

-- Insert initial data: Price list
INSERT INTO public.price_list (item_type, price_per_m2) VALUES
('ram', 20),
('vypln', 14),
('lamely', 16),
('sito', 20);

-- Insert initial data: Sample colors
INSERT INTO public.colors (ral_code, structure, gloss, density, price_per_kg, stock_kg, min_stock_alert) VALUES
('9005', 'hladka', 'matne', 1.5, 8.50, 25.000, 5),
('7016', 'jemna', 'matne', 1.5, 9.00, 18.500, 5),
('9010', 'hladka', 'leskle', 1.5, 7.50, 30.000, 5),
('3000', 'hladka', 'leskle', 1.5, 10.00, 12.000, 5),
('6005', 'hruba', 'matne', 1.6, 11.00, 8.500, 5);