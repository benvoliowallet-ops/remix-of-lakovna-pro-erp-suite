-- Register the delete_paired_items trigger on order_items
-- The function already exists; this creates the actual trigger
CREATE TRIGGER trg_delete_paired_items
  AFTER DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_paired_items();