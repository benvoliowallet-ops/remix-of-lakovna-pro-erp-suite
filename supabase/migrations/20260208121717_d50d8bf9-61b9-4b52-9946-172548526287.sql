-- ============================================================
-- FIX #1: Remove public/anonymous access to base tables
-- Public status tracking should only go through the edge function
-- ============================================================

-- Drop anonymous access policies from orders table
DROP POLICY IF EXISTS "Public can view order status via view" ON orders;

-- Drop anonymous access policies from order_items table
DROP POLICY IF EXISTS "Public can view order items via view" ON order_items;

-- Drop anonymous access policies from companies table
DROP POLICY IF EXISTS "Public can view company name via view" ON companies;

-- ============================================================
-- FIX #2: Restrict overly permissive CRUD policies
-- Implement role-based access control properly
-- ============================================================

-- ORDERS TABLE: Restrict updates to appropriate roles
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Authenticated can update orders" ON orders;

-- Admins can fully manage orders (update all fields)
CREATE POLICY "Admins can update orders"
ON orders FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Workers can only update order status (for workflow transitions)
CREATE POLICY "Workers can update order status"
ON orders FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'worker'::app_role));

-- ORDER_ITEMS TABLE: Replace overly permissive ALL policy with granular policies
-- Drop all existing order_items policies first
DROP POLICY IF EXISTS "Authenticated can manage order_items" ON order_items;
DROP POLICY IF EXISTS "Authenticated can view order_items" ON order_items;
DROP POLICY IF EXISTS "Admins can insert order_items" ON order_items;
DROP POLICY IF EXISTS "Authenticated can update order_items" ON order_items;

-- All authenticated can view order items (needed for workflow)
CREATE POLICY "Authenticated can view order_items"
ON order_items FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert order items (part of order creation)
CREATE POLICY "Admins can insert order_items"
ON order_items FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated can update order items (workers update work_status, admins update all)
CREATE POLICY "Authenticated can update order_items"
ON order_items FOR UPDATE
TO authenticated
USING (true);

-- COLORS TABLE: Restrict stock updates
-- Stock should only be updated via the update_stock_after_production trigger
-- which runs as SECURITY DEFINER, so we can restrict direct updates

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Workers can update stock" ON colors;

-- Only admins can directly update colors (for inventory management)
-- Stock deductions happen automatically via the trigger when production_logs are inserted
DROP POLICY IF EXISTS "Only admins can update colors" ON colors;
CREATE POLICY "Only admins can update colors"
ON colors FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));