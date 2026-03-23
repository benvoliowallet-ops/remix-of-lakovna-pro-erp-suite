
-- Fix mutable search_path warnings on trigger functions

CREATE OR REPLACE FUNCTION public.assign_global_production_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.global_production_number IS NULL THEN
    NEW.global_production_number := nextval('public.global_production_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_due_date_on_handover()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'odovzdane' AND (OLD.status IS NULL OR OLD.status != 'odovzdane') THEN
    IF NEW.payment_method = 'prevod' THEN
      NEW.due_date := CURRENT_DATE + INTERVAL '14 days';
    ELSE
      NEW.due_date := CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
