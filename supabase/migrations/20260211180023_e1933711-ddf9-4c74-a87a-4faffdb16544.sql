
-- Fix search_path for delete_paired_items
CREATE OR REPLACE FUNCTION delete_paired_items()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM order_items 
    WHERE global_production_number = OLD.global_production_number 
    AND order_id = OLD.order_id
    AND id != OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;
