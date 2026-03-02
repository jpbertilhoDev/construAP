-- Migration: SaaS Infrastructure - Plans, Subscriptions, Usage, Lifecycle, Platform Admin
-- This is the foundational migration for transforming ConstruAP into a SaaS platform.
-- Creates: plans, tenant_subscriptions, tenant_usage, platform_admins
-- Alters: tenants (add status, suspended_at, suspension_reason)
-- Functions: check_plan_limit, has_feature, is_platform_admin, get_active_tenant_id
-- Triggers: usage counters on profiles, obras, employees
-- Modifies: handle_new_user (seed subscription + usage for new tenants)
-- Amends: RLS on obras INSERT, employees INSERT (add plan limit checks)
-- Backfills: existing tenants -> starter plan (active, no expiry)

-- ============================================================
-- 1. PLANS TABLE (reference data, no tenant_id)
-- ============================================================

CREATE TABLE public.plans (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  price_eur     NUMERIC(8,2) NOT NULL DEFAULT 0,
  interval      TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  max_users     INTEGER,          -- NULL = unlimited
  max_obras     INTEGER,
  max_storage_mb BIGINT,
  max_employees INTEGER,
  features      JSONB NOT NULL DEFAULT '{}',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_read_all" ON public.plans FOR SELECT USING (true);

-- Seed 4 plans
INSERT INTO public.plans (id, name, price_eur, max_users, max_obras, max_storage_mb, max_employees, features, sort_order) VALUES
  ('free',         'Gratuito',      0,    3,    2,    500,   10,  '{"payroll": false, "imobiliario": false, "relatorios_avancados": false}', 1),
  ('starter',      'Starter',       29,   10,   10,   5000,  50,  '{"payroll": true,  "imobiliario": false, "relatorios_avancados": true}',  2),
  ('professional', 'Profissional',  79,   30,   50,   25000, 200, '{"payroll": true,  "imobiliario": true,  "relatorios_avancados": true}',  3),
  ('enterprise',   'Empresarial',   0,    NULL, NULL, NULL,  NULL,'{"payroll": true,  "imobiliario": true,  "relatorios_avancados": true,  "api_access": true}', 4);

-- ============================================================
-- 2. TENANT SUBSCRIPTIONS
-- ============================================================

CREATE TABLE public.tenant_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id                 TEXT NOT NULL REFERENCES public.plans(id) DEFAULT 'free',
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'suspended')),
  trial_ends_at           TIMESTAMPTZ,
  current_period_start    TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end      TIMESTAMPTZ,
  canceled_at             TIMESTAMPTZ,
  -- Stripe fields (NULL until billing integration)
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

CREATE INDEX idx_tenant_sub_tenant ON public.tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_sub_status ON public.tenant_subscriptions(status);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Tenant admins can read their own subscription
CREATE POLICY "sub_read_own" ON public.tenant_subscriptions
  FOR SELECT USING (tenant_id = get_tenant_id());

-- Auto-update updated_at
CREATE TRIGGER trg_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. TENANT USAGE (materialized counters)
-- ============================================================

CREATE TABLE public.tenant_usage (
  tenant_id       UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_count      INTEGER NOT NULL DEFAULT 0,
  obra_count      INTEGER NOT NULL DEFAULT 0,
  employee_count  INTEGER NOT NULL DEFAULT 0,
  storage_bytes   BIGINT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_read_own" ON public.tenant_usage
  FOR SELECT USING (tenant_id = get_tenant_id());

-- ============================================================
-- 4. PLATFORM ADMINS (super-admin table)
-- ============================================================

CREATE TABLE public.platform_admins (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id)
);

-- No RLS needed - only accessed via Edge Functions (service role)

-- ============================================================
-- 5. ALTER TENANTS - Add lifecycle fields
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- ============================================================
-- 6. SQL FUNCTIONS
-- ============================================================

