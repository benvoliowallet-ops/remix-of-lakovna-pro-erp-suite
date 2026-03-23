DROP POLICY "Only admins can view customers" ON public.customers;

CREATE POLICY "Authenticated can view customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (true);