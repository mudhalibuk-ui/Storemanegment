-- 1. EXTENSIONS & PREPARATION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FORCE CLEANUP OF CONSTRAINTS (Xalinta Error 23503 & 23505)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- A. TIRTIR XAYIRAADAHA FOREIGN KEY
    ALTER TABLE IF EXISTS public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_branch_id_fkey CASCADE;
    ALTER TABLE IF EXISTS public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_branch_fkey CASCADE;
    ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_item_id_fkey CASCADE;
    ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_branch_id_fkey CASCADE;
    ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_target_branch_id_fkey CASCADE;

    -- B. XALINTA ERROR 23505: Tirtir xayiraadda SKU-ga ee Global-ka ah
    -- Tani waxay ogolaanaysaa in hal SKU uu ka jiri karo branches kala duwan.
    ALTER TABLE IF EXISTS public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_sku_key CASCADE;

    -- C. TIRTIR DHAMAAN CONSTRAINTS-KA (FK) EE KALA DUWAN SI LOO HUBNIYO
    FOR r IN (
        SELECT tc.table_name, tc.constraint_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE IF EXISTS public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
END $$;

-- 3. CONVERT COLUMN TYPES TO TEXT (Match app IDs)
ALTER TABLE IF EXISTS branches ALTER COLUMN id TYPE TEXT;
ALTER TABLE IF EXISTS inventory_items ALTER COLUMN id TYPE TEXT;
ALTER TABLE IF EXISTS inventory_items ALTER COLUMN branch_id TYPE TEXT;
ALTER TABLE IF EXISTS transactions ALTER COLUMN id TYPE TEXT;
ALTER TABLE IF EXISTS transactions ALTER COLUMN item_id TYPE TEXT;
ALTER TABLE IF EXISTS transactions ALTER COLUMN branch_id TYPE TEXT;
ALTER TABLE IF EXISTS transactions ALTER COLUMN target_branch_id TYPE TEXT;

-- 4. TABLES DEFINITION
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    total_shelves INTEGER DEFAULT 1,
    total_sections INTEGER DEFAULT 1,
    custom_sections JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    category TEXT,
    sku TEXT NOT NULL, -- Lagama dhigayo UNIQUE halkan
    shelves INTEGER DEFAULT 1,
    sections INTEGER DEFAULT 1,
    quantity INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 5,
    branch_id TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    -- XALINTA 23505: SKU-ga wuxuu ku dhex unique yahay branch-ka kaliya
    CONSTRAINT inventory_items_sku_branch_unique UNIQUE (sku, branch_id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    item_id TEXT,
    item_name TEXT NOT NULL,
    type TEXT CHECK (type IN ('IN', 'OUT', 'TRANSFER')),
    quantity INTEGER NOT NULL,
    branch_id TEXT,
    target_branch_id TEXT,
    notes TEXT,
    personnel TEXT,
    origin_source TEXT,
    placement_info TEXT,
    status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_by TEXT,
    approved_by TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. RLS POLICIES
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.' || quote_ident(pol.tablename);
    END LOOP;
END $$;

CREATE POLICY "Universal access" ON branches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Universal access" ON inventory_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Universal access" ON transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;