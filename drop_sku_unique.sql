ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_sku_key;
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_sku_branch_id_key UNIQUE (sku, branch_id);
