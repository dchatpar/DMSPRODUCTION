-- ============================================================================
-- ADAPTUS DMS - COMPLETE DATABASE SCHEMA
-- Single file: Creates tables, policies, indexes, triggers if not exists
-- Consolidates all SQL files into one for simplicity
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'Staff' CHECK (role IN ('Admin', 'Manager', 'Staff', 'Salesperson')),
    start_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vin TEXT UNIQUE NOT NULL,
    stock_number TEXT,
    year INTEGER NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    trim TEXT,
    odometer INTEGER DEFAULT 0,
    condition TEXT DEFAULT 'Used' CHECK (condition IN ('New', 'Used', 'Certified')),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Sold', 'Pending', 'Traded')),
    exterior_color TEXT,
    interior_color TEXT,
    fuel_type TEXT,
    transmission TEXT,
    drivetrain TEXT,
    engine TEXT,
    body_style TEXT,
    purchase_price NUMERIC(12,2) DEFAULT 0,
    retail_price NUMERIC(12,2) DEFAULT 0,
    extra_costs NUMERIC(12,2) DEFAULT 0,
    taxes NUMERIC(12,2) DEFAULT 0,
    image_gallery TEXT[],
    images TEXT,
    description TEXT,
    features TEXT[],
    carfax_report_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    source TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Deals table
CREATE TABLE IF NOT EXISTS sales_deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    salesperson_id UUID REFERENCES users(id) ON DELETE SET NULL,
    deal_date DATE DEFAULT CURRENT_DATE,
    sale_price NUMERIC(12,2) NOT NULL,
    down_payment NUMERIC(12,2) DEFAULT 0,
    trade_in_value NUMERIC(12,2) DEFAULT 0,
    deal_status TEXT DEFAULT 'Open' CHECK (deal_status IN ('Open', 'Pending', 'Closed', 'Lost', 'Cancelled')),
    financing_notes TEXT,
    warranty_package TEXT,
    gap_coverage BOOLEAN DEFAULT false,
    tire_coverage BOOLEAN DEFAULT false,
    paint_protection BOOLEAN DEFAULT false,
    extended_service BOOLEAN DEFAULT false,
    admin_fee NUMERIC(12,2) DEFAULT 0,
    total_price NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES sales_deals(id) ON DELETE SET NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    payment_amount NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    interest_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'Website' CHECK (source IN ('Website', 'Referral', 'Event', 'Walk-in', 'Facebook', 'Craigslist', 'Kijiji', 'Phone', 'Instagram')),
    status TEXT DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Qualified', 'Closed', 'Lost')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    lead_creation_date TIMESTAMPTZ DEFAULT NOW(),
    last_engagement TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test Drives table
CREATE TABLE IF NOT EXISTS test_drives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No Show')),
    notes TEXT,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors table (creates if not exists, adds columns if missing, migrates data)
CREATE TABLE IF NOT EXISTS vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_type TEXT DEFAULT 'General',
    vendor_name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    gst_number TEXT,
    hst_number TEXT,
    pst_number TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns (safe - won't affect existing data)
DO $$
BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vendor_type') THEN
        ALTER TABLE vendors ADD COLUMN vendor_type TEXT DEFAULT 'General';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vendor_name') THEN
        ALTER TABLE vendors ADD COLUMN vendor_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'phone') THEN
        ALTER TABLE vendors ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'gst_number') THEN
        ALTER TABLE vendors ADD COLUMN gst_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'hst_number') THEN
        ALTER TABLE vendors ADD COLUMN hst_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'pst_number') THEN
        ALTER TABLE vendors ADD COLUMN pst_number TEXT;
    END IF;
END $$;

-- Migrate data from old 'name' column to 'vendor_name'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'name')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vendor_name') THEN
        -- Copy name to vendor_name where vendor_name is null
        UPDATE vendors SET vendor_name = name WHERE vendor_name IS NULL AND name IS NOT NULL;
        -- Drop the old name column if it exists (after data migration)
        ALTER TABLE vendors DROP COLUMN IF EXISTS name;
    END IF;
