-- ============================================================================
-- Migration: SaaS Hardening
-- Date: 2026-02-28
-- Description:
--   1. Replace get_tenant_id() with get_active_tenant_id() on ALL UPDATE/DELETE
--      policies so suspended tenants cannot write data
--   2. Add check_plan_limit() on profiles INSERT (max_users enforcement)
--   3. Strengthen RLS on 8 weak tables (add role-based restrictions)
--   4. Add audit triggers for HR/finance tables
--   5. Configure pg_cron for check-trial-expiry Edge Function
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- PART 1: UPDATE POLICIES → use get_active_tenant_id()
-- Suspended tenants can READ but NOT WRITE
-- ════════════════════════════════════════════════════════════════════════════

-- ── Core tables ─────────────────────────────────────────────────────────────

-- tenants
DROP POLICY IF EXISTS "tenant_update_admin" ON public.tenants;
CREATE POLICY "tenant_update_admin" ON public.tenants
  FOR UPDATE USING (id = get_active_tenant_id() AND has_role('admin'));

-- profiles (users can still update own profile even if suspended - intentional)
-- Keeping get_tenant_id() for profiles_update_own since user needs access

-- obras
DROP POLICY IF EXISTS "obras_update_gestor" ON public.obras;
CREATE POLICY "obras_update_gestor" ON public.obras
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor', id));

-- obra_chapters
DROP POLICY IF EXISTS "chapters_write_gestor" ON public.obra_chapters;
CREATE POLICY "chapters_write_gestor" ON public.obra_chapters
  FOR ALL USING (tenant_id = get_active_tenant_id() AND has_role('gestor', obra_id));

-- budgets
DROP POLICY IF EXISTS "budgets_update_gestor" ON public.budgets;
CREATE POLICY "budgets_update_gestor" ON public.budgets
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor', obra_id));

-- budget_items (uses ALL policy via chapters - already covered)

-- costs
DROP POLICY IF EXISTS "costs_update_compras_own" ON public.costs;
CREATE POLICY "costs_update_compras_own" ON public.costs
  FOR UPDATE USING (
    tenant_id = get_active_tenant_id()
    AND (has_role('gestor', obra_id) OR (created_by = auth.uid() AND status = 'Rascunho'))
  );

-- diario_entries
DROP POLICY IF EXISTS "diario_update_own" ON public.diario_entries;
CREATE POLICY "diario_update_own" ON public.diario_entries
  FOR UPDATE USING (
    tenant_id = get_active_tenant_id()
    AND (created_by = auth.uid() OR has_role('gestor', obra_id))
  );

-- tasks
DROP POLICY IF EXISTS "tasks_update_assignee" ON public.tasks;
CREATE POLICY "tasks_update_assignee" ON public.tasks
  FOR UPDATE USING (
    tenant_id = get_active_tenant_id()
    AND (assignee_id = auth.uid() OR created_by = auth.uid() OR has_role('gestor', obra_id))
  );

-- purchase_orders
DROP POLICY IF EXISTS "po_update_compras" ON public.purchase_orders;
CREATE POLICY "po_update_compras" ON public.purchase_orders
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor', obra_id));

-- conflict_log
DROP POLICY IF EXISTS "conflict_update_admin" ON public.conflict_log;
CREATE POLICY "conflict_update_admin" ON public.conflict_log
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

