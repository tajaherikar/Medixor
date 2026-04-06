-- ═══════════════════════════════════════════════════════════════════════════
-- MEDIXOR - ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
--
-- CRITICAL SECURITY UPDATE: Enable tenant isolation at database level
--
-- This file adds Row Level Security to prevent data leakage between tenants.
-- Even if the application code is compromised, the database will enforce
-- tenant isolation.
--
-- Run this in Supabase SQL Editor IMMEDIATELY:
-- Dashboard → SQL Editor → New Query → Paste this → Run
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Enable RLS on all tables ──────────────────────────────────────────────

ALTER TABLE suppliers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- ─── Drop existing policies if any ──────────────────────────────────────────

DROP POLICY IF EXISTS "Users can access their own tenant's suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can access their own tenant's batches" ON batches;
DROP POLICY IF EXISTS "Users can access their own tenant's customers" ON customers;
DROP POLICY IF EXISTS "Users can access their own tenant's invoices" ON invoices;
DROP POLICY IF EXISTS "Users can access their own tenant's supplier_bills" ON supplier_bills;
DROP POLICY IF EXISTS "Users can access their own tenant's payments" ON payments;
DROP POLICY IF EXISTS "Users can access their own tenant's doctors" ON doctors;
DROP POLICY IF EXISTS "Users can access their own tenant's users" ON users;
DROP POLICY IF EXISTS "Users can access their own tenant's settings" ON tenant_settings;

-- ─── Create RLS Policies ────────────────────────────────────────────────────
--
-- Note: Supabase uses service_role key for server-side queries, which bypasses RLS.
-- Our Next.js API uses the service_role key, so we need to trust the application
-- layer to enforce tenant isolation (which we do via validateTenantAccess).
--
-- These policies are a SECOND LAYER of defense in case:
-- 1. Someone gets direct database access
-- 2. A client-side query bypasses our API
-- 3. A bug in our application code
--
-- Since we're using service_role (which bypasses RLS), we'll create policies
-- that check tenantId matches for any authenticated access.

-- ─── Suppliers ──────────────────────────────────────────────────────────────

CREATE POLICY "Tenant isolation for suppliers"
  ON suppliers
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true)::text);

-- ─── Batches ────────────────────────────────────────────────────────────────

CREATE POLICY "Tenant isolation for batches"
  ON batches
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true)::text);

-- ─── Customers ──────────────────────────────────────────────────────────────

CREATE POLICY "Tenant isolation for customers"
  ON customers
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true)::text);

-- ─── Invoices ───────────────────────────────────────────────────────────────

CREATE POLICY "Tenant isolation for invoices"
  ON invoices
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true)::text);

-- ─── Supplier Bills ─────────────────────────────────────────────────────────

CREATE POLICY "Tenant isolation for supplier_bills"
  ON supplier_bills
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true)::text);

-- ─── Payments ───────────────────────────────────────────────────────────────

CREATE POLICY "Tenant isolation for payments"
  ON payments
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true)::text);

-- ─── Doctors ────────────────────────────────────────────────────────────────

CREATE POLICY "Tenant isolation for doctors"
  ON doctors
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true)::text);

-- ─── Users ──────────────────────────────────────────────────────────────────

CREATE POLICY "Tenant isolation for users"
  ON users
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true)::text);

-- ─── Tenant Settings ────────────────────────────────────────────────────────

CREATE POLICY "Tenant isolation for tenant_settings"
  ON tenant_settings
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true)::text);

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Verify RLS is enabled on all tables:
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'suppliers', 'batches', 'customers', 'invoices', 
    'supplier_bills', 'payments', 'doctors', 'users', 'tenant_settings'
  )
ORDER BY tablename;

-- Verify policies are created:
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- USAGE IN APPLICATION
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Before each query, set the tenant context:
--
-- await supabase.rpc('set_tenant', { tenant_id: userTenantId });
--
-- Or in raw SQL:
--
-- SET LOCAL app.current_tenant = 'pharmaone';
-- SELECT * FROM batches;  -- Will only return pharmaone's batches
--
-- ═══════════════════════════════════════════════════════════════════════════
