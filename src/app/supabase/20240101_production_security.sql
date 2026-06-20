-- Adaptus DMS - Production Security Migration
-- Date: 2024-01-01
-- Purpose: Lock down database with Row Level Security (RLS) policies
-- Run this migration in Supabase SQL Editor after initial schema setup

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

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

-- ============================================================================
-- VEHICLES TABLE POLICIES
-- ============================================================================

-- Public (anon) users can VIEW only 'Active' vehicles
CREATE POLICY "Public can view active vehicles"
  ON vehicles FOR SELECT
  TO anon
  USING (status = 'Active');

-- Authenticated users (staff) can VIEW all vehicles
CREATE POLICY "Staff can view all vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can INSERT vehicles
CREATE POLICY "Staff can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can UPDATE vehicles
CREATE POLICY "Staff can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can DELETE vehicles
CREATE POLICY "Staff can delete vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- LEADS TABLE POLICIES
-- ============================================================================

-- Only authenticated users can VIEW leads
CREATE POLICY "Staff can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can INSERT leads
CREATE POLICY "Staff can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can UPDATE leads
CREATE POLICY "Staff can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can DELETE leads
CREATE POLICY "Staff can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- INVOICES TABLE POLICIES
-- ============================================================================

-- Only authenticated users can VIEW invoices
CREATE POLICY "Staff can view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can INSERT invoices
CREATE POLICY "Staff can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can UPDATE invoices
CREATE POLICY "Staff can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can DELETE invoices
CREATE POLICY "Staff can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- USERS TABLE POLICIES (Role-Based Access)
-- ============================================================================

-- All authenticated users can VIEW users
CREATE POLICY "Staff can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can INSERT users
CREATE POLICY "Only admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  );

-- Admins can UPDATE any user
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  )
  WITH CHECK (true);

-- Only admins can DELETE users
CREATE POLICY "Only admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  );

-- Users can UPDATE their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- CUSTOMERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TEST DRIVES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can view all test drives"
  ON test_drives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert test drives"
  ON test_drives FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update test drives"
  ON test_drives FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SALES DEALS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can view all sales deals"
  ON sales_deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert sales deals"
  ON sales_deals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update sales deals"
  ON sales_deals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FINANCIAL TRANSACTIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can view all financial transactions"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert financial transactions"
  ON financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update financial transactions"
  ON financial_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. These policies assume Supabase Auth is properly configured
-- 2. Test all policies with different user roles before production
-- 3. Consider adding audit logging for sensitive operations
-- 4. Review and adjust policies based on your specific business requirements
-- 5. The auth.uid() function returns the current authenticated user's ID
