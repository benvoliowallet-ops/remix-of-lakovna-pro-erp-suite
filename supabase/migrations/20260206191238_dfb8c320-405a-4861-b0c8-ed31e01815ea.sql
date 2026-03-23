-- Drop and recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS public.order_status_public;
DROP VIEW IF EXISTS public.order_items_public;

-- Recreate view with SECURITY INVOKER for public order status
CREATE VIEW public.order_status_public 
WITH (security_invoker=on) AS
SELECT 
  o.id,
  o.status,
  o.created_at,
  o.deadline_at,
  c.name as customer_name,
  c.company_name as customer_company,
  comp.name as company_name
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.companies comp ON o.company_id = comp.id;

-- Recreate view with SECURITY INVOKER for public order items
CREATE VIEW public.order_items_public 
WITH (security_invoker=on) AS
SELECT 
  id,
  order_id,
  work_status,
  item_type,
  description
FROM public.order_items;

-- Grant access to anon role
GRANT SELECT ON public.order_status_public TO anon;
GRANT SELECT ON public.order_items_public TO anon;

-- Create RLS policy for anon to select from orders (via view)
CREATE POLICY "Public can view order status via view" 
ON public.orders 
FOR SELECT 
TO anon
USING (true);

-- Create RLS policy for anon to select from order_items (via view)
CREATE POLICY "Public can view order items via view" 
ON public.order_items 
FOR SELECT 
TO anon
USING (true);

-- Create RLS policy for anon to select from customers (via view)
CREATE POLICY "Public can view customer name via view" 
ON public.customers 
FOR SELECT 
TO anon
USING (true);

-- Create RLS policy for anon to select from companies (via view)
CREATE POLICY "Public can view company name via view" 
ON public.companies 
FOR SELECT 
TO anon
USING (true);