-- ============================================================
-- Migration: 20260220000002_rls_policies
-- ConstruAP — Row Level Security policies (tenant isolation)
-- ============================================================

-- Helper function: get the current user's tenant_id from JWT
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID
$$;

-- Helper function: get current user's role for a given obra
-- Returns the most permissive role (global or obra-specific)
CREATE OR REPLACE FUNCTION get_user_role(p_obra_id UUID DEFAULT NULL)
RETURNS user_role LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Check obra-specific role first
  IF p_obra_id IS NOT NULL THEN
    SELECT role INTO v_role
    FROM user_roles
    WHERE profile_id = auth.uid()
      AND obra_id = p_obra_id
    LIMIT 1;
  END IF;

  -- Fall back to global tenant role
  IF v_role IS NULL THEN
    SELECT role INTO v_role
    FROM user_roles
    WHERE profile_id = auth.uid()
      AND obra_id IS NULL
      AND tenant_id = get_tenant_id()
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_role, 'leitura');
END;
$$;

-- Helper: check if current user has at least a given role level
CREATE OR REPLACE FUNCTION has_role(
  required_role user_role,
  p_obra_id UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_role user_role := get_user_role(p_obra_id);
  v_hierarchy INTEGER;
  v_required INTEGER;
BEGIN
  -- Role hierarchy (higher = more permissions)
  v_hierarchy := CASE v_role
    WHEN 'admin' THEN 6
    WHEN 'gestor' THEN 5
    WHEN 'financeiro' THEN 4
    WHEN 'compras' THEN 3
    WHEN 'encarregado' THEN 2
    WHEN 'leitura' THEN 1
    ELSE 0
  END;
  v_required := CASE required_role
    WHEN 'admin' THEN 6
    WHEN 'gestor' THEN 5
    WHEN 'financeiro' THEN 4
    WHEN 'compras' THEN 3
    WHEN 'encarregado' THEN 2
    WHEN 'leitura' THEN 1
    ELSE 0
  END;
  RETURN v_hierarchy >= v_required;
END;
$$;

-- ============================================================
-- ENABLE RLS on all tables
-- ============================================================

ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras                ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_chapters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_photos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE empreendimentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fracoes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_log         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TENANTS — only own tenant visible
-- ============================================================

CREATE POLICY "tenant_select_own" ON tenants
  FOR SELECT USING (id = get_tenant_id());

CREATE POLICY "tenant_update_admin" ON tenants
  FOR UPDATE USING (id = get_tenant_id() AND has_role('admin'));

-- ============================================================
-- PROFILES — tenant isolation
-- ============================================================

CREATE POLICY "profiles_select_tenant" ON profiles
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid() AND tenant_id = get_tenant_id());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid() AND tenant_id = get_tenant_id());

-- ============================================================
-- USER ROLES
-- ============================================================

CREATE POLICY "roles_select_tenant" ON user_roles
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "roles_manage_admin" ON user_roles
  FOR ALL USING (tenant_id = get_tenant_id() AND has_role('admin'));

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE POLICY "clients_tenant_read" ON clients
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "clients_write_gestor" ON clients
  FOR ALL USING (tenant_id = get_tenant_id() AND has_role('gestor'));

-- ============================================================
-- SUPPLIERS
-- ============================================================

CREATE POLICY "suppliers_tenant_read" ON suppliers
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "suppliers_write_compras" ON suppliers
  FOR ALL USING (tenant_id = get_tenant_id() AND has_role('compras'));

-- ============================================================
-- OBRAS
-- ============================================================

CREATE POLICY "obras_tenant_read" ON obras
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "obras_write_gestor" ON obras
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('gestor'));

CREATE POLICY "obras_update_gestor" ON obras
  FOR UPDATE USING (tenant_id = get_tenant_id() AND has_role('gestor', id));

CREATE POLICY "obras_delete_admin" ON obras
  FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('admin'));

-- ============================================================
-- OBRA CHAPTERS
-- ============================================================

CREATE POLICY "chapters_tenant_read" ON obra_chapters
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "chapters_write_gestor" ON obra_chapters
  FOR ALL USING (tenant_id = get_tenant_id() AND has_role('gestor', obra_id));

-- ============================================================
-- BUDGETS
-- ============================================================

CREATE POLICY "budgets_tenant_read" ON budgets
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "budgets_write_gestor" ON budgets
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('gestor', obra_id));

CREATE POLICY "budgets_update_gestor" ON budgets
  FOR UPDATE USING (tenant_id = get_tenant_id() AND has_role('gestor', obra_id));

