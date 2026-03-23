-- =============================================
-- STEP 1: ADD NEW COLUMNS TO TABLES
-- =============================================

-- Add columns to COMPANIES table
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 23,
  ADD COLUMN IF NOT EXISTS address text;

-- Add columns to COLORS table  
ALTER TABLE public.colors
  ADD COLUMN IF NOT EXISTS color_name text,
  ADD COLUMN IF NOT EXISTS price_per_kg_purchase numeric DEFAULT 0;

-- Rename min_stock_alert to min_stock_limit if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colors' AND column_name = 'min_stock_alert') THEN
    ALTER TABLE public.colors RENAME COLUMN min_stock_alert TO min_stock_limit;
  END IF;
END $$;

-- Add is_paid column to ORDERS
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;

-- Create new item_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_item_type') THEN
    CREATE TYPE public.order_item_type AS ENUM ('standard', 'stlp', 'disky', 'zaklad', 'lamely_sito');
  END IF;
END $$;

-- Add new columns to ORDER_ITEMS
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS global_production_number integer,
  ADD COLUMN IF NOT EXISTS item_type public.order_item_type DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS base_coat_id uuid,
  ADD COLUMN IF NOT EXISTS top_coat_id uuid,
  ADD COLUMN IF NOT EXISTS price_per_m2 numeric DEFAULT 0;

-- Add foreign key constraints for base_coat_id and top_coat_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_items_base_coat_id_fkey'
  ) THEN
    ALTER TABLE public.order_items 
      ADD CONSTRAINT order_items_base_coat_id_fkey 
      FOREIGN KEY (base_coat_id) REFERENCES public.order_items(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_items_top_coat_id_fkey'
  ) THEN
    ALTER TABLE public.order_items 
      ADD CONSTRAINT order_items_top_coat_id_fkey 
      FOREIGN KEY (top_coat_id) REFERENCES public.order_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create sequence for global production numbers
CREATE SEQUENCE IF NOT EXISTS public.global_production_number_seq START 1;

-- Set default for global_production_number using sequence
ALTER TABLE public.order_items 
  ALTER COLUMN global_production_number SET DEFAULT nextval('public.global_production_number_seq');

-- Create function to auto-assign global production number
CREATE OR REPLACE FUNCTION public.assign_global_production_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.global_production_number IS NULL THEN
    NEW.global_production_number := nextval('public.global_production_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assigning production number
DROP TRIGGER IF EXISTS assign_production_number_trigger ON public.order_items;
CREATE TRIGGER assign_production_number_trigger
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_global_production_number();

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_order_items_global_production_number 
  ON public.order_items(global_production_number);