END $$;

-- Make vendor_name NOT NULL after data migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vendor_name') THEN
        ALTER TABLE vendors ALTER COLUMN vendor_name SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- OPERATIONS TABLES
-- ============================================================================

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'General',
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid', 'Cancelled')),
    reference_number TEXT,
    notes TEXT,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    payment_method TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    source_type TEXT,
    source_id UUID,
    paid_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table (enhanced)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled', 'On Hold')),
    notes TEXT,
    tags TEXT[],
    completed_at TIMESTAMPTZ,
    source_type TEXT,
    source_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Notes table
CREATE TABLE IF NOT EXISTS task_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Reminders table
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    message TEXT,
    is_sent BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Links table (links tasks to various modules)
CREATE TABLE IF NOT EXISTS task_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    link_type TEXT NOT NULL CHECK (link_type IN ('lead', 'customer', 'test_drive', 'deal', 'vehicle', 'invoice')),
    linked_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, link_type, linked_id)
);

-- Task Automation Rules table
CREATE TABLE IF NOT EXISTS task_automation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB,
    action_type TEXT NOT NULL,
    action_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Activity Log table
CREATE TABLE IF NOT EXISTS task_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    source_type TEXT,
    source_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Comments table
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Activity Log table
CREATE TABLE IF NOT EXISTS ticket_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-ups table
CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    follow_up_date DATE NOT NULL,
    follow_up_time TIME,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled', 'Rescheduled')),
    notes TEXT,
    reminder_at TIMESTAMPTZ,
    source_type TEXT,
    source_id UUID,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-up History table
CREATE TABLE IF NOT EXISTS follow_up_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follow_up_id UUID REFERENCES follow_ups(id) ON DELETE CASCADE NOT NULL,
    edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ DEFAULT NOW(),
    previous_description TEXT,
    new_description TEXT,
    previous_status TEXT,
    new_status TEXT,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'status_changed', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-up Activity Log table
