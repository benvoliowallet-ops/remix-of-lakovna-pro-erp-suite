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
END;
$$ LANGUAGE plpgsql;