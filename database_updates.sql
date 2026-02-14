
-- 1. Fix Attendance Table (Add missing columns safely)
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS clock_out TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS overtime_in TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS overtime_out TIMESTAMP WITH TIME ZONE;

-- 2. Create Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, 
    start_time TIME NOT NULL DEFAULT '07:00:00',
    late_threshold TIME NOT NULL DEFAULT '08:00:00',
    absent_threshold TIME NOT NULL DEFAULT '09:00:00',
    end_time TIME NOT NULL DEFAULT '17:00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Update Employees Table Links
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shifts(id);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS finger_id INTEGER;

-- 4. Create Default Shift
INSERT INTO public.shifts (name, start_time, late_threshold, absent_threshold, end_time)
VALUES ('Standard Morning', '07:00:00', '08:00:00', '09:00:00', '17:00:00')
ON CONFLICT DO NOTHING;

-- 5. Assign Default Shift to Employees who don't have one
UPDATE public.employees 
SET shift_id = (SELECT id FROM public.shifts LIMIT 1) 
WHERE shift_id IS NULL;

-- 6. Helper View for Python Script (Replaces old view)
CREATE OR REPLACE VIEW employee_shift_view AS
SELECT 
    e.id as employee_id,
    e.name,
    e.finger_id,
    e.employee_id_code,
    e.branch_id,
    s.start_time,
    s.late_threshold,
    s.absent_threshold
FROM employees e
LEFT JOIN shifts s ON e.shift_id = s.id;

-- 7. Update Payroll Table for Hourly Calculation
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;

-- 8. Force Schema Reload
NOTIFY pgrst, 'reload schema';
