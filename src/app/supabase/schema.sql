-- Adaptus DMS - Supabase PostgreSQL Schema
-- Created for production-grade Dealer Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS & STAFF TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    avatar TEXT,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Staff', 'Manager')),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash TEXT NOT NULL, -- store hashed password securely
    start_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- 2. VEHICLES (INVENTORY) TABLE
-- ============================================================================
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vin VARCHAR(17) UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    trim VARCHAR(100),
    odometer INTEGER NOT NULL DEFAULT 0,
    stock_number VARCHAR(50) UNIQUE,
    condition VARCHAR(50) NOT NULL CHECK (condition IN ('New', 'Used', 'Certified Pre-Owned')),
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Sold', 'Coming Soon')),
    purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    retail_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    extra_costs DECIMAL(12, 2) NOT NULL DEFAULT 0,
    taxes DECIMAL(12, 2) NOT NULL DEFAULT 0,
    image_gallery TEXT[], -- Array of image URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Computed columns (calculated in application layer)
    -- grand_total_value = purchase_price + extra_costs + taxes
    -- estimated_income = retail_price - purchase_price - extra_costs - taxes
    CONSTRAINT valid_pricing CHECK (retail_price >= 0 AND purchase_price >= 0 AND extra_costs >= 0 AND taxes >= 0)
);

-- Indexes for common queries
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_year_make_model ON vehicles(year, make, model);
CREATE INDEX idx_vehicles_stock_number ON vehicles(stock_number);

-- ============================================================================
-- 3. CUSTOMERS TABLE (For CRM, Test Drives, and Sales)
-- ============================================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(50),
    postal_code VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Duplicate detection flags (computed in application)
    -- These are for application-level logic, not DB constraints
    CONSTRAINT valid_contact CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Indexes for duplicate detection
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);

-- ============================================================================
-- 4. PURCHASE_FROM_PUBLIC TABLE
-- ============================================================================
CREATE TABLE purchase_from_public (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vin VARCHAR(17) NOT NULL,
    year INTEGER NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    owner_name VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(50),
    owner_email VARCHAR(255),
    owner_address TEXT,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    purchase_agreement_url TEXT, -- URL to generated PDF
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_purchase_from_public_vin ON purchase_from_public(vin);
CREATE INDEX idx_purchase_from_public_accepted_by ON purchase_from_public(accepted_by);
CREATE INDEX idx_purchase_from_public_status ON purchase_from_public(status);

-- ============================================================================
-- 5. LEADS (CRM) TABLE
-- ============================================================================
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL CHECK (source IN ('Website', 'Referral', 'Event', 'Walk-in', 'Facebook', 'Craigslist', 'Kijiji', 'Phone')),
    status VARCHAR(50) NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Qualified', 'Closed', 'Lost')),
    interest_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    lead_creation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_engagement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leads_customer_id ON leads(customer_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_interest_vehicle_id ON leads(interest_vehicle_id);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_last_engagement ON leads(last_engagement);

-- ============================================================================
-- 6. TEST_DRIVES TABLE
-- ============================================================================
CREATE TABLE test_drives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ✅ Now can link to either customer OR lead
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,

    driver_license_number VARCHAR(100) NOT NULL,
    driver_license_expiry DATE NOT NULL,
    driver_license_image_url TEXT,
    signature_image_url TEXT,

    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,

    salesperson_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Validation
    CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time >= start_time),

    -- ✅ Must be linked to either lead OR customer (not both)
    CONSTRAINT test_drives_lead_or_customer CHECK (
      (lead_id IS NOT NULL AND customer_id IS NULL)
      OR
      (lead_id IS NULL AND customer_id IS NOT NULL)
    )
);


CREATE INDEX idx_test_drives_customer_id ON test_drives(customer_id);
CREATE INDEX idx_test_drives_lead_id ON test_drives(lead_id);
CREATE INDEX idx_test_drives_vehicle_id ON test_drives(vehicle_id);
CREATE INDEX idx_test_drives_salesperson_id ON test_drives(salesperson_id);
CREATE INDEX idx_test_drives_driver_license_expiry ON test_drives(driver_license_expiry);

-- ============================================================================
-- 7. SALES_DEALS TABLE
-- ============================================================================
CREATE TABLE sales_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    deal_status VARCHAR(50) NOT NULL DEFAULT 'Negotiation' CHECK (deal_status IN ('Negotiation', 'Down Payment', 'Finance', 'Paid Off', 'Cancelled')),
    finance_term INTEGER, -- in months
    interest_rate DECIMAL(5, 2), -- percentage (e.g., 5.99)
    down_payment DECIMAL(12, 2) DEFAULT 0,
    sale_price DECIMAL(12, 2) NOT NULL,
    salesperson_id UUID REFERENCES users(id) ON DELETE SET NULL,
    finance_company VARCHAR(255),
    notes TEXT,
    deal_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_finance_term CHECK (finance_term IS NULL OR finance_term > 0),
    CONSTRAINT valid_interest_rate CHECK (interest_rate IS NULL OR (interest_rate >= 0 AND interest_rate <= 100)),
    CONSTRAINT valid_sale_price CHECK (sale_price >= 0)
);

CREATE INDEX idx_sales_deals_vehicle_id ON sales_deals(vehicle_id);
CREATE INDEX idx_sales_deals_customer_id ON sales_deals(customer_id);
CREATE INDEX idx_sales_deals_deal_status ON sales_deals(deal_status);
CREATE INDEX idx_sales_deals_salesperson_id ON sales_deals(salesperson_id);
CREATE INDEX idx_sales_deals_deal_date ON sales_deals(deal_date);

