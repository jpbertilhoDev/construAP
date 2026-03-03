-- ============================================================================
-- Migration: Fix all RLS policies for new RBAC system (role='custom')
-- Date: 2026-03-03
-- 
-- New companies registered on the platform get role='custom' with granular
-- permissions via role_permissions table. Old policies used has_role('gestor')
-- which only matches the legacy enum role. This migration replaces ALL
-- has_role() calls with has_permission() equivalents so new tenants work.
-- ============================================================================

-- ── OBRAS ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "obras_write_gestor"  ON public.obras;
DROP POLICY IF EXISTS "obras_update_gestor" ON public.obras;
DROP POLICY IF EXISTS "obras_delete_admin"  ON public.obras;

CREATE POLICY "obras_write_gestor"  ON public.obras
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_permission('obras.manage') AND check_plan_limit(tenant_id, 'obras'));

CREATE POLICY "obras_update_gestor" ON public.obras
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));

CREATE POLICY "obras_delete_admin"  ON public.obras
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));

-- ── OBRA_CHAPTERS ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "chapters_write_gestor" ON public.obra_chapters;
CREATE POLICY "chapters_write_gestor" ON public.obra_chapters
  FOR ALL USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));

-- ── BUDGETS ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "budgets_update_gestor" ON public.budgets;
CREATE POLICY "budgets_update_gestor" ON public.budgets
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));

-- ── COSTS ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "costs_update_compras_own" ON public.costs;
CREATE POLICY "costs_update_compras_own" ON public.costs
  FOR UPDATE USING (
    tenant_id = get_active_tenant_id()
    AND (has_permission('obras.manage') OR (created_by = auth.uid() AND status = 'Rascunho'))
  );

-- ── DIARIO_ENTRIES ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "diario_update_own" ON public.diario_entries;
CREATE POLICY "diario_update_own" ON public.diario_entries
  FOR UPDATE USING (
    tenant_id = get_active_tenant_id()
    AND (created_by = auth.uid() OR has_permission('obras.manage'))
  );

-- ── TASKS ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tasks_update_assignee" ON public.tasks;
CREATE POLICY "tasks_update_assignee" ON public.tasks
  FOR UPDATE USING (
    tenant_id = get_active_tenant_id()
    AND (assignee_id = auth.uid() OR created_by = auth.uid() OR has_permission('obras.manage'))
  );

-- ── PURCHASE_ORDERS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "po_update_compras"  ON public.purchase_orders;
DROP POLICY IF EXISTS "po_tenant_update"   ON public.purchase_orders;
DROP POLICY IF EXISTS "po_tenant_delete"   ON public.purchase_orders;

CREATE POLICY "po_update_compras" ON public.purchase_orders
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('compras.manage'));

CREATE POLICY "po_tenant_delete"  ON public.purchase_orders
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage') AND estado = 'Rascunho');

-- ── PURCHASE_ORDER_LINES ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pol_tenant_update" ON public.purchase_order_lines;
DROP POLICY IF EXISTS "pol_tenant_delete" ON public.purchase_order_lines;
CREATE POLICY "pol_tenant_update" ON public.purchase_order_lines
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('compras.manage'));
CREATE POLICY "pol_tenant_delete" ON public.purchase_order_lines
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('compras.manage'));

-- ── GOODS_RECEIPTS ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "grn_tenant_update" ON public.goods_receipts;
CREATE POLICY "grn_tenant_update" ON public.goods_receipts
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('compras.manage'));

-- ── GOODS_RECEIPT_LINES ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "grl_tenant_update" ON public.goods_receipt_lines;
CREATE POLICY "grl_tenant_update" ON public.goods_receipt_lines
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('compras.manage'));

-- ── MATERIALS ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "mat_tenant_update" ON public.materials;
DROP POLICY IF EXISTS "mat_tenant_delete" ON public.materials;
CREATE POLICY "mat_tenant_update" ON public.materials
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('compras.manage'));
CREATE POLICY "mat_tenant_delete" ON public.materials
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

-- ── MATERIAL_CONSUMPTIONS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "mc_tenant_delete" ON public.material_consumptions;
CREATE POLICY "mc_tenant_delete" ON public.material_consumptions
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

-- ── CONFLICT_LOG ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "conflict_update_admin" ON public.conflict_log;
CREATE POLICY "conflict_update_admin" ON public.conflict_log
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));

-- ── TENANTS ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_update_admin" ON public.tenants;
CREATE POLICY "tenant_update_admin" ON public.tenants
  FOR UPDATE USING (id = get_active_tenant_id() AND has_permission('admin.manage'));

-- ── EMPLOYEE_ROLES ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "eroles_tenant_update" ON public.employee_roles;
DROP POLICY IF EXISTS "eroles_tenant_delete" ON public.employee_roles;
CREATE POLICY "eroles_tenant_update" ON public.employee_roles
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));
CREATE POLICY "eroles_tenant_delete" ON public.employee_roles
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));

