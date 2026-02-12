
-- 1. Create Devices Table
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g. "Main Gate Scanner"
    ip_address TEXT UNIQUE NOT NULL, -- e.g. "192.168.1.201"
    port INTEGER DEFAULT 4370,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE SET NULL, -- Links device to a specific Center
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Insert Example Device (You can edit this in Supabase Dashboard later)
-- Fadlan IP-ga halkan ku qoran ku bedel kan saxda ah ee xaruntaada
INSERT INTO public.devices (name, ip_address, port, xarun_id)
VALUES ('Main Office Device', '192.168.100.201', 4370, (SELECT id FROM public.xarumo LIMIT 1))
ON CONFLICT (ip_address) DO NOTHING;

-- 3. Add Device ID link to Attendance (Ensure it exists)
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS device_uuid UUID REFERENCES public.devices(id);

NOTIFY pgrst, 'reload schema';
