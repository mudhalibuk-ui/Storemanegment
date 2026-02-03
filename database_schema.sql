
-- ==========================================================
-- DATABASE REPAIR & SCHEMA REFRESH
-- Run this in Supabase SQL Editor to fix PGRST204 errors
-- ==========================================================

SET search_path TO public;

-- 1. Hubi in jadwalka 'xarumo' uu jiro (Waa aasaaska xiriirka)
CREATE TABLE IF NOT EXISTS public.xarumo (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Ku dar xarun_id jadwalka 'branches' haddii uusan ku jirin
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='branches' AND column_name='xarun_id') THEN
        ALTER TABLE public.branches ADD COLUMN xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Hubi in jadwalka 'inventory_items' uu leeyahay xarun_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='xarun_id') THEN
        ALTER TABLE public.inventory_items ADD COLUMN xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Hubi in jadwalka 'transactions' uu leeyahay xarun_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='xarun_id') THEN
        ALTER TABLE public.transactions ADD COLUMN xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Hubi in jadwalka 'users_registry' uu leeyahay xarun_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_registry' AND column_name='xarun_id') THEN
        ALTER TABLE public.users_registry ADD COLUMN xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Hubi HRM tables haddii ay jiraan
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    employee_id_code TEXT UNIQUE,
    position TEXT,
    status TEXT DEFAULT 'ACTIVE',
    joined_date DATE,
    salary NUMERIC DEFAULT 0,
    avatar TEXT,
    fingerprint_hash TEXT,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'LEAVE')),
    clock_in TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

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
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Refresh the PostgREST cache (MUHIIM!)
NOTIFY pgrst, 'reload schema';

-- 8. Sii dhamaan ogolaanshaha (Permissions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
