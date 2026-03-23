-- Fix security issue: Make invoices bucket private to protect sensitive financial documents
UPDATE storage.buckets 
SET public = false 
WHERE id = 'invoices';

-- Add RLS policy for invoices bucket - only admins can access
CREATE POLICY "Only admins can access invoices"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'invoices' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'invoices' AND has_role(auth.uid(), 'admin'::app_role));