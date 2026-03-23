
-- Create an RPC function to get the next production number
CREATE OR REPLACE FUNCTION nextval_production_seq()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('global_production_seq');
$$;
