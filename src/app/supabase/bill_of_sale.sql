-- Bill of Sale Tables for Adaptus DMS
-- Complete Bill of Sale workflow

-- ============================================================================
-- 1. BILL_OF_SALE - Main document table
-- ============================================================================
CREATE TABLE bill_of_sale (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES sales_deals(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Section A: Header info
    vehicle_description TEXT,
    sale_type VARCHAR(20) DEFAULT 'Cash' CHECK (sale_type IN ('Cash', 'Finance', 'BHPH')),

    -- Section B: Core Pricing
    price_vehicle DECIMAL(12,2) DEFAULT 0,
    additional_equipment DECIMAL(12,2) DEFAULT 0,
    services_warranties DECIMAL(12,2) DEFAULT 0,
    documentation_fees DECIMAL(12,2) DEFAULT 0,
    vsa_levy_recovery DECIMAL(12,2) DEFAULT 0,
    extra_fee_1_taxable DECIMAL(12,2) DEFAULT 0,
    discount DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) DEFAULT 0,

    -- Trade-in
    trade_in_allowance DECIMAL(12,2) DEFAULT 0,
    net_difference DECIMAL(12,2) DEFAULT 0,

    -- GST/PST (Canadian taxes)
    gst_rate DECIMAL(5,2) DEFAULT 5.00,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    pst_rate DECIMAL(5,2) DEFAULT 7.00,
    pst_amount DECIMAL(12,2) DEFAULT 0,
    purchase_price_with_gst_pst DECIMAL(12,2) DEFAULT 0,

    -- Section C: Additional Fees
    licence_fee DECIMAL(12,2) DEFAULT 0,
    gasoline_fee DECIMAL(12,2) DEFAULT 0,
    finance_fee DECIMAL(12,2) DEFAULT 0,
    lien_payout DECIMAL(12,2) DEFAULT 0,
    extra_fee_2_non_taxable DECIMAL(12,2) DEFAULT 0,
    sub_total DECIMAL(12,2) DEFAULT 0,
    deposit DECIMAL(12,2) DEFAULT 0,
    down_payments DECIMAL(12,2) DEFAULT 0,
    insurance_life DECIMAL(12,2) DEFAULT 0,
    insurance_gap DECIMAL(12,2) DEFAULT 0,
    rst_on_insurance DECIMAL(12,2) DEFAULT 0,
    total_purchase_price DECIMAL(12,2) DEFAULT 0,
    ppsa_fee DECIMAL(12,2) DEFAULT 0,
    admin_fee DECIMAL(12,2) DEFAULT 0,
    amount_to_finance DECIMAL(12,2) DEFAULT 0,
    total_balance_due DECIMAL(12,2) DEFAULT 0,

    -- Section D: Financing Details
    payment_type VARCHAR(50),
    cost_of_borrowing DECIMAL(12,2) DEFAULT 0,
    payment_start_date DATE,

    -- Section E: Trade-in Vehicle Details (denormalized for quick access)
    trade_in_year INTEGER,
    trade_in_make VARCHAR(100),
    trade_in_model VARCHAR(100),
    trade_in_series VARCHAR(100),
    trade_in_cylinders INTEGER,
    trade_in_odometer INTEGER,
    trade_in_kms_miles VARCHAR(10) DEFAULT 'KMS',
    trade_in_exterior_color VARCHAR(50),
    trade_in_interior_color VARCHAR(50),
    trade_in_vin VARCHAR(17),
    trade_in_stock_number VARCHAR(50),
    trade_in_owing_to VARCHAR(255),
    trade_in_odometer_delivery INTEGER,
    trade_in_disclosure TEXT,

    -- Section F: Notes/Disclosure
    notes TEXT,

    -- Section G: Payment Status
    payment_status VARCHAR(20) DEFAULT 'Not Paid' CHECK (payment_status IN ('Paid', 'Not Paid')),

    -- Document Status
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Calculated', 'Sold')),
    is_new_version BOOLEAN DEFAULT false,
    gst_enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bill_of_sale_deal_id ON bill_of_sale(deal_id);
CREATE INDEX idx_bill_of_sale_vehicle_id ON bill_of_sale(vehicle_id);
CREATE INDEX idx_bill_of_sale_customer_id ON bill_of_sale(customer_id);
CREATE INDEX idx_bill_of_sale_status ON bill_of_sale(status);

-- ============================================================================
-- 2. BILL_OF_SALE_PAYMENTS - Individual payments table
-- ============================================================================
CREATE TABLE bill_of_sale_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_of_sale_id UUID REFERENCES bill_of_sale(id) ON DELETE CASCADE,
    payment_name VARCHAR(255) NOT NULL,
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('Deposit', 'Down Payment', 'Finance Payment', 'Final Payment', 'Other')),
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bill_of_sale_payments_bill_id ON bill_of_sale_payments(bill_of_sale_id);

-- ============================================================================
-- 3. TRIGGER: Update updated_at for bill_of_sale
-- ============================================================================
CREATE TRIGGER update_bill_of_sale_updated_at
    BEFORE UPDATE ON bill_of_sale
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Enable RLS
-- ============================================================================
ALTER TABLE bill_of_sale ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_of_sale_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can read bill_of_sale" ON bill_of_sale
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert bill_of_sale" ON bill_of_sale
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update bill_of_sale" ON bill_of_sale
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete bill_of_sale" ON bill_of_sale
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read bill_of_sale_payments" ON bill_of_sale_payments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert bill_of_sale_payments" ON bill_of_sale_payments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update bill_of_sale_payments" ON bill_of_sale_payments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete bill_of_sale_payments" ON bill_of_sale_payments
    FOR DELETE USING (auth.role() = 'authenticated');
