-- database_v3_complete.sql

-- 1. Fleet Management
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    driver_id TEXT,
    driver_name TEXT,
    status TEXT DEFAULT 'ACTIVE',
    fuel_level NUMERIC DEFAULT 100,
    last_service_date DATE,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    today_trips JSONB DEFAULT '[]'::jsonb,
    current_location JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL,
    cost NUMERIC NOT NULL,
    odometer_reading NUMERIC,
    personnel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. CRM
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    contact_name TEXT,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    expected_revenue NUMERIC DEFAULT 0,
    probability NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'NEW',
    priority TEXT DEFAULT 'MEDIUM',
    owner_id TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. MRP
CREATE TABLE IF NOT EXISTS public.bills_of_materials (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    product_name TEXT,
    reference TEXT,
    components JSONB DEFAULT '[]'::jsonb,
    labor_cost NUMERIC DEFAULT 0,
    overhead_cost NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_orders (
    id TEXT PRIMARY KEY,
    bom_id TEXT REFERENCES public.bills_of_materials(id) ON DELETE SET NULL,
    product_id TEXT,
    product_name TEXT,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'PLANNED',
    planned_date DATE,
    actual_date DATE,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    personnel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Project Management
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'PLANNED',
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    manager_id TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    project_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'TODO',
    assigned_to TEXT,
    priority TEXT DEFAULT 'MEDIUM',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Quality Control
CREATE TABLE IF NOT EXISTS public.qc_inspections (
    id TEXT PRIMARY KEY,
    entity_type TEXT,
    entity_id TEXT,
    entity_name TEXT,
    inspector_id TEXT,
    inspector_name TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    checklist JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. DMS
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT,
    url TEXT,
    owner_id TEXT,
    entity_type TEXT,
    entity_id TEXT,
    file_size INTEGER,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Helpdesk
CREATE TABLE IF NOT EXISTS public.tickets (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    customer_name TEXT,
    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'MEDIUM',
    status TEXT DEFAULT 'OPEN',
    assigned_to TEXT,
    assigned_name TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Currencies
CREATE TABLE IF NOT EXISTS public.currencies (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT,
    exchange_rate NUMERIC DEFAULT 1,
    is_base BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Inventory Adjustments
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id TEXT PRIMARY KEY,
    item_id TEXT,
    item_name TEXT,
    type TEXT,
    quantity INTEGER,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Stock Take Sessions
CREATE TABLE IF NOT EXISTS public.stock_take_sessions (
    id TEXT PRIMARY KEY,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'OPEN',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_by TEXT,
    assigned_users JSONB DEFAULT '[]'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    progress NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_id TEXT,
    user_name TEXT,
    action TEXT,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 12. Missing Columns Updates
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'SALE';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Disable RLS for all new tables
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills_of_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_take_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Notify reload
NOTIFY pgrst, 'reload schema';