CREATE TABLE IF NOT EXISTS follow_up_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follow_up_id UUID REFERENCES follow_ups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Activity Log table
CREATE TABLE IF NOT EXISTS expense_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill of Sale table
CREATE TABLE IF NOT EXISTS bill_of_sale (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id UUID REFERENCES sales_deals(id) ON DELETE SET NULL,
    document_number TEXT UNIQUE,
    sale_date DATE DEFAULT CURRENT_DATE,
    buyer_name TEXT NOT NULL,
    buyer_address TEXT,
    seller_name TEXT,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    vin TEXT,
    year INTEGER,
    make TEXT,
    model TEXT,
    sale_price NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    odometer INTEGER,
    is_financed BOOLEAN DEFAULT false,
    lender_name TEXT,
    lender_address TEXT,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Signed', 'Completed', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SOCIAL MEDIA TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_media_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('Facebook', 'Instagram', 'Twitter', 'LinkedIn')),
    content TEXT NOT NULL,
    media_urls TEXT[],
    scheduled_date TIMESTAMPTZ,
    published_date TIMESTAMPTZ,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Published', 'Failed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_business_account (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_name TEXT NOT NULL,
    page_id TEXT,
    page_name TEXT,
    access_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PURCHASE TRACKING TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_from_public (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    purchase_date DATE NOT NULL,
    purchase_price NUMERIC(12,2) NOT NULL,
    seller_name TEXT NOT NULL,
    seller_phone TEXT,
    seller_address TEXT,
    vin_verified BOOLEAN DEFAULT false,
    title_received BOOLEAN DEFAULT false,
    title_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Sale', 'Expense', 'Refund', 'Payment', 'Adjustment')),
    category TEXT,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_remind_at ON task_reminders(remind_at) WHERE is_sent = false;
CREATE INDEX IF NOT EXISTS idx_task_links_task_id ON task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_links_linked ON task_links(link_type, linked_id);

CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);

CREATE INDEX IF NOT EXISTS idx_follow_ups_customer_id ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_created_by ON follow_ups(created_by);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_follow_up_date ON follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_history_follow_up_id ON follow_up_history(follow_up_id);

CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON expenses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);

CREATE INDEX IF NOT EXISTS idx_deals_vehicle_id ON sales_deals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON sales_deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON sales_deals(deal_status);

CREATE INDEX IF NOT EXISTS idx_test_drives_vehicle_id ON test_drives(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_customer_id ON test_drives(customer_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_scheduled_date ON test_drives(scheduled_date);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create/update triggers (drop first if exists to recreate)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_notes_updated_at ON task_notes;
CREATE TRIGGER update_task_notes_updated_at BEFORE UPDATE ON task_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_comments_updated_at ON ticket_comments;
CREATE TRIGGER update_ticket_comments_updated_at BEFORE UPDATE ON ticket_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_follow_ups_updated_at ON follow_ups;
CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON follow_ups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_deals_updated_at ON sales_deals;
CREATE TRIGGER update_sales_deals_updated_at BEFORE UPDATE ON sales_deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_drives_updated_at ON test_drives;
CREATE TRIGGER update_test_drives_updated_at BEFORE UPDATE ON test_drives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_task_activity(
    p_task_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO task_activity (task_id, user_id, action, old_value, new_value)
    VALUES (p_task_id, p_user_id, p_action, p_old_value, p_new_value)
    RETURNING id INTO v_activity_id;
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_ticket_activity(
    p_ticket_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO ticket_activity (ticket_id, user_id, action, old_value, new_value)
    VALUES (p_ticket_id, p_user_id, p_action, p_old_value, p_new_value)
    RETURNING id INTO v_activity_id;
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_follow_up_activity(
    p_follow_up_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO follow_up_activity (follow_up_id, user_id, action, old_value, new_value)
    VALUES (p_follow_up_id, p_user_id, p_action, p_old_value, p_new_value)
    RETURNING id INTO v_activity_id;
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_expense_activity(
    p_expense_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO expense_activity (expense_id, user_id, action, old_value, new_value)
    VALUES (p_expense_id, p_user_id, p_action, p_old_value, p_new_value)
    RETURNING id INTO v_activity_id;
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_of_sale ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_business_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_from_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only create if not exists (using DO blocks)
DO $$
BEGIN
    -- Users policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'users_select_policy' AND polrelid = 'users'::regclass) THEN
        CREATE POLICY users_select_policy ON users FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'users_insert_policy' AND polrelid = 'users'::regclass) THEN
        CREATE POLICY users_insert_policy ON users FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'users_update_policy' AND polrelid = 'users'::regclass) THEN
        CREATE POLICY users_update_policy ON users FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'users_delete_policy' AND polrelid = 'users'::regclass) THEN
        CREATE POLICY users_delete_policy ON users FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Vehicles policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicles_select_policy' AND polrelid = 'vehicles'::regclass) THEN
        CREATE POLICY vehicles_select_policy ON vehicles FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicles_insert_policy' AND polrelid = 'vehicles'::regclass) THEN
        CREATE POLICY vehicles_insert_policy ON vehicles FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicles_update_policy' AND polrelid = 'vehicles'::regclass) THEN
        CREATE POLICY vehicles_update_policy ON vehicles FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicles_delete_policy' AND polrelid = 'vehicles'::regclass) THEN
        CREATE POLICY vehicles_delete_policy ON vehicles FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Customers policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'customers_select_policy' AND polrelid = 'customers'::regclass) THEN
        CREATE POLICY customers_select_policy ON customers FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'customers_insert_policy' AND polrelid = 'customers'::regclass) THEN
        CREATE POLICY customers_insert_policy ON customers FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'customers_update_policy' AND polrelid = 'customers'::regclass) THEN
        CREATE POLICY customers_update_policy ON customers FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'customers_delete_policy' AND polrelid = 'customers'::regclass) THEN
        CREATE POLICY customers_delete_policy ON customers FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Sales Deals policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'sales_deals_select_policy' AND polrelid = 'sales_deals'::regclass) THEN
        CREATE POLICY sales_deals_select_policy ON sales_deals FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'sales_deals_insert_policy' AND polrelid = 'sales_deals'::regclass) THEN
        CREATE POLICY sales_deals_insert_policy ON sales_deals FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'sales_deals_update_policy' AND polrelid = 'sales_deals'::regclass) THEN
        CREATE POLICY sales_deals_update_policy ON sales_deals FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'sales_deals_delete_policy' AND polrelid = 'sales_deals'::regclass) THEN
        CREATE POLICY sales_deals_delete_policy ON sales_deals FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Invoices policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'invoices_select_policy' AND polrelid = 'invoices'::regclass) THEN
        CREATE POLICY invoices_select_policy ON invoices FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'invoices_insert_policy' AND polrelid = 'invoices'::regclass) THEN
        CREATE POLICY invoices_insert_policy ON invoices FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'invoices_update_policy' AND polrelid = 'invoices'::regclass) THEN
        CREATE POLICY invoices_update_policy ON invoices FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'invoices_delete_policy' AND polrelid = 'invoices'::regclass) THEN
        CREATE POLICY invoices_delete_policy ON invoices FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Leads policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'leads_select_policy' AND polrelid = 'leads'::regclass) THEN
        CREATE POLICY leads_select_policy ON leads FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'leads_insert_policy' AND polrelid = 'leads'::regclass) THEN
        CREATE POLICY leads_insert_policy ON leads FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'leads_update_policy' AND polrelid = 'leads'::regclass) THEN
        CREATE POLICY leads_update_policy ON leads FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'leads_delete_policy' AND polrelid = 'leads'::regclass) THEN
        CREATE POLICY leads_delete_policy ON leads FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Test Drives policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'test_drives_select_policy' AND polrelid = 'test_drives'::regclass) THEN
        CREATE POLICY test_drives_select_policy ON test_drives FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'test_drives_insert_policy' AND polrelid = 'test_drives'::regclass) THEN
        CREATE POLICY test_drives_insert_policy ON test_drives FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'test_drives_update_policy' AND polrelid = 'test_drives'::regclass) THEN
        CREATE POLICY test_drives_update_policy ON test_drives FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'test_drives_delete_policy' AND polrelid = 'test_drives'::regclass) THEN
        CREATE POLICY test_drives_delete_policy ON test_drives FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Vendors policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vendors_select_policy' AND polrelid = 'vendors'::regclass) THEN
        CREATE POLICY vendors_select_policy ON vendors FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vendors_insert_policy' AND polrelid = 'vendors'::regclass) THEN
        CREATE POLICY vendors_insert_policy ON vendors FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vendors_update_policy' AND polrelid = 'vendors'::regclass) THEN
        CREATE POLICY vendors_update_policy ON vendors FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vendors_delete_policy' AND polrelid = 'vendors'::regclass) THEN
        CREATE POLICY vendors_delete_policy ON vendors FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Expenses policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'expenses_select_policy' AND polrelid = 'expenses'::regclass) THEN
        CREATE POLICY expenses_select_policy ON expenses FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'expenses_insert_policy' AND polrelid = 'expenses'::regclass) THEN
        CREATE POLICY expenses_insert_policy ON expenses FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'expenses_update_policy' AND polrelid = 'expenses'::regclass) THEN
        CREATE POLICY expenses_update_policy ON expenses FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'expenses_delete_policy' AND polrelid = 'expenses'::regclass) THEN
        CREATE POLICY expenses_delete_policy ON expenses FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Tasks policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tasks_select_policy' AND polrelid = 'tasks'::regclass) THEN
        CREATE POLICY tasks_select_policy ON tasks FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tasks_insert_policy' AND polrelid = 'tasks'::regclass) THEN
        CREATE POLICY tasks_insert_policy ON tasks FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tasks_update_policy' AND polrelid = 'tasks'::regclass) THEN
        CREATE POLICY tasks_update_policy ON tasks FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tasks_delete_policy' AND polrelid = 'tasks'::regclass) THEN
        CREATE POLICY tasks_delete_policy ON tasks FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Task Notes policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_notes_select_policy' AND polrelid = 'task_notes'::regclass) THEN
        CREATE POLICY task_notes_select_policy ON task_notes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_notes_insert_policy' AND polrelid = 'task_notes'::regclass) THEN
        CREATE POLICY task_notes_insert_policy ON task_notes FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_notes_update_policy' AND polrelid = 'task_notes'::regclass) THEN
        CREATE POLICY task_notes_update_policy ON task_notes FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_notes_delete_policy' AND polrelid = 'task_notes'::regclass) THEN
        CREATE POLICY task_notes_delete_policy ON task_notes FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Task Reminders policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_reminders_select_policy' AND polrelid = 'task_reminders'::regclass) THEN
        CREATE POLICY task_reminders_select_policy ON task_reminders FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_reminders_insert_policy' AND polrelid = 'task_reminders'::regclass) THEN
        CREATE POLICY task_reminders_insert_policy ON task_reminders FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_reminders_update_policy' AND polrelid = 'task_reminders'::regclass) THEN
        CREATE POLICY task_reminders_update_policy ON task_reminders FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_reminders_delete_policy' AND polrelid = 'task_reminders'::regclass) THEN
        CREATE POLICY task_reminders_delete_policy ON task_reminders FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Task Links policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_links_select_policy' AND polrelid = 'task_links'::regclass) THEN
        CREATE POLICY task_links_select_policy ON task_links FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_links_insert_policy' AND polrelid = 'task_links'::regclass) THEN
        CREATE POLICY task_links_insert_policy ON task_links FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_links_delete_policy' AND polrelid = 'task_links'::regclass) THEN
        CREATE POLICY task_links_delete_policy ON task_links FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Task Activity policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_activity_select_policy' AND polrelid = 'task_activity'::regclass) THEN
        CREATE POLICY task_activity_select_policy ON task_activity FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_activity_insert_policy' AND polrelid = 'task_activity'::regclass) THEN
        CREATE POLICY task_activity_insert_policy ON task_activity FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Task Automation Rules policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_automation_rules_all_policy' AND polrelid = 'task_automation_rules'::regclass) THEN
        CREATE POLICY task_automation_rules_all_policy ON task_automation_rules FOR ALL USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Task Attachments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_attachments_select_policy' AND polrelid = 'task_attachments'::regclass) THEN
        CREATE POLICY task_attachments_select_policy ON task_attachments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_attachments_insert_policy' AND polrelid = 'task_attachments'::regclass) THEN
        CREATE POLICY task_attachments_insert_policy ON task_attachments FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'task_attachments_delete_policy' AND polrelid = 'task_attachments'::regclass) THEN
        CREATE POLICY task_attachments_delete_policy ON task_attachments FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Tickets policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tickets_select_policy' AND polrelid = 'tickets'::regclass) THEN
        CREATE POLICY tickets_select_policy ON tickets FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tickets_insert_policy' AND polrelid = 'tickets'::regclass) THEN
        CREATE POLICY tickets_insert_policy ON tickets FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tickets_update_policy' AND polrelid = 'tickets'::regclass) THEN
        CREATE POLICY tickets_update_policy ON tickets FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tickets_delete_policy' AND polrelid = 'tickets'::regclass) THEN
        CREATE POLICY tickets_delete_policy ON tickets FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Ticket Comments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ticket_comments_select_policy' AND polrelid = 'ticket_comments'::regclass) THEN
        CREATE POLICY ticket_comments_select_policy ON ticket_comments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ticket_comments_insert_policy' AND polrelid = 'ticket_comments'::regclass) THEN
        CREATE POLICY ticket_comments_insert_policy ON ticket_comments FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ticket_comments_update_policy' AND polrelid = 'ticket_comments'::regclass) THEN
        CREATE POLICY ticket_comments_update_policy ON ticket_comments FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ticket_comments_delete_policy' AND polrelid = 'ticket_comments'::regclass) THEN
        CREATE POLICY ticket_comments_delete_policy ON ticket_comments FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Ticket Attachments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ticket_attachments_select_policy' AND polrelid = 'ticket_attachments'::regclass) THEN
        CREATE POLICY ticket_attachments_select_policy ON ticket_attachments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ticket_attachments_insert_policy' AND polrelid = 'ticket_attachments'::regclass) THEN
        CREATE POLICY ticket_attachments_insert_policy ON ticket_attachments FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ticket_attachments_delete_policy' AND polrelid = 'ticket_attachments'::regclass) THEN
        CREATE POLICY ticket_attachments_delete_policy ON ticket_attachments FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Ticket Activity policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ticket_activity_select_policy' AND polrelid = 'ticket_activity'::regclass) THEN
        CREATE POLICY ticket_activity_select_policy ON ticket_activity FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ticket_activity_insert_policy' AND polrelid = 'ticket_activity'::regclass) THEN
        CREATE POLICY ticket_activity_insert_policy ON ticket_activity FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Follow-ups policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'follow_ups_select_policy' AND polrelid = 'follow_ups'::regclass) THEN
        CREATE POLICY follow_ups_select_policy ON follow_ups FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'follow_ups_insert_policy' AND polrelid = 'follow_ups'::regclass) THEN
        CREATE POLICY follow_ups_insert_policy ON follow_ups FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'follow_ups_update_policy' AND polrelid = 'follow_ups'::regclass) THEN
        CREATE POLICY follow_ups_update_policy ON follow_ups FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'follow_ups_delete_policy' AND polrelid = 'follow_ups'::regclass) THEN
        CREATE POLICY follow_ups_delete_policy ON follow_ups FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Follow-up Activity policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'follow_up_activity_select_policy' AND polrelid = 'follow_up_activity'::regclass) THEN
        CREATE POLICY follow_up_activity_select_policy ON follow_up_activity FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'follow_up_activity_insert_policy' AND polrelid = 'follow_up_activity'::regclass) THEN
        CREATE POLICY follow_up_activity_insert_policy ON follow_up_activity FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Follow-up History policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'follow_up_history_select_policy' AND polrelid = 'follow_up_history'::regclass) THEN
        CREATE POLICY follow_up_history_select_policy ON follow_up_history FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'follow_up_history_insert_policy' AND polrelid = 'follow_up_history'::regclass) THEN
        CREATE POLICY follow_up_history_insert_policy ON follow_up_history FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Expense Activity policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'expense_activity_select_policy' AND polrelid = 'expense_activity'::regclass) THEN
        CREATE POLICY expense_activity_select_policy ON expense_activity FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'expense_activity_insert_policy' AND polrelid = 'expense_activity'::regclass) THEN
        CREATE POLICY expense_activity_insert_policy ON expense_activity FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Bill of Sale policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'bill_of_sale_select_policy' AND polrelid = 'bill_of_sale'::regclass) THEN
        CREATE POLICY bill_of_sale_select_policy ON bill_of_sale FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'bill_of_sale_insert_policy' AND polrelid = 'bill_of_sale'::regclass) THEN
        CREATE POLICY bill_of_sale_insert_policy ON bill_of_sale FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'bill_of_sale_update_policy' AND polrelid = 'bill_of_sale'::regclass) THEN
        CREATE POLICY bill_of_sale_update_policy ON bill_of_sale FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'bill_of_sale_delete_policy' AND polrelid = 'bill_of_sale'::regclass) THEN
        CREATE POLICY bill_of_sale_delete_policy ON bill_of_sale FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Social Media Posts policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'social_media_posts_select_policy' AND polrelid = 'social_media_posts'::regclass) THEN
        CREATE POLICY social_media_posts_select_policy ON social_media_posts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'social_media_posts_insert_policy' AND polrelid = 'social_media_posts'::regclass) THEN
        CREATE POLICY social_media_posts_insert_policy ON social_media_posts FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'social_media_posts_update_policy' AND polrelid = 'social_media_posts'::regclass) THEN
        CREATE POLICY social_media_posts_update_policy ON social_media_posts FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'social_media_posts_delete_policy' AND polrelid = 'social_media_posts'::regclass) THEN
        CREATE POLICY social_media_posts_delete_policy ON social_media_posts FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Facebook Business Account policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'facebook_business_account_select_policy' AND polrelid = 'facebook_business_account'::regclass) THEN
        CREATE POLICY facebook_business_account_select_policy ON facebook_business_account FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'facebook_business_account_insert_policy' AND polrelid = 'facebook_business_account'::regclass) THEN
        CREATE POLICY facebook_business_account_insert_policy ON facebook_business_account FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'facebook_business_account_update_policy' AND polrelid = 'facebook_business_account'::regclass) THEN
        CREATE POLICY facebook_business_account_update_policy ON facebook_business_account FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'facebook_business_account_delete_policy' AND polrelid = 'facebook_business_account'::regclass) THEN
        CREATE POLICY facebook_business_account_delete_policy ON facebook_business_account FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Purchase from Public policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'purchase_from_public_select_policy' AND polrelid = 'purchase_from_public'::regclass) THEN
        CREATE POLICY purchase_from_public_select_policy ON purchase_from_public FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'purchase_from_public_insert_policy' AND polrelid = 'purchase_from_public'::regclass) THEN
        CREATE POLICY purchase_from_public_insert_policy ON purchase_from_public FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'purchase_from_public_update_policy' AND polrelid = 'purchase_from_public'::regclass) THEN
        CREATE POLICY purchase_from_public_update_policy ON purchase_from_public FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'purchase_from_public_delete_policy' AND polrelid = 'purchase_from_public'::regclass) THEN
        CREATE POLICY purchase_from_public_delete_policy ON purchase_from_public FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    -- Financial Transactions policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'financial_transactions_select_policy' AND polrelid = 'financial_transactions'::regclass) THEN
        CREATE POLICY financial_transactions_select_policy ON financial_transactions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'financial_transactions_insert_policy' AND polrelid = 'financial_transactions'::regclass) THEN
        CREATE POLICY financial_transactions_insert_policy ON financial_transactions FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'financial_transactions_update_policy' AND polrelid = 'financial_transactions'::regclass) THEN
        CREATE POLICY financial_transactions_update_policy ON financial_transactions FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'financial_transactions_delete_policy' AND polrelid = 'financial_transactions'::regclass) THEN
        CREATE POLICY financial_transactions_delete_policy ON financial_transactions FOR DELETE USING (true);
    END IF;