-- ── EMPLOYEES ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "employees_tenant_update" ON public.employees;
DROP POLICY IF EXISTS "employees_tenant_delete" ON public.employees;
CREATE POLICY "employees_tenant_update" ON public.employees
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));
CREATE POLICY "employees_tenant_delete" ON public.employees
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

-- ── EMPLOYEE_RATES ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "erates_tenant_delete" ON public.employee_rates;
CREATE POLICY "erates_tenant_delete" ON public.employee_rates
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

-- ── TEAMS ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "teams_tenant_update" ON public.teams;
DROP POLICY IF EXISTS "teams_tenant_delete" ON public.teams;
CREATE POLICY "teams_tenant_update" ON public.teams
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));
CREATE POLICY "teams_tenant_delete" ON public.teams
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));

-- ── TEAM_MEMBERS ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tmembers_tenant_delete" ON public.team_members;
CREATE POLICY "tmembers_tenant_delete" ON public.team_members
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));

-- ── ALLOCATIONS ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "alloc_tenant_update" ON public.allocations;
DROP POLICY IF EXISTS "alloc_tenant_delete" ON public.allocations;
CREATE POLICY "alloc_tenant_update" ON public.allocations
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));
CREATE POLICY "alloc_tenant_delete" ON public.allocations
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('rh.manage'));

-- ── TIMESHEETS ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ts_tenant_delete" ON public.timesheets;
CREATE POLICY "ts_tenant_delete" ON public.timesheets
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

-- ── IMOBILIÁRIO tables ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "empreen_update_gestor" ON public.empreendimentos;
DROP POLICY IF EXISTS "empreen_delete_admin"  ON public.empreendimentos;
CREATE POLICY "empreen_update_gestor" ON public.empreendimentos
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));
CREATE POLICY "empreen_delete_admin"  ON public.empreendimentos
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

DROP POLICY IF EXISTS "fracoes_update_gestor" ON public.fracoes;
DROP POLICY IF EXISTS "fracoes_delete_admin"  ON public.fracoes;
CREATE POLICY "fracoes_update_gestor" ON public.fracoes
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));
CREATE POLICY "fracoes_delete_admin"  ON public.fracoes
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

DROP POLICY IF EXISTS "tipologias_update_gestor" ON public.tipologias;
DROP POLICY IF EXISTS "tipologias_delete_gestor" ON public.tipologias;
CREATE POLICY "tipologias_update_gestor" ON public.tipologias
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));
CREATE POLICY "tipologias_delete_gestor" ON public.tipologias
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));

DROP POLICY IF EXISTS "imob_docs_update_gestor" ON public.imob_documentos;
DROP POLICY IF EXISTS "imob_docs_delete_gestor" ON public.imob_documentos;
CREATE POLICY "imob_docs_update_gestor" ON public.imob_documentos
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));
CREATE POLICY "imob_docs_delete_gestor" ON public.imob_documentos
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));

DROP POLICY IF EXISTS "blocos_delete_admin" ON public.blocos;
CREATE POLICY "blocos_delete_admin" ON public.blocos
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

DROP POLICY IF EXISTS "reservas_delete_admin" ON public.reservas;
CREATE POLICY "reservas_delete_admin" ON public.reservas
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));

-- ── FINANCE tables ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ap_update_gestor" ON public.accounts_payable;
DROP POLICY IF EXISTS "ap_delete_gestor" ON public.accounts_payable;
DROP POLICY IF EXISTS "ar_update_gestor" ON public.accounts_receivable;
DROP POLICY IF EXISTS "ar_delete_gestor" ON public.accounts_receivable;
DROP POLICY IF EXISTS "tx_delete_admin"  ON public.financial_transactions;

-- ── PEDIDOS_COMPRA / autos_medicao INSERT policies (tabelas opcionais) ────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='pedidos_compra' AND table_schema='public') THEN
    EXECUTE '
      DROP POLICY IF EXISTS "pedidos_insert_compras" ON public.pedidos_compra;
      CREATE POLICY "pedidos_insert_compras" ON public.pedidos_compra
        FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_permission(''compras.manage''));
    ';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='autos_medicao' AND table_schema='public') THEN
    EXECUTE '
      DROP POLICY IF EXISTS "autos_insert_gestor" ON public.autos_medicao;
      CREATE POLICY "autos_insert_gestor" ON public.autos_medicao
        FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_permission(''obras.manage''));
    ';
  END IF;
END $$;

-- ── employee_roles INSERT ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "eroles_tenant_insert" ON public.employee_roles;
CREATE POLICY "eroles_tenant_insert" ON public.employee_roles
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_permission('rh.manage'));
