-- Migration: Seed default roles for new tenants automatically
-- 1. Updates handle_new_user to seed 5 default roles for newly created tenants.
-- 2. Backfills any existing tenant that is missing the "Admin" role (e.g. created after 00003).

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

    INSERT INTO public.tenants (name)
    VALUES (v_company_name)
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

    -- Link Admin permissions (ALL 12)
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

  END IF;

  RETURN NEW;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- BACKFILL: Apply the 5 default roles to any tenants that missed it
-- (e.g. tenants created recently before this trigger existed)
-- ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rec RECORD;
  r_admin    UUID;
  r_rh       UUID;
  r_finance  UUID;
  r_compras  UUID;
  r_obras    UUID;
BEGIN
  -- Find tenants that do NOT have the 'Admin' role yet
  FOR rec IN 
    SELECT t.id FROM public.tenants t
    LEFT JOIN public.roles r ON r.tenant_id = t.id AND r.name = 'Admin'
    WHERE r.id IS NULL
  LOOP

    -- Create and capture IDs
    INSERT INTO public.roles (tenant_id, name, description, is_system_default) VALUES
      (rec.id, 'Admin', 'Acesso total a todos os módulos do sistema.', true) RETURNING id INTO r_admin;
    INSERT INTO public.roles (tenant_id, name, description, is_system_default) VALUES
      (rec.id, 'RH', 'Gestão de recursos humanos e funcionários.', true) RETURNING id INTO r_rh;
    INSERT INTO public.roles (tenant_id, name, description, is_system_default) VALUES
      (rec.id, 'Financeiro', 'Acesso e gestão de finanças e pagamentos.', true) RETURNING id INTO r_finance;
    INSERT INTO public.roles (tenant_id, name, description, is_system_default) VALUES
      (rec.id, 'Compras', 'Gestão das compras de materiais e equipamentos.', true) RETURNING id INTO r_compras;
    INSERT INTO public.roles (tenant_id, name, description, is_system_default) VALUES
      (rec.id, 'Obras', 'Gestão da execução e custos de obras.', true) RETURNING id INTO r_obras;

    -- Link Admin
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r_admin, id FROM public.permissions;

    -- Link RH
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r_rh, id FROM public.permissions WHERE key IN ('dashboard.view', 'rh.view', 'rh.manage');

    -- Link Financeiro
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r_finance, id FROM public.permissions WHERE key IN ('dashboard.view', 'finance.view', 'finance.manage', 'relatorios.view');

    -- Link Compras
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r_compras, id FROM public.permissions WHERE key IN ('dashboard.view', 'compras.view', 'compras.manage');

    -- Link Obras
    INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r_obras, id FROM public.permissions WHERE key IN ('dashboard.view', 'obras.view', 'obras.manage', 'compras.view', 'compras.manage');

    -- Automatically assign all users in this tenant to the Admin role 
    -- (so the tenant owner gets their access back immediately)
    INSERT INTO public.user_roles (profile_id, tenant_id, role, custom_role_id)
      SELECT p.id, rec.id, 'custom', r_admin
      FROM public.profiles p
      WHERE p.tenant_id = rec.id
      ON CONFLICT DO NOTHING;

  END LOOP;
END $$;
