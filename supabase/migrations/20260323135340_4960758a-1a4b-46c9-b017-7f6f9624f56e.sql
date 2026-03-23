
-- ============================================================
-- FAZA 1 / KROK 1: Tabuľka tenants + pomocná funkcia
-- ============================================================

CREATE TABLE public.tenants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  ico            TEXT,
  dic            TEXT,
  ic_dph         TEXT,
  address        TEXT,
  plan           TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE POLICY "Tenant sees own row"
  ON public.tenants FOR SELECT
  USING (id = public.get_tenant_id());

CREATE POLICY "Tenant can update own row"
  ON public.tenants FOR UPDATE
  USING (id = public.get_tenant_id());


-- ============================================================
-- FAZA 1 / KROK 2: Pridaj tenant_id do všetkých tabuliek
-- ============================================================

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.colors
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.price_list
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.production_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_adjustments
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_customers_tenant         ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_colors_tenant            ON public.colors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_list_tenant        ON public.price_list(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant            ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant       ON public.order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_logs_tenant   ON public.production_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adj_tenant     ON public.inventory_adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant        ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant         ON public.companies(tenant_id);


-- ============================================================
-- FAZA 1 / KROK 3: Prepis RLS politík — tenant izolácia
-- ============================================================

-- CUSTOMERS
DROP POLICY IF EXISTS "Authenticated can view customers"     ON public.customers;
DROP POLICY IF EXISTS "Authenticated can insert customers"   ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers"          ON public.customers;

CREATE POLICY "Tenant can view own customers"
  ON public.customers FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant admin can update customers"
  ON public.customers FOR UPDATE
  USING (tenant_id = public.get_tenant_id()
    AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant admin can delete customers"
  ON public.customers FOR DELETE
  USING (tenant_id = public.get_tenant_id()
    AND public.has_role(auth.uid(), 'admin'));

-- COLORS
DROP POLICY IF EXISTS "Authenticated can view colors"   ON public.colors;
DROP POLICY IF EXISTS "Admins can manage colors"        ON public.colors;
DROP POLICY IF EXISTS "Only admins can update colors"   ON public.colors;
DROP POLICY IF EXISTS "Workers can update stock"        ON public.colors;

CREATE POLICY "Tenant can view own colors"
  ON public.colors FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant admin can insert colors"
  ON public.colors FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id()
    AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant admin can update colors"
  ON public.colors FOR UPDATE
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant admin can delete colors"
  ON public.colors FOR DELETE
  USING (tenant_id = public.get_tenant_id()
    AND public.has_role(auth.uid(), 'admin'));

-- PRICE_LIST
DROP POLICY IF EXISTS "Authenticated can view price_list"   ON public.price_list;
DROP POLICY IF EXISTS "Admins can manage price_list"        ON public.price_list;

CREATE POLICY "Tenant can view own price_list"
  ON public.price_list FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant admin can manage price_list"
  ON public.price_list FOR ALL
  USING (tenant_id = public.get_tenant_id()
    AND public.has_role(auth.uid(), 'admin'));

-- ORDERS
DROP POLICY IF EXISTS "Authenticated can view orders"   ON public.orders;
DROP POLICY IF EXISTS "Authenticated can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders"        ON public.orders;
DROP POLICY IF EXISTS "Workers can update order status" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders"        ON public.orders;

CREATE POLICY "Tenant can view own orders"
  ON public.orders FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant can update own orders"
  ON public.orders FOR UPDATE
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant admin can delete orders"
  ON public.orders FOR DELETE
  USING (tenant_id = public.get_tenant_id()
    AND public.has_role(auth.uid(), 'admin'));

-- ORDER_ITEMS
DROP POLICY IF EXISTS "Authenticated can view order_items"   ON public.order_items;
DROP POLICY IF EXISTS "Admins can insert order_items"        ON public.order_items;
DROP POLICY IF EXISTS "Workers can insert order_items"       ON public.order_items;
DROP POLICY IF EXISTS "Admins can update all order_items"    ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete order_items"        ON public.order_items;

CREATE POLICY "Tenant can view own order_items"
  ON public.order_items FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant can manage own order_items"
  ON public.order_items FOR ALL
  USING (tenant_id = public.get_tenant_id());

-- PRODUCTION_LOGS
DROP POLICY IF EXISTS "Authenticated can view production_logs"  ON public.production_logs;
DROP POLICY IF EXISTS "Workers can create production_logs"      ON public.production_logs;

CREATE POLICY "Tenant can view own production_logs"
  ON public.production_logs FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant workers can create production_logs"
  ON public.production_logs FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id()
    AND auth.uid() = worker_id);

-- INVENTORY_ADJUSTMENTS
DROP POLICY IF EXISTS "Authenticated can view adjustments"      ON public.inventory_adjustments;
DROP POLICY IF EXISTS "Admins can manage adjustments"           ON public.inventory_adjustments;
DROP POLICY IF EXISTS "Workers can insert adjustments"          ON public.inventory_adjustments;

CREATE POLICY "Tenant can view own inventory_adjustments"
  ON public.inventory_adjustments FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant can manage own inventory_adjustments"
  ON public.inventory_adjustments FOR ALL
  USING (tenant_id = public.get_tenant_id());

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view own role"     ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles"   ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles"     ON public.user_roles;

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Tenant admin can view tenant roles"
  ON public.user_roles FOR SELECT
  USING (tenant_id = public.get_tenant_id()
    AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant admin can manage tenant roles"
  ON public.user_roles FOR ALL
  USING (tenant_id = public.get_tenant_id()
    AND public.has_role(auth.uid(), 'admin'));

-- COMPANIES
DROP POLICY IF EXISTS "Authenticated can view companies"  ON public.companies;
DROP POLICY IF EXISTS "Admins can manage companies"       ON public.companies;

CREATE POLICY "Tenant can view own companies"
  ON public.companies FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenant admin can manage companies"
  ON public.companies FOR ALL
  USING (tenant_id = public.get_tenant_id()
    AND public.has_role(auth.uid(), 'admin'));

-- Oprava has_role — tenant-aware
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        tenant_id = public.get_tenant_id()
        OR public.get_tenant_id() IS NULL
      )
  )
