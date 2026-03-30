
-- ERP Tables: Customers, Vendors, Sales, Ledger, Chart of Accounts

-- 0. Chart of Accounts
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    balance NUMERIC DEFAULT 0,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1. Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Vendors
CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    category TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Sales
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    apply_vat BOOLEAN DEFAULT FALSE,
    payment_method TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    personnel TEXT,
    is_vat_sale BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Ledger
CREATE TABLE IF NOT EXISTS public.ledger (
    id TEXT PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    description TEXT,
    type TEXT CHECK (type IN ('DEBIT', 'CREDIT')),
    account_code TEXT,
    account_name TEXT,
    amount NUMERIC DEFAULT 0,
    reference_id TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Update Inventory Items for ERP
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS pack_type TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS last_known_price NUMERIC DEFAULT 0;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS landed_cost NUMERIC DEFAULT 0;

-- 6. Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    amount NUMERIC DEFAULT 0,
    method TEXT CHECK (method IN ('CASH', 'BANK')),
    type TEXT CHECK (type IN ('INCOME', 'EXPENSE', 'CUSTOMER_PAYMENT', 'VENDOR_PAYMENT')),
    reference_id TEXT,
    description TEXT,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    personnel TEXT,
    account_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Purchase Orders (Simple)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
    vendor_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'DRAFT',
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expected_date DATE,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    xarun_id TEXT REFERENCES public.xarumo(id) ON DELETE CASCADE,
    personnel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissions
GRANT ALL ON public.chart_of_accounts TO anon, authenticated, service_role;
GRANT ALL ON public.customers TO anon, authenticated, service_role;
GRANT ALL ON public.vendors TO anon, authenticated, service_role;
GRANT ALL ON public.sales TO anon, authenticated, service_role;
GRANT ALL ON public.ledger TO anon, authenticated, service_role;
GRANT ALL ON public.payments TO anon, authenticated, service_role;
GRANT ALL ON public.purchase_orders TO anon, authenticated, service_role;

-- Disable RLS
ALTER TABLE public.chart_of_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;

-- Initial Chart of Accounts Data
INSERT INTO public.chart_of_accounts (id, code, name, type, xarun_id) VALUES
('coa-1', '1000', 'Cash on Hand', 'ASSET', NULL),
('coa-2', '1100', 'Bank Balance', 'ASSET', NULL),
('coa-3', '1200', 'Accounts Receivable', 'ASSET', NULL),
('coa-4', '1300', 'Inventory', 'ASSET', NULL),
('coa-5', '2000', 'VAT Payable', 'LIABILITY', NULL),
('coa-6', '2100', 'Accounts Payable', 'LIABILITY', NULL),
('coa-7', '3000', 'Owner Equity', 'EQUITY', NULL),
('coa-8', '4000', 'Sales Revenue', 'REVENUE', NULL),
('coa-9', '5000', 'Cost of Goods Sold', 'EXPENSE', NULL),
('coa-10', '5100', 'Operating Expenses', 'EXPENSE', NULL),
('coa-11', '5200', 'Payroll Expenses', 'EXPENSE', NULL)
ON CONFLICT (code) DO NOTHING;

-- Notify
NOTIFY pgrst, 'reload schema';
