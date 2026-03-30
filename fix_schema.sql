-- Alter inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS pack_type TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS last_known_price NUMERIC;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS selling_price NUMERIC;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS landed_cost NUMERIC;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Alter transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS unit_cost NUMERIC;
ALTER TABLE public.transactions RENAME COLUMN origin_source TO origin_or_source;

-- Update the CHECK constraint on transactions.type
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('IN', 'OUT', 'TRANSFER', 'MOVE', 'ADJUSTMENT'));
