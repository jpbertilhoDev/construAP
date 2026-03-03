-- Fix the handle_new_user trigger to handle tenant_usage insertion safely

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

    -- This insert triggers trg_profiles_usage_count -> updates tenant_usage user_count to 1
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

    -- ── Seed subscription (14-day trial on Starter) ──
    INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, trial_ends_at, current_period_end)
    VALUES (v_tenant_id, 'starter', 'trialing', now() + interval '14 days', now() + interval '14 days');

    -- ── Initialize usage counters safely ──
    -- The trg_profiles_usage_count already inserted a row if handling profiles above.
    -- We use ON CONFLICT DO NOTHING to ensure it doesn't crash if the trigger created it first.
    INSERT INTO public.tenant_usage (tenant_id, user_count, obra_count, employee_count, storage_bytes)
    VALUES (v_tenant_id, 1, 0, 0, 0)
    ON CONFLICT (tenant_id) DO NOTHING;

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
