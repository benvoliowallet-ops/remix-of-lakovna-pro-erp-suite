-- Pridať stĺpce pre sledovanie stavu práce na položkách
ALTER TABLE order_items 
ADD COLUMN work_status text DEFAULT 'pending',
ADD COLUMN weight_before_temp numeric,
ADD COLUMN estimated_consumption_kg numeric;

-- Pridať nastavenie pre výťažnosť farby do firiem
ALTER TABLE companies 
ADD COLUMN paint_coverage_m2_per_kg numeric DEFAULT 8;

-- Komentáre pre dokumentáciu
COMMENT ON COLUMN order_items.work_status IS 'Stav práce na položke: pending, in_progress, completed';
COMMENT ON COLUMN order_items.weight_before_temp IS 'Dočasná váha farby pred nastriekaním (kg)';
COMMENT ON COLUMN order_items.estimated_consumption_kg IS 'Odhadovaná spotreba farby (kg)';
COMMENT ON COLUMN companies.paint_coverage_m2_per_kg IS 'Priemerná výťažnosť farby v m²/kg';