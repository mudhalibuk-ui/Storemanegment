
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES DEFINITION
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    total_shelves INTEGER DEFAULT 1,
    total_sections INTEGER DEFAULT 1,
    custom_sections JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Jadwalka Users-ka ee Cloud-ka
CREATE TABLE IF NOT EXISTS users_registry (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STAFF',
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    category TEXT,
    sku TEXT NOT NULL,
    shelves INTEGER DEFAULT 1,
    sections INTEGER DEFAULT 1,
    quantity INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 5,
    branch_id TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
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

-- 3. RLS POLICIES (U furista dadka oo dhan maadaama aan gacanta ku maamulayno)
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Universal access" ON branches;
DROP POLICY IF EXISTS "Universal access" ON users_registry;
DROP POLICY IF EXISTS "Universal access" ON inventory_items;
DROP POLICY IF EXISTS "Universal access" ON transactions;

CREATE POLICY "Universal access" ON branches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Universal access" ON users_registry FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Universal access" ON inventory_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Universal access" ON transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
