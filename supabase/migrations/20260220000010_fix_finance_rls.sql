-- ============================================================
-- Migration: 20260220000010_fix_finance_rls
-- Fix RLS policies on accounts_payable, accounts_receivable,
-- and financial_transactions to use the established
-- get_tenant_id() / has_role() helpers instead of raw JWT claims.
-- ============================================================

-- ─── accounts_payable ───────────────────────────────────────

-- Drop the old inline policy created in migration 006
DROP POLICY IF EXISTS "AP isolation" ON accounts_payable;

-- SELECT: financeiro role and above
CREATE POLICY "ap_read_financeiro" ON accounts_payable
  FOR SELECT USING (tenant_id = get_tenant_id() AND has_role('financeiro'));

-- INSERT: financeiro role and above
CREATE POLICY "ap_insert_financeiro" ON accounts_payable
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('financeiro'));

-- UPDATE: gestor role and above, or own record
CREATE POLICY "ap_update_gestor" ON accounts_payable
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND (has_role('gestor') OR created_by = auth.uid())
  );

-- DELETE: gestor role and above
CREATE POLICY "ap_delete_gestor" ON accounts_payable
  FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('gestor'));


-- ─── accounts_receivable ────────────────────────────────────

-- Drop the old inline policy created in migration 006
DROP POLICY IF EXISTS "AR isolation" ON accounts_receivable;

-- SELECT: financeiro role and above
CREATE POLICY "ar_read_financeiro" ON accounts_receivable
  FOR SELECT USING (tenant_id = get_tenant_id() AND has_role('financeiro'));

-- INSERT: financeiro role and above
CREATE POLICY "ar_insert_financeiro" ON accounts_receivable
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('financeiro'));

-- UPDATE: gestor role and above, or own record
CREATE POLICY "ar_update_gestor" ON accounts_receivable
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND (has_role('gestor') OR created_by = auth.uid())
  );

-- DELETE: gestor role and above
CREATE POLICY "ar_delete_gestor" ON accounts_receivable
  FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('gestor'));


-- ─── financial_transactions ─────────────────────────────────

-- Drop the old inline policy created in migration 006
DROP POLICY IF EXISTS "Tx isolation" ON financial_transactions;

-- SELECT: financeiro role and above
CREATE POLICY "tx_read_financeiro" ON financial_transactions
  FOR SELECT USING (tenant_id = get_tenant_id() AND has_role('financeiro'));

-- INSERT: financeiro role and above
CREATE POLICY "tx_insert_financeiro" ON financial_transactions
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('financeiro'));

-- DELETE: admin only (transactions are quasi-immutable for audit)
CREATE POLICY "tx_delete_admin" ON financial_transactions
  FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('admin'));