-- 6a. check_plan_limit: Enforce resource limits per plan
CREATE OR REPLACE FUNCTION public.check_plan_limit(
  p_tenant_id UUID,
  p_resource TEXT  -- 'users', 'obras', 'employees'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_limit   INTEGER;
  v_current INTEGER;
  v_status  TEXT;
BEGIN
  -- Get tenant's current plan and subscription status
  SELECT ts.plan_id, ts.status
  INTO v_plan_id, v_status
  FROM tenant_subscriptions ts
  WHERE ts.tenant_id = p_tenant_id;

  -- No subscription record = allow (graceful fallback for unconfigured tenants)
  IF v_plan_id IS NULL THEN RETURN TRUE; END IF;

  -- Suspended/canceled tenants cannot create anything
  IF v_status IN ('suspended', 'canceled') THEN RETURN FALSE; END IF;

  -- Get the limit for this resource from the plan
  SELECT CASE p_resource
    WHEN 'users'     THEN p.max_users
    WHEN 'obras'     THEN p.max_obras
    WHEN 'employees' THEN p.max_employees
    ELSE NULL
  END INTO v_limit
  FROM plans p WHERE p.id = v_plan_id;

  -- NULL limit = unlimited
  IF v_limit IS NULL THEN RETURN TRUE; END IF;

  -- Get current usage
  SELECT CASE p_resource
    WHEN 'users'     THEN tu.user_count
    WHEN 'obras'     THEN tu.obra_count
    WHEN 'employees' THEN tu.employee_count
    ELSE 0
  END INTO v_current
  FROM tenant_usage tu WHERE tu.tenant_id = p_tenant_id;

  -- No usage record = allow (graceful fallback)
  v_current := COALESCE(v_current, 0);

  RETURN v_current < v_limit;
END;
$$;

-- 6b. has_feature: Check if tenant's plan includes a feature
CREATE OR REPLACE FUNCTION public.has_feature(p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_plan_id   TEXT;
  v_features  JSONB;
BEGIN
  v_tenant_id := get_tenant_id();
  IF v_tenant_id IS NULL THEN RETURN FALSE; END IF;

  SELECT ts.plan_id INTO v_plan_id
  FROM tenant_subscriptions ts
  WHERE ts.tenant_id = v_tenant_id;

  -- No subscription = free plan
  IF v_plan_id IS NULL THEN v_plan_id := 'free'; END IF;

  SELECT p.features INTO v_features
  FROM plans p WHERE p.id = v_plan_id;

  RETURN COALESCE((v_features ->> p_feature)::boolean, false);
END;
$$;

-- 6c. is_platform_admin: Check if current user is a super-admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = auth.uid());
$$;

-- 6d. get_active_tenant_id: Like get_tenant_id but checks tenant is active
--     Used in WRITE policies so suspended tenants can read but not write
CREATE OR REPLACE FUNCTION public.get_active_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.tenant_id
  FROM profiles p
  JOIN tenants t ON t.id = p.tenant_id
  WHERE p.id = auth.uid()
    AND t.status = 'active'
  LIMIT 1;
$$;

-- ============================================================
-- 7. USAGE TRACKING TRIGGERS
-- ============================================================

-- 7a. User count trigger (fires on profiles INSERT/DELETE)
CREATE OR REPLACE FUNCTION public.update_tenant_user_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tenant_usage (tenant_id, user_count)
    VALUES (NEW.tenant_id, 1)
    ON CONFLICT (tenant_id)
    DO UPDATE SET user_count = tenant_usage.user_count + 1, updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tenant_usage
    SET user_count = GREATEST(user_count - 1, 0), updated_at = now()
    WHERE tenant_id = OLD.tenant_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_profiles_usage_count
  AFTER INSERT OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_tenant_user_count();

-- 7b. Obra count trigger
CREATE OR REPLACE FUNCTION public.update_tenant_obra_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tenant_usage (tenant_id, obra_count)
    VALUES (NEW.tenant_id, 1)
    ON CONFLICT (tenant_id)
    DO UPDATE SET obra_count = tenant_usage.obra_count + 1, updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tenant_usage
    SET obra_count = GREATEST(obra_count - 1, 0), updated_at = now()
    WHERE tenant_id = OLD.tenant_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_obras_usage_count
  AFTER INSERT OR DELETE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION update_tenant_obra_count();

-- 7c. Employee count trigger
CREATE OR REPLACE FUNCTION public.update_tenant_employee_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tenant_usage (tenant_id, employee_count)
    VALUES (NEW.tenant_id, 1)
    ON CONFLICT (tenant_id)
    DO UPDATE SET employee_count = tenant_usage.employee_count + 1, updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tenant_usage
    SET employee_count = GREATEST(employee_count - 1, 0), updated_at = now()
    WHERE tenant_id = OLD.tenant_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_employees_usage_count
  AFTER INSERT OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_tenant_employee_count();

-- ============================================================
-- 8. RLS AMENDMENTS - Add plan limit checks to INSERT policies
-- ============================================================

-- 8a. Obras INSERT: add plan limit check
DROP POLICY IF EXISTS "obras_write_gestor" ON public.obras;
CREATE POLICY "obras_write_gestor" ON public.obras
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id()
    AND has_role('gestor')
    AND check_plan_limit(tenant_id, 'obras')
  );

-- 8b. Employees INSERT: add plan limit check
DROP POLICY IF EXISTS "employees_tenant_write" ON public.employees;
CREATE POLICY "employees_tenant_write" ON public.employees
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id()
    AND check_plan_limit(tenant_id, 'employees')
  );

-- ============================================================
-- 9. UPDATE handle_new_user() - Seed subscription + usage for new tenants
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
  v_tenant_id    UUID;
  v_name         TEXT;
  v_role_id      UUID;

  -- Role variables
  r_admin    UUID;
  r_rh       UUID;
  r_finance  UUID;
  r_compras  UUID;
  r_obras    UUID;
