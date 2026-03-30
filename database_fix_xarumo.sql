
-- Fix xarumo table by adding missing columns
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'BASIC';
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10;
ALTER TABLE public.xarumo ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