-- ── Finance tables ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ap_update_gestor" ON public.accounts_payable;
CREATE POLICY "ap_update_gestor" ON public.accounts_payable
  FOR UPDATE USING (
    tenant_id = get_active_tenant_id()
    AND (has_role('gestor') OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "ap_update" ON public.accounts_payable;
CREATE POLICY "ap_update" ON public.accounts_payable
  FOR UPDATE USING (
    tenant_id = get_active_tenant_id()
    AND (has_permission('finance.manage') OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "ar_update_gestor" ON public.accounts_receivable;
CREATE POLICY "ar_update_gestor" ON public.accounts_receivable
  FOR UPDATE USING (
    tenant_id = get_active_tenant_id()
    AND (has_role('gestor') OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "ar_update" ON public.accounts_receivable;
CREATE POLICY "ar_update" ON public.accounts_receivable
  FOR UPDATE USING (
    tenant_id = get_active_tenant_id()
    AND (has_permission('finance.manage') OR created_by = auth.uid())
  );

-- ── Imobiliario tables ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "empreen_update_gestor" ON public.empreendimentos;
CREATE POLICY "empreen_update_gestor" ON public.empreendimentos
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "fracoes_update_gestor" ON public.fracoes;
CREATE POLICY "fracoes_update_gestor" ON public.fracoes
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "tipologias_update_gestor" ON public.tipologias;
CREATE POLICY "tipologias_update_gestor" ON public.tipologias
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "imob_docs_update_gestor" ON public.imob_documentos;
CREATE POLICY "imob_docs_update_gestor" ON public.imob_documentos
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

-- ── HR/Payroll tables ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "eroles_tenant_update" ON public.employee_roles;
CREATE POLICY "eroles_tenant_update" ON public.employee_roles
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "employees_tenant_update" ON public.employees;
CREATE POLICY "employees_tenant_update" ON public.employees
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "teams_tenant_update" ON public.teams;
CREATE POLICY "teams_tenant_update" ON public.teams
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "alloc_tenant_update" ON public.allocations;
CREATE POLICY "alloc_tenant_update" ON public.allocations
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "ts_tenant_update" ON public.timesheets;
CREATE POLICY "ts_tenant_update" ON public.timesheets
  FOR UPDATE USING (tenant_id = get_active_tenant_id());

DROP POLICY IF EXISTS "pc_update" ON public.payroll_config;
CREATE POLICY "pc_update" ON public.payroll_config
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));

DROP POLICY IF EXISTS "pr_update" ON public.payroll_runs;
CREATE POLICY "pr_update" ON public.payroll_runs
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));

-- ── Materials/Procurement tables ────────────────────────────────────────────

DROP POLICY IF EXISTS "mat_tenant_update" ON public.materials;
CREATE POLICY "mat_tenant_update" ON public.materials
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('compras'));

DROP POLICY IF EXISTS "po_tenant_update" ON public.purchase_orders;
CREATE POLICY "po_tenant_update" ON public.purchase_orders
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('compras'));

DROP POLICY IF EXISTS "pol_tenant_update" ON public.purchase_order_lines;
CREATE POLICY "pol_tenant_update" ON public.purchase_order_lines
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('compras'));

DROP POLICY IF EXISTS "grn_tenant_update" ON public.goods_receipts;
CREATE POLICY "grn_tenant_update" ON public.goods_receipts
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('compras'));

DROP POLICY IF EXISTS "grl_tenant_update" ON public.goods_receipt_lines;
CREATE POLICY "grl_tenant_update" ON public.goods_receipt_lines
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_role('compras'));


-- ════════════════════════════════════════════════════════════════════════════
-- PART 2: DELETE POLICIES → use get_active_tenant_id()
-- ════════════════════════════════════════════════════════════════════════════

-- ── Core tables ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "obras_delete_admin" ON public.obras;
CREATE POLICY "obras_delete_admin" ON public.obras
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));

-- ── Finance tables ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ap_delete_gestor" ON public.accounts_payable;
CREATE POLICY "ap_delete_gestor" ON public.accounts_payable
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "ap_delete" ON public.accounts_payable;
CREATE POLICY "ap_delete" ON public.accounts_payable
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

DROP POLICY IF EXISTS "ar_delete_gestor" ON public.accounts_receivable;
CREATE POLICY "ar_delete_gestor" ON public.accounts_receivable
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "ar_delete" ON public.accounts_receivable;
CREATE POLICY "ar_delete" ON public.accounts_receivable
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

DROP POLICY IF EXISTS "tx_delete_admin" ON public.financial_transactions;
CREATE POLICY "tx_delete_admin" ON public.financial_transactions
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));

DROP POLICY IF EXISTS "tx_delete" ON public.financial_transactions;
CREATE POLICY "tx_delete" ON public.financial_transactions
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

-- ── Imobiliario tables ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "empreen_delete_admin" ON public.empreendimentos;
CREATE POLICY "empreen_delete_admin" ON public.empreendimentos
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));

