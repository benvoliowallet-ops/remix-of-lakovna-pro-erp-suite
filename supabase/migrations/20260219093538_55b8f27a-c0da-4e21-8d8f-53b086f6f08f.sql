CREATE POLICY "Workers can insert order_items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'worker'::app_role));