
-- 1. SET SEARCH PATH
SET search_path TO public;

-- 2. TABLES (Using gen_random_uuid() which is built-in for modern Postgres)

-- Table: Xarumaha (Centers)
CREATE TABLE IF NOT EXISTS public.xarumo (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table: Bakhaarada (Branches)
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    total_shelves INTEGER DEFAULT 1,
    total_sections INTEGER DEFAULT 1,
    custom_sections JSONB DEFAULT '{}'::jsonb,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table: Users Registry
CREATE TABLE IF NOT EXISTS public.users_registry (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STAFF',
    avatar TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table: Inventory Items
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    category TEXT,
    sku TEXT NOT NULL,
    shelves INTEGER DEFAULT 1,
    sections INTEGER DEFAULT 1,
    quantity INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 5,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT inventory_items_sku_branch_unique UNIQUE (sku, branch_id)
);

-- Table: Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    item_id TEXT,
    item_name TEXT NOT NULL,
    type TEXT CHECK (type IN ('IN', 'OUT', 'TRANSFER')),
    quantity INTEGER NOT NULL,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    target_branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    notes TEXT,
    personnel TEXT,
    origin_source TEXT,
    placement_info TEXT,
    status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_by TEXT,
    approved_by TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. PERMISSIONS REFRESH
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure PostgREST can see the tables
ALTER TABLE public.xarumo OWNER TO postgres;
ALTER TABLE public.branches OWNER TO postgres;
ALTER TABLE public.users_registry OWNER TO postgres;
ALTER TABLE public.inventory_items OWNER TO postgres;
ALTER TABLE public.transactions OWNER TO postgres;

-- 4. CRITICAL: FORCE API CACHE RELOAD
NOTIFY pgrst, 'reload schema';

-- 5. RLS POLICIES
ALTER TABLE public.xarumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Universal access xarumo" ON public.xarumo;
CREATE POLICY "Universal access xarumo" ON public.xarumo FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Universal access branches" ON public.branches;
CREATE POLICY "Universal access branches" ON public.branches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Universal access users" ON public.users_registry;
CREATE POLICY "Universal access users" ON public.users_registry FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Universal access items" ON public.inventory_items;
CREATE POLICY "Universal access items" ON public.inventory_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Universal access transactions" ON public.transactions;
CREATE POLICY "Universal access transactions" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
