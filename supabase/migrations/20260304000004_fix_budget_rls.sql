-- ============================================================================
-- Migration: Fix Budget and Budget Items Insert/Update RLS
-- Date: 2026-03-04
-- 
-- Replaces has_role() in legacy budget policies with has_permission()
-- ============================================================================

-- ── BUDGETS ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "budgets_write_gestor" ON public.budgets;
CREATE POLICY "budgets_write_gestor" ON public.budgets
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));

DROP POLICY IF EXISTS "budgets_delete_gestor" ON public.budgets;
CREATE POLICY "budgets_delete_gestor" ON public.budgets
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('admin.manage'));


-- ── BUDGET_ITEMS ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "budget_items_write_gestor" ON public.budget_items;
CREATE POLICY "budget_items_write_gestor" ON public.budget_items
  FOR INSERT WITH CHECK (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));

DROP POLICY IF EXISTS "budget_items_update_gestor" ON public.budget_items;
CREATE POLICY "budget_items_update_gestor" ON public.budget_items
  FOR UPDATE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));

DROP POLICY IF EXISTS "budget_items_delete_gestor" ON public.budget_items;
CREATE POLICY "budget_items_delete_gestor" ON public.budget_items
  FOR DELETE USING (tenant_id = get_active_tenant_id() AND has_permission('obras.manage'));
