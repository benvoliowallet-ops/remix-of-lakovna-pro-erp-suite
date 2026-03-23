-- Create a view for public order status (no sensitive data)
CREATE OR REPLACE VIEW public.order_status_public AS
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

-- Allow public access to the view
GRANT SELECT ON public.order_status_public TO anon;

-- Create a view for public order items (no sensitive data like prices)
CREATE OR REPLACE VIEW public.order_items_public AS
SELECT 
  id,
  order_id,
  work_status,
  item_type,
  description
FROM public.order_items;

-- Allow public access to the view  
GRANT SELECT ON public.order_items_public TO anon;