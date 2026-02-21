
-- ==========================================================
-- SMARTSTOCK PRO - COMPLETE STABLE SCHEMA
-- ==========================================================

SET search_path TO public;

-- Enable UUID extension if not enabled (useful for other UUID functions if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pgcrypto for gen_random_uuid in older postgres versions (though built-in on PG13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up existing tables (Optional: Comment out if you want to keep data)
-- DROP TABLE IF EXISTS public.attendance CASCADE;
-- DROP TABLE IF EXISTS public.payroll CASCADE;
-- DROP TABLE IF EXISTS public.transactions CASCADE;
-- DROP TABLE IF EXISTS public.inventory_items CASCADE;
-- DROP TABLE IF EXISTS public.employees CASCADE;
-- DROP TABLE IF EXISTS public.branches CASCADE;
-- DROP TABLE IF EXISTS public.xarumo CASCADE;
-- DROP TABLE IF EXISTS public.users_registry CASCADE;
-- DROP TABLE IF EXISTS public.departments CASCADE;

-- 1. Xarumo (Headquarters/Centers)
CREATE TABLE IF NOT EXISTS public.xarumo (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Branches (Warehouses)
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    total_shelves INTEGER DEFAULT 1,
    total_sections INTEGER DEFAULT 1,
    custom_sections JSONB DEFAULT '{}'::jsonb,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2.5 Departments (NEW REQUEST)
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Employees (Shaqaalaha)
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    employee_id_code TEXT UNIQUE NOT NULL, -- This matches ZKTeco User ID
    position TEXT,
    department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL, -- Linked to new table
    status TEXT DEFAULT 'ACTIVE',
    joined_date DATE DEFAULT CURRENT_DATE,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE SET NULL,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    salary NUMERIC DEFAULT 0,
    avatar TEXT,
    fingerprint_hash TEXT,
    warning TEXT,
    consecutive_absences INTEGER DEFAULT 0,
    is_warning_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Inventory Items (Stock-ga)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    sku TEXT UNIQUE NOT NULL, 
    shelves INTEGER DEFAULT 1,
    sections INTEGER DEFAULT 1,
    quantity INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 5,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Transactions (Dhaqdhaqaaqa)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    item_id TEXT,
    item_name TEXT,
    type TEXT CHECK (type IN ('IN', 'OUT', 'TRANSFER')),
    quantity INTEGER NOT NULL,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    target_branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    personnel TEXT,
    origin_source TEXT,
    placement_info TEXT,
    status TEXT DEFAULT 'APPROVED',
    requested_by TEXT,
    approved_by TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE
);

-- 6. Users Registry (Admin Accounts)
CREATE TABLE IF NOT EXISTS public.users_registry (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Attendance / Attendance Logs (Iimaanshaha)
-- This table serves as the 'attendance_logs' requested.
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'LEAVE')),
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE, -- Added Clock Out
    device_id TEXT, -- To track which ZK device sent the data
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Payroll (Mushaharka)
CREATE TABLE IF NOT EXISTS public.payroll (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    base_salary NUMERIC DEFAULT 0,
    bonus NUMERIC DEFAULT 0,
    deduction NUMERIC DEFAULT 0,
    net_pay NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'UNPAID',
    payment_date TIMESTAMP WITH TIME ZONE,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- DISABLE RLS for all tables to avoid permission errors
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.xarumo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
