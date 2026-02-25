-- ============================================================
-- Migration: 20260225000011_permission_based_rls
-- Creates a has_permission() function that checks the granular
-- permissions system (roles → role_permissions → permissions)
-- and updates finance RLS policies to use it.
-- This allows custom roles (e.g. RH with finance.manage added)
-- to pass RLS checks without needing the old enum 'financeiro'.
-- ============================================================

-- ─── has_permission() function ───────────────────────────────

-- Drop existing version (parameter name conflict)
DROP FUNCTION IF EXISTS has_permission(TEXT);

CREATE OR REPLACE FUNCTION has_permission(required_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_has_admin_role BOOLEAN;
  v_has_perm BOOLEAN;
BEGIN
  -- Get the user's tenant_id from profiles
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has the legacy 'admin' role (gets everything)
  SELECT EXISTS(
    SELECT 1 FROM user_roles
    WHERE profile_id = auth.uid()
      AND tenant_id = v_tenant_id
      AND role = 'admin'
  ) INTO v_has_admin_role;

  IF v_has_admin_role THEN
    RETURN TRUE;
  END IF;

  -- Check if user has the specific permission via custom roles
  SELECT EXISTS(
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.custom_role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.profile_id = auth.uid()
      AND ur.tenant_id = v_tenant_id
      AND p.key = required_key
  ) INTO v_has_perm;

  RETURN v_has_perm;
END;
$$;

GRANT EXECUTE ON FUNCTION has_permission(TEXT) TO authenticated;


-- ─── Update accounts_payable policies ────────────────────────

DROP POLICY IF EXISTS "ap_read_financeiro" ON accounts_payable;
DROP POLICY IF EXISTS "ap_insert_financeiro" ON accounts_payable;
DROP POLICY IF EXISTS "ap_update_gestor" ON accounts_payable;
DROP POLICY IF EXISTS "ap_delete_gestor" ON accounts_payable;

-- SELECT: anyone with finance.view permission
CREATE POLICY "ap_read" ON accounts_payable
  FOR SELECT USING (
    tenant_id = get_tenant_id()
    AND has_permission('finance.view')
  );

-- INSERT: anyone with finance.manage permission
CREATE POLICY "ap_insert" ON accounts_payable
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id()
    AND has_permission('finance.manage')
  );

-- UPDATE: finance.manage or own record
CREATE POLICY "ap_update" ON accounts_payable
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND (has_permission('finance.manage') OR created_by = auth.uid())
  );

-- DELETE: admin.manage only
CREATE POLICY "ap_delete" ON accounts_payable
  FOR DELETE USING (
    tenant_id = get_tenant_id()
    AND has_permission('admin.manage')
  );


-- ─── Update accounts_receivable policies ─────────────────────

DROP POLICY IF EXISTS "ar_read_financeiro" ON accounts_receivable;
DROP POLICY IF EXISTS "ar_insert_financeiro" ON accounts_receivable;
DROP POLICY IF EXISTS "ar_update_gestor" ON accounts_receivable;
DROP POLICY IF EXISTS "ar_delete_gestor" ON accounts_receivable;

-- SELECT: anyone with finance.view permission
CREATE POLICY "ar_read" ON accounts_receivable
  FOR SELECT USING (
    tenant_id = get_tenant_id()
    AND has_permission('finance.view')
  );

-- INSERT: anyone with finance.manage permission
CREATE POLICY "ar_insert" ON accounts_receivable
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id()
    AND has_permission('finance.manage')
  );

-- UPDATE: finance.manage or own record
CREATE POLICY "ar_update" ON accounts_receivable
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND (has_permission('finance.manage') OR created_by = auth.uid())
  );

-- DELETE: admin.manage only
CREATE POLICY "ar_delete" ON accounts_receivable
  FOR DELETE USING (
    tenant_id = get_tenant_id()
    AND has_permission('admin.manage')
  );


-- ─── Update financial_transactions policies ──────────────────

DROP POLICY IF EXISTS "tx_read_financeiro" ON financial_transactions;
DROP POLICY IF EXISTS "tx_insert_financeiro" ON financial_transactions;
DROP POLICY IF EXISTS "tx_delete_admin" ON financial_transactions;

-- SELECT: anyone with finance.view permission
CREATE POLICY "tx_read" ON financial_transactions
  FOR SELECT USING (
    tenant_id = get_tenant_id()
    AND has_permission('finance.view')
  );

-- INSERT: anyone with finance.manage permission
CREATE POLICY "tx_insert" ON financial_transactions
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id()
    AND has_permission('finance.manage')
  );

-- DELETE: admin.manage only
CREATE POLICY "tx_delete" ON financial_transactions
  FOR DELETE USING (
    tenant_id = get_tenant_id()
    AND has_permission('admin.manage')
  );