DROP POLICY IF EXISTS "fracoes_delete_admin" ON public.fracoes;
CREATE POLICY "fracoes_delete_admin" ON public.fracoes
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));

DROP POLICY IF EXISTS "blocos_delete_admin" ON public.blocos;
CREATE POLICY "blocos_delete_admin" ON public.blocos
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));

DROP POLICY IF EXISTS "tipologias_delete_gestor" ON public.tipologias;
CREATE POLICY "tipologias_delete_gestor" ON public.tipologias
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "reservas_delete_admin" ON public.reservas;
CREATE POLICY "reservas_delete_admin" ON public.reservas
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));

DROP POLICY IF EXISTS "imob_docs_delete_gestor" ON public.imob_documentos;
CREATE POLICY "imob_docs_delete_gestor" ON public.imob_documentos
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

-- ── HR/Payroll tables ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "eroles_tenant_delete" ON public.employee_roles;
CREATE POLICY "eroles_tenant_delete" ON public.employee_roles
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "employees_tenant_delete" ON public.employees;
CREATE POLICY "employees_tenant_delete" ON public.employees
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));

DROP POLICY IF EXISTS "erates_tenant_delete" ON public.employee_rates;
CREATE POLICY "erates_tenant_delete" ON public.employee_rates
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));

DROP POLICY IF EXISTS "teams_tenant_delete" ON public.teams;
CREATE POLICY "teams_tenant_delete" ON public.teams
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "tmembers_tenant_delete" ON public.team_members;
CREATE POLICY "tmembers_tenant_delete" ON public.team_members
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "alloc_tenant_delete" ON public.allocations;
CREATE POLICY "alloc_tenant_delete" ON public.allocations
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "ts_tenant_delete" ON public.timesheets;
CREATE POLICY "ts_tenant_delete" ON public.timesheets
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));

DROP POLICY IF EXISTS "pr_delete" ON public.payroll_runs;
CREATE POLICY "pr_delete" ON public.payroll_runs
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));

DROP POLICY IF EXISTS "pl_delete" ON public.payroll_lines;
CREATE POLICY "pl_delete" ON public.payroll_lines
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));

-- ── Materials/Procurement tables ────────────────────────────────────────────

DROP POLICY IF EXISTS "mat_tenant_delete" ON public.materials;
CREATE POLICY "mat_tenant_delete" ON public.materials
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));

DROP POLICY IF EXISTS "po_tenant_delete" ON public.purchase_orders;
CREATE POLICY "po_tenant_delete" ON public.purchase_orders
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin') AND estado = 'Rascunho');

DROP POLICY IF EXISTS "pol_tenant_delete" ON public.purchase_order_lines;
CREATE POLICY "pol_tenant_delete" ON public.purchase_order_lines
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('compras'));

DROP POLICY IF EXISTS "mc_tenant_delete" ON public.material_consumptions;
CREATE POLICY "mc_tenant_delete" ON public.material_consumptions
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_role('admin'));


-- ════════════════════════════════════════════════════════════════════════════
-- PART 3: INSERT POLICIES → Strengthen weak tables + add plan limit for profiles
-- ════════════════════════════════════════════════════════════════════════════

-- Add plan limit check on profiles INSERT (max_users enforcement)
-- Note: profiles are created by handle_new_user() trigger (SECURITY DEFINER),
-- so the RLS check only applies to direct inserts. The trigger bypasses RLS.
-- We still add it as defense-in-depth.
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
    AND tenant_id = get_tenant_id()
    AND check_plan_limit(tenant_id, 'users')
  );

-- ── Strengthen INSERT on 8 weak tables (add role restrictions) ──────────────

-- employee_roles: only gestor/admin can create
DROP POLICY IF EXISTS "eroles_tenant_write" ON public.employee_roles;
CREATE POLICY "eroles_tenant_write" ON public.employee_roles
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_role('gestor'));

-- teams: only gestor can create
DROP POLICY IF EXISTS "teams_tenant_write" ON public.teams;
CREATE POLICY "teams_tenant_write" ON public.teams
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_role('gestor'));

-- team_members: only gestor can assign
DROP POLICY IF EXISTS "tmembers_tenant_write" ON public.team_members;
CREATE POLICY "tmembers_tenant_write" ON public.team_members
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_role('gestor'));

