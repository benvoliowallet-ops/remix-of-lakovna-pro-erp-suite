
-- Create inventory_adjustments table for tracking stock discrepancies
CREATE TABLE public.inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  color_id UUID REFERENCES public.colors(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.profiles(id),
  expected_weight_kg DECIMAL(10, 3) NOT NULL,
  actual_weight_kg DECIMAL(10, 3) NOT NULL,
  difference_kg DECIMAL(10, 3) NOT NULL,
  reason TEXT DEFAULT 'Weight entry discrepancy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Workers can insert adjustments
CREATE POLICY "Workers can insert adjustments"
ON public.inventory_adjustments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = worker_id);

-- Authenticated can view adjustments
CREATE POLICY "Authenticated can view adjustments"
ON public.inventory_adjustments
FOR SELECT TO authenticated
USING (true);

-- Admins can manage adjustments
CREATE POLICY "Admins can manage adjustments"
ON public.inventory_adjustments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