END $$;

-- ============================================================================
-- DEFAULT AUTOMATION RULES
-- ============================================================================

INSERT INTO task_automation_rules (name, description, trigger_type, trigger_config, action_type, action_config)
SELECT 'Follow up new leads', 'Create follow-up task when new lead is created', 'lead_created', '{}', 'create_task', '{"title": "Follow up with new lead", "priority": "High", "due_date_hours": 24}'
WHERE NOT EXISTS (SELECT 1 FROM task_automation_rules WHERE name = 'Follow up new leads');

INSERT INTO task_automation_rules (name, description, trigger_type, trigger_config, action_type, action_config)
SELECT 'Test drive confirmation', 'Create confirmation task when test drive is booked', 'test_drive_booked', '{}', 'create_task', '{"title": "Confirm test drive appointment", "priority": "Medium", "due_date_hours": 2}'
WHERE NOT EXISTS (SELECT 1 FROM task_automation_rules WHERE name = 'Test drive confirmation');

INSERT INTO task_automation_rules (name, description, trigger_type, trigger_config, action_type, action_config)
SELECT 'Deal pending review', 'Create task when deal status changes to pending', 'deal_pending', '{}', 'create_task', '{"title": "Review pending deal", "priority": "High", "due_date_hours": 48}'
WHERE NOT EXISTS (SELECT 1 FROM task_automation_rules WHERE name = 'Deal pending review');