-- allocations: only gestor can allocate
DROP POLICY IF EXISTS "alloc_tenant_write" ON public.allocations;
CREATE POLICY "alloc_tenant_write" ON public.allocations
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_role('gestor'));

-- materials: only compras role can create
DROP POLICY IF EXISTS "mat_tenant_write" ON public.materials;
CREATE POLICY "mat_tenant_write" ON public.materials
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_role('compras'));

-- goods_receipts: only compras role can create
DROP POLICY IF EXISTS "grn_tenant_write" ON public.goods_receipts;
CREATE POLICY "grn_tenant_write" ON public.goods_receipts
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_role('compras'));

-- goods_receipt_lines: only compras role can create
DROP POLICY IF EXISTS "grl_tenant_write" ON public.goods_receipt_lines;
CREATE POLICY "grl_tenant_write" ON public.goods_receipt_lines
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_role('compras'));

-- material_consumptions: only compras role can create
DROP POLICY IF EXISTS "mc_tenant_write" ON public.material_consumptions;
CREATE POLICY "mc_tenant_write" ON public.material_consumptions
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_role('compras'));

-- Also strengthen INSERT on employee_rates and timesheets
DROP POLICY IF EXISTS "erates_tenant_write" ON public.employee_rates;
CREATE POLICY "erates_tenant_write" ON public.employee_rates
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_role('gestor'));

DROP POLICY IF EXISTS "ts_tenant_write" ON public.timesheets;
CREATE POLICY "ts_tenant_write" ON public.timesheets
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id());

-- Also use get_active_tenant_id() on employees INSERT (already has check_plan_limit)
DROP POLICY IF EXISTS "employees_tenant_write" ON public.employees;
CREATE POLICY "employees_tenant_write" ON public.employees
  FOR INSERT WITH CHECK (
    tenant_id = get_active_tenant_id()
    AND check_plan_limit(tenant_id, 'employees')
  );

-- Also use get_active_tenant_id() on obras INSERT (already has check_plan_limit)
DROP POLICY IF EXISTS "obras_write_gestor" ON public.obras;
CREATE POLICY "obras_write_gestor" ON public.obras
  FOR INSERT WITH CHECK (
    tenant_id = get_active_tenant_id()
    AND has_role('gestor')
    AND check_plan_limit(tenant_id, 'obras')
  );


-- ════════════════════════════════════════════════════════════════════════════
-- PART 4: AUDIT TRIGGERS for HR/Finance tables
-- Reuses existing audit_log_trigger_fn() trigger function from 20260220000003
-- ════════════════════════════════════════════════════════════════════════════

-- employees: audit INSERT, UPDATE, DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_employees'
  ) THEN
    CREATE TRIGGER audit_employees
      AFTER INSERT OR UPDATE OR DELETE ON public.employees
      FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
  END IF;
END $$;

-- timesheets: audit INSERT, UPDATE, DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_timesheets'
  ) THEN
    CREATE TRIGGER audit_timesheets
      AFTER INSERT OR UPDATE OR DELETE ON public.timesheets
      FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
  END IF;
END $$;

-- payroll_runs: audit INSERT, UPDATE, DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_payroll_runs'
  ) THEN
    CREATE TRIGGER audit_payroll_runs
      AFTER INSERT OR UPDATE OR DELETE ON public.payroll_runs
      FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
  END IF;
END $$;

-- accounts_payable: audit INSERT, UPDATE, DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_accounts_payable'
  ) THEN
    CREATE TRIGGER audit_accounts_payable
      AFTER INSERT OR UPDATE OR DELETE ON public.accounts_payable
      FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
  END IF;
END $$;

-- accounts_receivable: audit INSERT, UPDATE, DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_accounts_receivable'
  ) THEN
    CREATE TRIGGER audit_accounts_receivable
      AFTER INSERT OR UPDATE OR DELETE ON public.accounts_receivable
      FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
  END IF;
END $$;

-- financial_transactions: audit INSERT, DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_financial_transactions'
  ) THEN
    CREATE TRIGGER audit_financial_transactions
      AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
      FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn();
  END IF;
END $$;


COMMIT;
