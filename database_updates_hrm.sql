
-- 1. Create Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    start_time TIME NOT NULL DEFAULT '07:00',
    end_time TIME NOT NULL DEFAULT '17:00',
    late_threshold TIME NOT NULL DEFAULT '08:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create Leaves Table (Fasaxyada)
CREATE TABLE IF NOT EXISTS public.leaves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- SICK, ANNUAL, etc
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create Documents Table
CREATE TABLE IF NOT EXISTS public.employee_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT,
    url TEXT,
    notes TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Update Employees Table with new fields
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email TEXT;

-- 5. Insert Default Shift
INSERT INTO public.shifts (name, start_time, end_time, late_threshold)
VALUES ('Standard Morning', '07:00', '17:00', '08:00')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
