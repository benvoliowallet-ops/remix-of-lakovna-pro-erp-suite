-- Add batch_group_id column to order_items
ALTER TABLE public.order_items ADD COLUMN batch_group_id UUID DEFAULT NULL;

-- Update RPC function to support batch_group_id
CREATE OR REPLACE FUNCTION public.update_order_item_work_fields(
  _item_id UUID,
  _work_status TEXT DEFAULT NULL,
  _weight_before_temp NUMERIC DEFAULT NULL,
  _batch_group_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Perform the update
  UPDATE order_items
  SET 
    work_status = COALESCE(_work_status, work_status),
    weight_before_temp = CASE 
      WHEN _work_status = 'completed' THEN NULL 
      ELSE COALESCE(_weight_before_temp, weight_before_temp) 
    END,
    batch_group_id = CASE
      WHEN _batch_group_id IS NOT NULL THEN _batch_group_id
      ELSE batch_group_id
    END
  WHERE id = _item_id;
END;
$$;