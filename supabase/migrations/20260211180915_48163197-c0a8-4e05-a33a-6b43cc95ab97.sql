CREATE OR REPLACE FUNCTION delete_paired_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent infinite recursion
    IF current_setting('app.deleting_paired', true) = 'true' THEN
        RETURN OLD;
    END IF;

    PERFORM set_config('app.deleting_paired', 'true', true);

    DELETE FROM order_items 
    WHERE global_production_number = OLD.global_production_number 
    AND order_id = OLD.order_id
    AND id != OLD.id;

    PERFORM set_config('app.deleting_paired', 'false', true);

    RETURN OLD;
EXCEPTION WHEN OTHERS THEN
    -- If paired items were already deleted (e.g. batch delete), ignore
    PERFORM set_config('app.deleting_paired', 'false', true);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Change from BEFORE to AFTER trigger
DROP TRIGGER IF EXISTS trigger_delete_paired_items ON order_items;
CREATE TRIGGER trigger_delete_paired_items
AFTER DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION delete_paired_items();