-- ============================================================
-- BUDGET ITEMS
-- ============================================================

CREATE POLICY "budget_items_tenant_read" ON budget_items
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "budget_items_write_gestor" ON budget_items
  FOR ALL USING (tenant_id = get_tenant_id() AND has_role('gestor'));

-- ============================================================
-- COSTS
-- ============================================================

CREATE POLICY "costs_read_financeiro" ON costs
  FOR SELECT USING (tenant_id = get_tenant_id() AND has_role('financeiro', obra_id));

CREATE POLICY "costs_write_compras" ON costs
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('compras', obra_id));

CREATE POLICY "costs_update_compras_own" ON costs
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND (has_role('gestor', obra_id) OR (created_by = auth.uid() AND status = 'Rascunho'))
  );

-- ============================================================
-- DIARIO ENTRIES
-- ============================================================

CREATE POLICY "diario_read_encarregado" ON diario_entries
  FOR SELECT USING (tenant_id = get_tenant_id() AND has_role('encarregado', obra_id));

CREATE POLICY "diario_write_encarregado" ON diario_entries
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('encarregado', obra_id));

CREATE POLICY "diario_update_own" ON diario_entries
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND (created_by = auth.uid() OR has_role('gestor', obra_id))
  );

-- ============================================================
-- DIARIO PHOTOS
-- ============================================================

CREATE POLICY "photos_read_tenant" ON diario_photos
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "photos_insert_encarregado" ON diario_photos
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

-- ============================================================
-- TASKS
-- ============================================================

CREATE POLICY "tasks_read_encarregado" ON tasks
  FOR SELECT USING (tenant_id = get_tenant_id() AND has_role('encarregado', obra_id));

CREATE POLICY "tasks_write_encarregado" ON tasks
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('encarregado', obra_id));

CREATE POLICY "tasks_update_assignee" ON tasks
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND (assignee_id = auth.uid() OR created_by = auth.uid() OR has_role('gestor', obra_id))
  );

-- ============================================================
-- TASK ATTACHMENTS
-- ============================================================

CREATE POLICY "task_attach_read_tenant" ON task_attachments
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "task_attach_insert_tenant" ON task_attachments
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE POLICY "docs_read_tenant" ON documents
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "docs_write_encarregado" ON documents
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('encarregado', obra_id));

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================

CREATE POLICY "po_read_compras" ON purchase_orders
  FOR SELECT USING (tenant_id = get_tenant_id() AND has_role('compras', obra_id));

CREATE POLICY "po_write_compras" ON purchase_orders
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('compras', obra_id));

CREATE POLICY "po_update_compras" ON purchase_orders
  FOR UPDATE USING (tenant_id = get_tenant_id() AND has_role('gestor', obra_id));

CREATE POLICY "po_items_read" ON purchase_order_items
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "po_items_write" ON purchase_order_items
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

-- ============================================================
-- EMPREENDIMENTOS + FRACOES
-- ============================================================

CREATE POLICY "empreen_read_tenant" ON empreendimentos
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "empreen_write_gestor" ON empreendimentos
  FOR ALL USING (tenant_id = get_tenant_id() AND has_role('gestor'));

CREATE POLICY "fracoes_read_tenant" ON fracoes
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "fracoes_write_gestor" ON fracoes
  FOR ALL USING (tenant_id = get_tenant_id() AND has_role('gestor'));

-- ============================================================
-- NOTIFICATIONS — each user sees only their own
-- ============================================================

CREATE POLICY "notif_read_own" ON notifications
  FOR SELECT USING (user_id = auth.uid() AND tenant_id = get_tenant_id());

CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid() AND tenant_id = get_tenant_id());

-- INSERT allowed from Edge Functions (service role bypasses RLS)

-- ============================================================
-- AUDIT LOG — read admin only; NO UPDATE/DELETE
-- ============================================================

CREATE POLICY "audit_read_admin" ON audit_log
  FOR SELECT USING (tenant_id = get_tenant_id() AND has_role('admin'));

-- INSERT only via trigger (service role / SECURITY DEFINER)
-- No UPDATE or DELETE policies intentionally — append-only enforced

-- ============================================================
-- CONFLICT LOG
-- ============================================================

CREATE POLICY "conflict_read_admin" ON conflict_log
  FOR SELECT USING (tenant_id = get_tenant_id() AND has_role('gestor'));

CREATE POLICY "conflict_insert" ON conflict_log
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "conflict_update_admin" ON conflict_log
  FOR UPDATE USING (tenant_id = get_tenant_id() AND has_role('gestor'));