BEGIN
  v_company_name := NEW.raw_user_meta_data->>'company_name';
  v_name         := COALESCE(
                      NEW.raw_user_meta_data->>'name',
                      NEW.raw_user_meta_data->>'full_name',
                      split_part(NEW.email, '@', 1)
                    );

  -- ── CASE 1: Owner creating a new tenant (has company_name) ──────────────
  IF v_company_name IS NOT NULL AND v_company_name != '' THEN

    INSERT INTO public.tenants (name, status)
    VALUES (v_company_name, 'active')
    RETURNING id INTO v_tenant_id;

    INSERT INTO public.profiles (id, tenant_id, name, email)
    VALUES (NEW.id, v_tenant_id, v_name, NEW.email);

    -- ── Seed the 5 default roles immediately for this new tenant ──────────
    INSERT INTO public.roles (tenant_id, name, description, is_system_default) VALUES
      (v_tenant_id, 'Admin', 'Acesso total a todos os módulos do sistema.', true) RETURNING id INTO r_admin;

    INSERT INTO public.roles (tenant_id, name, description, is_system_default) VALUES
      (v_tenant_id, 'RH', 'Gestão de recursos humanos e funcionários.', true) RETURNING id INTO r_rh;

    INSERT INTO public.roles (tenant_id, name, description, is_system_default) VALUES
      (v_tenant_id, 'Financeiro', 'Acesso e gestão de finanças e pagamentos.', true) RETURNING id INTO r_finance;

    INSERT INTO public.roles (tenant_id, name, description, is_system_default) VALUES
      (v_tenant_id, 'Compras', 'Gestão das compras de materiais e equipamentos.', true) RETURNING id INTO r_compras;

    INSERT INTO public.roles (tenant_id, name, description, is_system_default) VALUES
      (v_tenant_id, 'Obras', 'Gestão da execução e custos de obras.', true) RETURNING id INTO r_obras;

    -- Link Admin permissions (ALL)
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r_admin, id FROM public.permissions;

    -- Link RH permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r_rh, id FROM public.permissions WHERE key IN ('dashboard.view', 'rh.view', 'rh.manage');

    -- Link Financeiro permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r_finance, id FROM public.permissions WHERE key IN ('dashboard.view', 'finance.view', 'finance.manage', 'relatorios.view');

    -- Link Compras permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r_compras, id FROM public.permissions WHERE key IN ('dashboard.view', 'compras.view', 'compras.manage');

    -- Link Obras permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r_obras, id FROM public.permissions WHERE key IN ('dashboard.view', 'obras.view', 'obras.manage', 'compras.view', 'compras.manage');

    -- ── Give the owner the Admin role ──
    INSERT INTO public.user_roles (profile_id, tenant_id, role, custom_role_id)
    VALUES (NEW.id, v_tenant_id, 'custom', r_admin);

    -- ── NEW: Seed subscription (14-day trial on Starter) ──
    INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, trial_ends_at, current_period_end)
    VALUES (v_tenant_id, 'starter', 'trialing', now() + interval '14 days', now() + interval '14 days');

    -- ── NEW: Initialize usage counters (1 user = the owner) ──
    INSERT INTO public.tenant_usage (tenant_id, user_count, obra_count, employee_count, storage_bytes)
    VALUES (v_tenant_id, 1, 0, 0, 0);

  -- ── CASE 2: Invited user with tenant_id in metadata ──────────────────────
  ELSIF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN

    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;

    -- Verify tenant exists
    PERFORM 1 FROM public.tenants WHERE id = v_tenant_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

    INSERT INTO public.profiles (id, tenant_id, name, email)
    VALUES (NEW.id, v_tenant_id, v_name, NEW.email)
    ON CONFLICT (id) DO NOTHING;

    -- Auto-assign the role specified by the admin
    IF NEW.raw_user_meta_data->>'role_id' IS NOT NULL AND NEW.raw_user_meta_data->>'role_id' != '' THEN
      v_role_id := (NEW.raw_user_meta_data->>'role_id')::uuid;

      INSERT INTO public.user_roles (profile_id, tenant_id, role, custom_role_id)
      VALUES (NEW.id, v_tenant_id, 'custom', v_role_id)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Note: user_count is updated by the trg_profiles_usage_count trigger

  END IF;

  -- ── Set app_metadata.tenant_id so RLS policies work via get_tenant_id() ──
  IF v_tenant_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                            || jsonb_build_object('tenant_id', v_tenant_id::text)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 10. BACKFILL - Existing tenants -> Starter plan (active, no expiry)
-- ============================================================

-- 10a. Backfill subscriptions: all existing tenants get Starter plan, active, no expiry
INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, current_period_start)
  SELECT id, 'starter', 'active', now()
  FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- 10b. Backfill usage counters with real counts
INSERT INTO public.tenant_usage (tenant_id, user_count, obra_count, employee_count, storage_bytes)
  SELECT
    t.id,
    COALESCE((SELECT COUNT(*)::int FROM profiles p WHERE p.tenant_id = t.id), 0),
    COALESCE((SELECT COUNT(*)::int FROM obras o WHERE o.tenant_id = t.id), 0),
    COALESCE((SELECT COUNT(*)::int FROM employees e WHERE e.tenant_id = t.id), 0),
    0  -- storage_bytes will be calculated later
  FROM tenants t
ON CONFLICT (tenant_id) DO NOTHING;