$$;


-- ============================================================
-- FAZA 1 / KROK 4: Oprava triggerov + create_tenant_for_user
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_stock_after_production()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_color_id  UUID;
  v_tenant_id UUID;
BEGIN
  SELECT oi.color_id, o.tenant_id
    INTO v_color_id, v_tenant_id
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = NEW.order_item_id;

  IF v_color_id IS NOT NULL AND v_tenant_id IS NOT NULL THEN
    UPDATE public.colors
      SET stock_kg = stock_kg - NEW.consumed_kg
      WHERE id = v_color_id
        AND tenant_id = v_tenant_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_stock ON public.production_logs;
CREATE TRIGGER trigger_update_stock
  AFTER INSERT ON public.production_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_after_production();

CREATE OR REPLACE FUNCTION public.create_tenant_for_user(
  p_name     TEXT,
  p_ico      TEXT DEFAULT NULL,
  p_dic      TEXT DEFAULT NULL,
  p_ic_dph   TEXT DEFAULT NULL,
  p_address  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id   UUID := auth.uid();
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND tenant_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already has a tenant assigned.';
  END IF;

  INSERT INTO public.tenants (name, ico, dic, ic_dph, address)
  VALUES (p_name, p_ico, p_dic, p_ic_dph, p_address)
  RETURNING id INTO v_tenant_id;

  UPDATE public.profiles
  SET tenant_id = v_tenant_id
  WHERE id = v_user_id;

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (v_user_id, 'admin', v_tenant_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.price_list (item_type, price_per_m2, tenant_id)
  VALUES
    ('ram',    20, v_tenant_id),
    ('vypln',  14, v_tenant_id),
    ('lamely', 16, v_tenant_id),
    ('sito',   20, v_tenant_id);

  RETURN v_tenant_id;
END;
$$;


-- ============================================================
-- FAZA 1 / KROK 5: Seed data cleanup + auto_tenant_id trigger
-- ============================================================

DELETE FROM public.companies
WHERE name IN ('Lakovňa s.r.o.', 'Jozef Živnostník')
  AND tenant_id IS NULL;

DELETE FROM public.price_list
WHERE tenant_id IS NULL;

DELETE FROM public.colors
WHERE tenant_id IS NULL
  AND ral_code IN ('9005', '7016', '9010', '3000', '6005')
  AND created_at < NOW() - INTERVAL '1 second';

CREATE OR REPLACE FUNCTION public.auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Cannot insert: user has no tenant assigned. Complete onboarding first.';
  END IF;

  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'customers', 'colors', 'price_list', 'orders',
    'order_items', 'production_logs', 'inventory_adjustments',
    'companies'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS auto_tenant_id ON public.%I;
       CREATE TRIGGER auto_tenant_id
         BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();',
      tbl, tbl
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_tenant_status()
RETURNS TABLE (
  plan          TEXT,
  trial_ends_at TIMESTAMPTZ,
  is_trial      BOOLEAN,
  is_expired    BOOLEAN,
  days_left     INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.plan,
    t.trial_ends_at,
    t.plan = 'trial'                                  AS is_trial,
    t.plan = 'trial' AND t.trial_ends_at < NOW()      AS is_expired,
    GREATEST(0, EXTRACT(DAY FROM t.trial_ends_at - NOW())::INTEGER) AS days_left
  FROM public.tenants t
  WHERE t.id = public.get_tenant_id();
$$;
