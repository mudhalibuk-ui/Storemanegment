-- Ensure tables exist with proper permissions
CREATE TABLE IF NOT EXISTS public.xarun_orders (
    id TEXT PRIMARY KEY,
    source_xarun_id TEXT,
    target_xarun_id TEXT,
    requested_by TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    approved_by TEXT,
    target_branch_id TEXT
);

CREATE TABLE IF NOT EXISTS public.inter_branch_transfer_requests (
    id TEXT PRIMARY KEY,
    source_xarun_id TEXT,
    source_branch_id TEXT,
    target_xarun_id TEXT,
    target_branch_id TEXT,
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

-- Grant permissions explicitly
GRANT ALL ON public.xarun_orders TO anon, authenticated, service_role;
GRANT ALL ON public.inter_branch_transfer_requests TO anon, authenticated, service_role;

-- Notify reload
NOTIFY pgrst, 'reload schema';
