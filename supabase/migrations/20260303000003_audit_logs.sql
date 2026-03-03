-- ============================================================================
-- Migration: Audit Logs Table
-- Date: 2026-03-03
-- Purpose: Track all critical actions per tenant for data confidentiality
--          and compliance (GDPR audit trail). Addresses client concern about
--          data security in multi-tenant SaaS.
-- ============================================================================

-- ─── 1. CREATE audit_logs TABLE ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,                          -- snapshot at time of action
  user_name   TEXT,                          -- snapshot at time of action
  action      TEXT        NOT NULL,          -- e.g. 'obra.create', 'user.invite'
  entity_type TEXT        NOT NULL,          -- e.g. 'obra', 'cost', 'user'
  entity_id   UUID,                          -- the affected row's ID
  entity_name TEXT,                          -- human-readable name (snapshot)
  meta        JSONB       DEFAULT '{}',      -- extra context (amounts, status, etc.)
  ip_address  INET,                          -- optional IP for security auditing
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. INDEXES for performance ─────────────────────────────────────────────

-- Most common query: logs for a specific tenant, ordered by date
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
  ON public.audit_logs (tenant_id, created_at DESC);

-- Filter by user within tenant
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON public.audit_logs (tenant_id, user_id);

-- Filter by entity type
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type
  ON public.audit_logs (tenant_id, entity_type);

-- ─── 3. ROW LEVEL SECURITY ──────────────────────────────────────────────────

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Read: users can only see logs for their own tenant
CREATE POLICY "audit_logs_select_own_tenant" ON public.audit_logs
  FOR SELECT USING (tenant_id = get_tenant_id());

-- Insert: only authenticated users can insert, and only for their own tenant
CREATE POLICY "audit_logs_insert_own_tenant" ON public.audit_logs
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

-- No UPDATE or DELETE allowed — audit logs are immutable
-- (This is intentional for data integrity and legal compliance)

-- ─── 4. GRANTS ──────────────────────────────────────────────────────────────

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;

-- ─── 5. HELPER FUNCTION: log_audit_event ────────────────────────────────────
-- Convenience function to insert audit events from triggers or application code.
-- Can be called from PostgreSQL triggers or directly via supabase.rpc().

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action      TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID    DEFAULT NULL,
  p_entity_name TEXT    DEFAULT NULL,
  p_meta        JSONB   DEFAULT '{}'::JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id  UUID;
  v_user_id    UUID;
  v_user_email TEXT;
  v_user_name  TEXT;
  v_log_id     UUID;
BEGIN
  -- Get current tenant and user
  v_tenant_id  := get_tenant_id();
  v_user_id    := auth.uid();

  -- Snapshot user info
  SELECT email INTO v_user_email
    FROM auth.users WHERE id = v_user_id;

  SELECT full_name INTO v_user_name
    FROM public.profiles WHERE id = v_user_id;

  INSERT INTO public.audit_logs (
    tenant_id, user_id, user_email, user_name,
    action, entity_type, entity_id, entity_name, meta
  ) VALUES (
    v_tenant_id, v_user_id, v_user_email, v_user_name,
    p_action, p_entity_type, p_entity_id, p_entity_name, p_meta
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;


-- ─── 6. AUTOMATIC TRIGGERS for high-security events ─────────────────────────

-- Trigger function for user_roles changes (most critical for data security)
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_tenant_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'user.role_assigned';
    v_tenant_id := NEW.tenant_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'user.role_removed';
    v_tenant_id := OLD.tenant_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Only log if we can determine tenant
  IF v_tenant_id IS NULL THEN
    IF TG_OP = 'INSERT' THEN RETURN NEW; ELSE RETURN OLD; END IF;
  END IF;

  INSERT INTO public.audit_logs (
    tenant_id, user_id, user_email,
    action, entity_type,
    entity_id,
    meta
  )
  SELECT
    v_tenant_id,
    auth.uid(),
    u.email,
    v_action,
    'user',
    CASE WHEN TG_OP = 'INSERT' THEN NEW.user_id ELSE OLD.user_id END,
    jsonb_build_object(
      'role', CASE WHEN TG_OP = 'INSERT' THEN NEW.role ELSE OLD.role END,
      'changed_by', auth.uid()
    )
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF TG_OP = 'INSERT' THEN RETURN NEW; ELSE RETURN OLD; END IF;
END;
$$;

-- Attach trigger to user_roles
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();
