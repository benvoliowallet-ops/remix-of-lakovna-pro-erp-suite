
-- Drop the overly permissive SELECT policy that allows any authenticated user to view all customers
DROP POLICY IF EXISTS "Authenticated can view customers" ON customers;

-- Drop the public view policy (we'll keep customer data private)
DROP POLICY IF EXISTS "Public can view customer name via view" ON customers;

-- Create a new restrictive policy: only admins can SELECT customers
-- The existing "Admins can manage customers" ALL policy already covers this,
-- but we'll add an explicit SELECT policy for clarity
CREATE POLICY "Only admins can view customers"
ON customers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
