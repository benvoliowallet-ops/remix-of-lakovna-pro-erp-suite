-- Add due_date and invoice_url columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for invoices bucket
CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view invoices"
ON storage.objects
FOR SELECT
USING (bucket_id = 'invoices');

CREATE POLICY "Admins can update invoices"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'invoices' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete invoices"
ON storage.objects
FOR DELETE
USING (bucket_id = 'invoices' AND auth.role() = 'authenticated');

-- Create function to auto-set due_date when order status changes to 'odovzdane'
CREATE OR REPLACE FUNCTION public.set_due_date_on_handover()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes TO 'odovzdane'
  IF NEW.status = 'odovzdane' AND (OLD.status IS NULL OR OLD.status != 'odovzdane') THEN
    -- Set due_date based on payment method
    IF NEW.payment_method = 'prevod' THEN
      NEW.due_date := CURRENT_DATE + INTERVAL '14 days';
    ELSE
      -- For hotovost, karta, postova_poukazka, interne
      NEW.due_date := CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_due_date ON public.orders;
CREATE TRIGGER trigger_set_due_date
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_due_date_on_handover();