INSERT INTO task_automation_rules (name, description, trigger_type, trigger_config, action_type, action_config)
SELECT 'Vehicle inspection', 'Create inspection task when vehicle enters inventory', 'vehicle_added', '{}', 'create_task', '{"title": "Complete vehicle inspection", "priority": "Medium", "due_date_hours": 72}'
WHERE NOT EXISTS (SELECT 1 FROM task_automation_rules WHERE name = 'Vehicle inspection');

-- ============================================================================
-- OCR Scanned Documents table
CREATE TABLE IF NOT EXISTS ocr_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('drivers_license', 'government_id', 'passport', 'other')),
    document_number TEXT,
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    expiry_date DATE,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    issue_date DATE,
    country TEXT DEFAULT 'Canada',
    raw_ocr_text TEXT,
    confidence_score NUMERIC(5,2),
    image_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VIN Lookup History table
CREATE TABLE IF NOT EXISTS vin_lookup_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vin TEXT NOT NULL,
    year INTEGER,
    make TEXT,
    model TEXT,
    trim TEXT,
    engine TEXT,
    body_style TEXT,
    fuel_type TEXT,
    transmission TEXT,
    drivetrain TEXT,
    exterior_color TEXT,
    interior_color TEXT,
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'NHTSA',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carfax Reports table
CREATE TABLE IF NOT EXISTS carfax_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    vin TEXT NOT NULL,
    report_url TEXT,
    report_data JSONB,
    ownership_count INTEGER,
    accident_count INTEGER,
    service_records BOOLEAN DEFAULT false,
    title_status TEXT,
    last_updated TIMESTAMPTZ,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCE CALCULATOR TABLES
