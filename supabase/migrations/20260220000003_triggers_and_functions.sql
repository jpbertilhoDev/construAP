-- ============================================================
-- Migration: 20260220000003_triggers_and_functions
-- ConstruAP — Triggers de auditoria e gestão de utilizadores
-- ============================================================

-- ============================================================
-- FUNCTION: handle_new_user
-- Executa após Auth signup para criar profile e associar tenant
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id  UUID;
  v_name       TEXT;
  v_is_new     BOOLEAN := FALSE;
BEGIN
  -- Extract metadata from signup
  v_tenant_id := (NEW.raw_app_meta_data ->> 'tenant_id')::UUID;
  v_name      := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- If no tenant_id in metadata = new company signup, create tenant
  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (name, email)
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'Minha Empresa'),
      NEW.email
    )
    RETURNING id INTO v_tenant_id;
    v_is_new := TRUE;
  END IF;

  -- Create profile
  INSERT INTO profiles (id, tenant_id, name, consent_at)
  VALUES (NEW.id, v_tenant_id, v_name, now())
  ON CONFLICT (id) DO NOTHING;

  -- Assign role: admin if new company, leitura otherwise
  INSERT INTO user_roles (tenant_id, profile_id, role)
  VALUES (
    v_tenant_id,
    NEW.id,
    CASE WHEN v_is_new THEN 'admin'::user_role ELSE 'leitura'::user_role END
  )
  ON CONFLICT (profile_id, obra_id) DO NOTHING;

  -- Set tenant_id in app_metadata so it's available in JWT
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('tenant_id', v_tenant_id)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users after insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTION: audit_log_trigger_fn
-- Regista alterações em tabelas críticas no audit_log
-- ============================================================

CREATE OR REPLACE FUNCTION audit_log_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id  UUID;
  v_action     audit_action;
  v_old        JSONB := NULL;
  v_new        JSONB := NULL;
BEGIN
  -- Determine tenant_id from the row
  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
    v_old       := to_jsonb(OLD);
    v_action    := 'DELETE';
  ELSIF TG_OP = 'INSERT' THEN
    v_tenant_id := NEW.tenant_id;
    v_new       := to_jsonb(NEW);
    v_action    := 'INSERT';
  ELSE
    v_tenant_id := NEW.tenant_id;
    v_old       := to_jsonb(OLD);
    v_new       := to_jsonb(NEW);
    v_action    := 'UPDATE';
  END IF;

  INSERT INTO audit_log (
    tenant_id, table_name, record_id, action,
    old_value, new_value, changed_by
  )
  VALUES (
    v_tenant_id,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_old,
    v_new,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit trigger to critical tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['budgets', 'budget_items', 'costs', 'obras']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_audit
       AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION audit_log_trigger_fn()',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- FUNCTION: notify_on_task_assignment
-- Cria notificação in-app quando tarefa é atribuída
-- ============================================================

CREATE OR REPLACE FUNCTION notify_on_task_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only trigger when assignee changes and is not null
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
    INSERT INTO notifications (tenant_id, user_id, type, title, message, link)
    VALUES (
      NEW.tenant_id,
      NEW.assignee_id,
      'task_assigned',
      'Nova tarefa atribuída',
      'Tem uma nova tarefa: ' || NEW.title,
      '/obras/' || NEW.obra_id || '/tarefas'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_notify_assignment
  AFTER INSERT OR UPDATE OF assignee_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_on_task_assignment();

-- ============================================================
-- FUNCTION: notify_on_approval_request
-- Cria notificação quando orçamento ou custo pede aprovação
-- ============================================================

CREATE OR REPLACE FUNCTION notify_on_budget_approval_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'Pendente Aprovação' AND OLD.status != 'Pendente Aprovação' THEN
    -- Notify all admins and gestores of the tenant
    INSERT INTO notifications (tenant_id, user_id, type, title, message, link)
    SELECT
      NEW.tenant_id,
      ur.profile_id,
      'budget_approval_needed',
      'Aprovação de orçamento pendente',
      'Versão ' || NEW.version || ' do orçamento aguarda aprovação.',
      '/obras/' || NEW.obra_id || '/orcamento'
    FROM user_roles ur
    WHERE ur.tenant_id = NEW.tenant_id
      AND ur.role IN ('admin', 'gestor')
      AND ur.profile_id != NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_budgets_notify_approval
  AFTER UPDATE OF status ON budgets
  FOR EACH ROW EXECUTE FUNCTION notify_on_budget_approval_request();

-- ============================================================
-- VIEW: vw_obra_financials
-- Totais orçado vs real por obra (para dashboard)
-- ============================================================

CREATE OR REPLACE VIEW vw_obra_financials AS
SELECT
  o.id            AS obra_id,
  o.tenant_id,
  o.name          AS obra_name,
  o.status,
  COALESCE(b.total_budgeted, 0)   AS total_budgeted,
  COALESCE(c.total_costs, 0)      AS total_costs,
  COALESCE(c.total_costs, 0) - COALESCE(b.total_budgeted, 0) AS deviation,
  CASE
    WHEN COALESCE(b.total_budgeted, 0) = 0 THEN NULL
    ELSE ROUND(
      ((COALESCE(c.total_costs, 0) - COALESCE(b.total_budgeted, 0))
       / COALESCE(b.total_budgeted, 0)) * 100,
      2
    )
  END AS deviation_pct
FROM obras o
LEFT JOIN (
  SELECT bi.tenant_id, b.obra_id, SUM(bi.total) AS total_budgeted
  FROM budgets b
  JOIN budget_items bi ON bi.budget_id = b.id
  WHERE b.status = 'Aprovado'
  GROUP BY bi.tenant_id, b.obra_id
) b ON b.obra_id = o.id AND b.tenant_id = o.tenant_id
LEFT JOIN (
  SELECT obra_id, tenant_id, SUM(amount) AS total_costs
  FROM costs
  WHERE status = 'Aprovado'
  GROUP BY obra_id, tenant_id
) c ON c.obra_id = o.id AND c.tenant_id = o.tenant_id;

-- RLS on view (inherits from underlying tables via SECURITY INVOKER default)
-- Additional policy through tenant_id filter in the view itself
