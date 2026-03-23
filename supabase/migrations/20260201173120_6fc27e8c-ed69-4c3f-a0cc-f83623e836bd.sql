-- Allow only admins to delete orders
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow only admins to delete order items (cascade with order)
CREATE POLICY "Admins can delete order_items"
ON public.order_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));