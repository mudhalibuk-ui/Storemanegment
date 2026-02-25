-- Drop the existing unique constraint on SKU
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_sku_key;

-- Add a composite unique constraint on (sku, branch_id)
-- This allows the same SKU to exist in multiple branches, but only once per branch.
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_sku_branch_key UNIQUE (sku, branch_id);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
