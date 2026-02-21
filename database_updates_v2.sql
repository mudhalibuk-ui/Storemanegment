-- Add columns for warning system
ALTER TABLE employees ADD COLUMN IF NOT EXISTS warning TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS consecutive_absences INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_warning_dismissed BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
