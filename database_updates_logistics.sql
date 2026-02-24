-- Create xarun_orders table
CREATE TABLE IF NOT EXISTS public.xarun_orders (
    id TEXT PRIMARY KEY,
    source_xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE SET NULL,
    target_xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE SET NULL,
    requested_by TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    approved_by TEXT,
    target_branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL
);

-- Create inter_branch_transfer_requests table
CREATE TABLE IF NOT EXISTS public.inter_branch_transfer_requests (
    id TEXT PRIMARY KEY,
    source_xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE SET NULL,
    source_branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    target_xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE SET NULL,
    target_branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    requested_by TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'REQUESTED',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    audit_trail JSONB DEFAULT '[]'::jsonb,
    approved_by TEXT,
    prepared_by TEXT,
    shipped_by TEXT,
    received_by TEXT,
    rack_number TEXT,
    bin_location TEXT,
    expected_arrival_date DATE
);

-- Add supplier column to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Disable RLS
ALTER TABLE public.xarun_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inter_branch_transfer_requests DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.xarun_orders TO anon, authenticated, service_role;
GRANT ALL ON public.inter_branch_transfer_requests TO anon, authenticated, service_role;

-- Notify reload
NOTIFY pgrst, 'reload schema';
