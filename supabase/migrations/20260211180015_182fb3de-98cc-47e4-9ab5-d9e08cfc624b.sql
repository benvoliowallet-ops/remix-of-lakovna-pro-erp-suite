
-- 1. Remove auto-increment default and unique constraint
ALTER TABLE order_items ALTER COLUMN global_production_number DROP DEFAULT;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_global_production_number_key;

-- 2. Create a new sequence for manual numbering
CREATE SEQUENCE IF NOT EXISTS global_production_seq START WITH 1;

-- Sync sequence with existing max value
SELECT setval('global_production_seq', COALESCE((SELECT MAX(global_production_number) FROM order_items), 0) + 1, false);

-- 3. Paired item cascade delete trigger
CREATE OR REPLACE FUNCTION delete_paired_items()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM order_items 
    WHERE global_production_number = OLD.global_production_number 
    AND order_id = OLD.order_id
    AND id != OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delete_paired_items ON order_items;
CREATE TRIGGER trigger_delete_paired_items
BEFORE DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION delete_paired_items();
