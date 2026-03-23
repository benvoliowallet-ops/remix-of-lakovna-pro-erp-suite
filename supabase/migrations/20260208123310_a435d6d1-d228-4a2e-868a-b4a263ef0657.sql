-- ============================================================
-- FIX #1: Complete Anonymous Access Removal
-- Revoke GRANT statements that were never cleaned up
-- ============================================================

-- Revoke view access from anon role (originally granted in migration 20260206191238)
REVOKE SELECT ON public.order_status_public FROM anon;
REVOKE SELECT ON public.order_items_public FROM anon;

-- ============================================================
-- FIX #2: Restrict Workers to Only Update Work-Related Fields
-- Prevent privilege escalation where workers can modify prices/orders
-- ============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated can update order_items" ON order_items;

-- Create SECURITY DEFINER function for workers to safely update work status
-- This validates inputs and only allows specific field changes
CREATE OR REPLACE FUNCTION public.update_order_item_work_fields(
  _item_id UUID,
  _work_status TEXT DEFAULT NULL,
  _weight_before_temp NUMERIC DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status TEXT;
BEGIN
  -- Validate caller has worker or admin role
  IF NOT has_role(auth.uid(), 'worker'::app_role) AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: requires worker or admin role';
  END IF;

  -- Validate item exists
  SELECT work_status INTO _current_status FROM order_items WHERE id = _item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  -- Validate work_status value if provided
  IF _work_status IS NOT NULL AND _work_status NOT IN ('pending', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid work status: %', _work_status;
  END IF;

  -- Validate weight is reasonable if provided
  IF _weight_before_temp IS NOT NULL AND (_weight_before_temp < 0 OR _weight_before_temp > 10000) THEN
    RAISE EXCEPTION 'Invalid weight value: %', _weight_before_temp;
  END IF;

  -- Perform the update - only these two fields
  UPDATE order_items
  SET 
    work_status = COALESCE(_work_status, work_status),
    weight_before_temp = COALESCE(_weight_before_temp, weight_before_temp)
  WHERE id = _item_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_order_item_work_fields(UUID, TEXT, NUMERIC) TO authenticated;

-- Remove direct UPDATE access for workers
-- Only admins can directly update order_items
DROP POLICY IF EXISTS "Workers can update order_items" ON order_items;
DROP POLICY IF EXISTS "Admins can update all order_items" ON order_items;

-- Admins: full update access
CREATE POLICY "Admins can update all order_items"
ON order_items FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));