-- ============================================================================

-- Finance Calculator History table
CREATE TABLE IF NOT EXISTS finance_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    sale_price NUMERIC(12,2) NOT NULL,
    down_payment NUMERIC(12,2) DEFAULT 0,
    trade_in_value NUMERIC(12,2) DEFAULT 0,
    interest_rate NUMERIC(5,2) NOT NULL,
    term_months INTEGER NOT NULL,
    payment_type TEXT DEFAULT 'monthly' CHECK (payment_type IN ('monthly', 'biweekly', 'weekly')),
    payment_amount NUMERIC(12,2) NOT NULL,
    total_interest NUMERIC(12,2) DEFAULT 0,
    total_cost NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    admin_fee NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR NEW TABLES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ocr_documents_customer_id ON ocr_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_ocr_documents_document_type ON ocr_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_vin_lookup_history_vin ON vin_lookup_history(vin);
CREATE INDEX IF NOT EXISTS idx_carfax_reports_vehicle_id ON carfax_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_carfax_reports_vin ON carfax_reports(vin);
CREATE INDEX IF NOT EXISTS idx_finance_calculations_vehicle_id ON finance_calculations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_finance_calculations_customer_id ON finance_calculations(customer_id);

-- ============================================================================
-- TRIGGERS FOR NEW TABLES
-- ============================================================================

DROP TRIGGER IF EXISTS update_ocr_documents_updated_at ON ocr_documents;
CREATE TRIGGER update_ocr_documents_updated_at BEFORE UPDATE ON ocr_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_carfax_reports_updated_at ON carfax_reports;
CREATE TRIGGER update_carfax_reports_updated_at BEFORE UPDATE ON carfax_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE ocr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vin_lookup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE carfax_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_calculations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'ocr_documents_all_policy' AND polrelid = 'ocr_documents'::regclass) THEN
        CREATE POLICY ocr_documents_all_policy ON ocr_documents FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vin_lookup_history_all_policy' AND polrelid = 'vin_lookup_history'::regclass) THEN
        CREATE POLICY vin_lookup_history_all_policy ON vin_lookup_history FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'carfax_reports_all_policy' AND polrelid = 'carfax_reports'::regclass) THEN
        CREATE POLICY carfax_reports_all_policy ON carfax_reports FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'finance_calculations_all_policy' AND polrelid = 'finance_calculations'::regclass) THEN
        CREATE POLICY finance_calculations_all_policy ON finance_calculations FOR ALL USING (true);
    END IF;
END $$;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
