-- Adaptus DMS - Row Level Security (RLS) Policies
-- This file contains SQL commands to enable RLS and create security policies
-- Run this after setting up your Supabase project

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
-- POLICY 1: AUTHENTICATED USERS CAN VIEW/INSERT/UPDATE ALL
-- ============================================================================
-- This policy allows authenticated users (staff, managers, admins) to have
-- full access to all data for internal operations.

-- Users Table
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (true);

-- Vehicles Table
CREATE POLICY "Authenticated users can view all vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (true);

-- Leads Table
CREATE POLICY "Authenticated users can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (true);

-- Invoices Table
CREATE POLICY "Authenticated users can view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (true);

-- Customers Table
CREATE POLICY "Authenticated users can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- Test Drives Table
CREATE POLICY "Authenticated users can view all test drives"
  ON test_drives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert test drives"
  ON test_drives FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update test drives"
  ON test_drives FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sales Deals Table
CREATE POLICY "Authenticated users can view all sales deals"
  ON sales_deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales deals"
  ON sales_deals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales deals"
  ON sales_deals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Financial Transactions Table
CREATE POLICY "Authenticated users can view all financial transactions"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert financial transactions"
  ON financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update financial transactions"
  ON financial_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- POLICY 2: ANON USERS CAN VIEW ONLY 'ACTIVE' VEHICLES
-- ============================================================================
-- This policy allows anonymous users (public website visitors) to view
-- only active vehicles for the public purchase module.

CREATE POLICY "Anon users can view active vehicles only"
  ON vehicles FOR SELECT
  TO anon
  USING (status = 'Active');

-- Anon users cannot insert, update, or delete vehicles
-- (No policies needed - default deny)

-- ============================================================================
-- POLICY 3: ROLE-BASED ACCESS CONTROL (OPTIONAL)
-- ============================================================================
-- Uncomment and customize these policies if you want more granular control
-- based on user roles stored in the users table.

-- Example: Only Admins can delete vehicles
-- CREATE POLICY "Only admins can delete vehicles"
--   ON vehicles FOR DELETE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.id = auth.uid()
--       AND users.role = 'Admin'
--     )
--   );

-- Example: Managers and Admins can update invoices
-- CREATE POLICY "Managers and admins can update invoices"
--   ON invoices FOR UPDATE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.id = auth.uid()
--       AND users.role IN ('Manager', 'Admin')
--     )
--   );

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. These policies assume you're using Supabase Auth with authenticated users
-- 2. Adjust the policies based on your specific security requirements
-- 3. Test all policies thoroughly before deploying to production
-- 4. Consider adding audit logging for sensitive operations
-- 5. Review and update policies regularly as your application evolves