-- ============================================================================
-- 8. INVOICES TABLE
-- ============================================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    package_name VARCHAR(255), -- e.g., "Libra"
    payment_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0, -- percentage (e.g., 13.00 for 13%)
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Auto-calculated: payment_amount * tax_rate / 100
    total DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Auto-calculated: payment_amount + tax_amount
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_due_date CHECK (due_date >= invoice_date),
    CONSTRAINT valid_invoice_amounts CHECK (payment_amount >= 0 AND tax_amount >= 0 AND total >= 0)
);

CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- ============================================================================
-- 9. FINANCIAL_TRANSACTIONS TABLE (For Ledger/Reporting)
-- ============================================================================
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Income', 'Expense')),
    category VARCHAR(100) NOT NULL, -- Income: 'Sold', 'Warranty', 'Insurance' | Expense: 'Purchase', 'Service', 'Operating'
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    sale_deal_id UUID REFERENCES sales_deals(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_transaction_amount CHECK (amount > 0)
);

CREATE INDEX idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_vehicle_id ON financial_transactions(vehicle_id);

-- ============================================================================
-- 10. SOCIAL_MEDIA_POSTS TABLE (For Social Posting Module)
-- ============================================================================
CREATE TABLE social_media_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
    platform VARCHAR(50) NOT NULL DEFAULT 'Facebook' CHECK (platform IN ('Facebook', 'Instagram', 'Twitter')),
    post_text TEXT,
    image_urls TEXT[],
    facebook_post_id VARCHAR(255), -- Facebook Graph API post ID
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Published', 'Failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_social_media_posts_vehicle_id ON social_media_posts(vehicle_id);
CREATE INDEX idx_social_media_posts_status ON social_media_posts(status);
CREATE INDEX idx_social_media_posts_platform ON social_media_posts(platform);

-- ============================================================================
-- 11. FACEBOOK_BUSINESS_ACCOUNT TABLE (For Social Media Integration)
-- ============================================================================
CREATE TABLE facebook_business_account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id VARCHAR(255) UNIQUE NOT NULL,
    page_name VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL, -- Encrypted in production
    is_connected BOOLEAN NOT NULL DEFAULT false,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only one active connection should exist
CREATE UNIQUE INDEX idx_facebook_business_account_active ON facebook_business_account(page_id) WHERE is_connected = true;

-- ============================================================================
-- TRIGGERS: Update updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_from_public_updated_at BEFORE UPDATE ON purchase_from_public FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_drives_updated_at BEFORE UPDATE ON test_drives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_deals_updated_at BEFORE UPDATE ON sales_deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON financial_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_media_posts_updated_at BEFORE UPDATE ON social_media_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_facebook_business_account_updated_at BEFORE UPDATE ON facebook_business_account FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS: For common queries and reporting
-- ============================================================================

-- Vehicle Inventory Summary View
CREATE OR REPLACE VIEW vehicle_inventory_summary AS
SELECT 
    status,
    COUNT(*) as count,
    SUM(purchase_price + extra_costs + taxes) as total_purchase_value,
    SUM(retail_price) as total_retail_value,
    SUM(retail_price - purchase_price - extra_costs - taxes) as total_estimated_income
FROM vehicles
GROUP BY status;

-- Sales Performance View
CREATE OR REPLACE VIEW sales_performance AS
SELECT 
    v.id as vehicle_id,
    v.year,
    v.make,
    v.model,
    COUNT(sd.id) as deal_count,
    SUM(sd.sale_price) as total_revenue,
    AVG(sd.sale_price) as avg_sale_price
FROM vehicles v
LEFT JOIN sales_deals sd ON v.id = sd.vehicle_id AND sd.deal_status = 'Paid Off'
GROUP BY v.id, v.year, v.make, v.model;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================================================
-- Enable RLS on all tables (basic setup - customize based on requirements)

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_from_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_business_account ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust based on your authentication setup)
-- For now, we'll create policies that allow authenticated users
-- You'll need to customize these based on Supabase Auth integration

-- Basic policy: Authenticated users can read all data
CREATE POLICY "Authenticated users can read all" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON vehicles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON purchase_from_public FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON test_drives FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON sales_deals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON financial_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON social_media_posts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON facebook_business_account FOR SELECT USING (auth.role() = 'authenticated');

-- Note: Insert, Update, Delete policies should be added based on role-based access control
-- For production, implement proper RBAC policies matching your user roles (Admin, Staff, Manager)

-- ============================================================================
-- COMMENTS: Documentation
-- ============================================================================
COMMENT ON TABLE vehicles IS 'Main inventory table for vehicles. Status can be: Active, Inactive, Sold, Coming Soon';
COMMENT ON TABLE purchase_from_public IS 'Records for vehicles purchased from private sellers (not wholesale)';
COMMENT ON TABLE leads IS 'CRM leads with tracking for source, status, and engagement';
COMMENT ON TABLE test_drives IS 'Test drive records with license validation requirements';
COMMENT ON TABLE sales_deals IS 'Sales transactions with finance terms and deal status tracking';
COMMENT ON TABLE invoices IS 'Invoice management with auto-calculated tax and totals';
COMMENT ON TABLE financial_transactions IS 'General ledger for all income and expense transactions';
COMMENT ON TABLE social_media_posts IS 'Social media posting tracking and Facebook API integration';
