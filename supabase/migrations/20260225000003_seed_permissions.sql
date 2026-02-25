-- Migration: Seed permissions and default system roles for RBAC
-- Idempotent: uses ON CONFLICT DO NOTHING

-- ─── STEP 1: Seed all module permissions ─────────────────────────────────────

INSERT INTO public.permissions (id, key, module, description) VALUES
  (gen_random_uuid(), 'dashboard.view',   'dashboard',  'Ver o painel principal'),
  (gen_random_uuid(), 'obras.view',       'obras',      'Ver obras'),
  (gen_random_uuid(), 'obras.manage',     'obras',      'Criar e editar obras'),
  (gen_random_uuid(), 'finance.view',     'finance',    'Ver módulo financeiro'),
  (gen_random_uuid(), 'finance.manage',   'finance',    'Gerir transações e contas'),
  (gen_random_uuid(), 'rh.view',          'rh',         'Ver módulo de RH'),
  (gen_random_uuid(), 'rh.manage',        'rh',         'Gerir funcionários e apontamentos'),
  (gen_random_uuid(), 'compras.view',     'compras',    'Ver módulo de compras'),
  (gen_random_uuid(), 'compras.manage',   'compras',    'Gerir pedidos e fornecedores'),
  (gen_random_uuid(), 'relatorios.view',  'relatorios', 'Ver relatórios'),
  (gen_random_uuid(), 'admin.view',       'admin',      'Ver painel de administração'),
  (gen_random_uuid(), 'admin.manage',     'admin',      'Gerir utilizadores, cargos e empresa')
ON CONFLICT (key) DO NOTHING;

-- ─── STEP 2: Create default system roles (scoped to each tenant) ─────────────
-- We create these as global templates. When a user registers a new tenant,
-- the handle_new_user trigger should create these for their tenant.
-- For existing tenants, we create them now.

DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Loop over all existing tenants
  FOR v_tenant_id IN SELECT id FROM public.tenants LOOP
    -- Admin role
    INSERT INTO public.roles (tenant_id, name, description, is_system_default)
    VALUES (v_tenant_id, 'Admin', 'Acesso total a todos os módulos', true)
    ON CONFLICT DO NOTHING;

    -- RH role
    INSERT INTO public.roles (tenant_id, name, description, is_system_default)
    VALUES (v_tenant_id, 'RH', 'Acesso ao módulo de Recursos Humanos', true)
    ON CONFLICT DO NOTHING;

    -- Financeiro role
    INSERT INTO public.roles (tenant_id, name, description, is_system_default)
    VALUES (v_tenant_id, 'Financeiro', 'Acesso ao módulo Financeiro e Relatórios', true)
    ON CONFLICT DO NOTHING;

    -- Compras role
    INSERT INTO public.roles (tenant_id, name, description, is_system_default)
    VALUES (v_tenant_id, 'Compras', 'Acesso ao módulo de Compras', true)
    ON CONFLICT DO NOTHING;

    -- Obras role
    INSERT INTO public.roles (tenant_id, name, description, is_system_default)
    VALUES (v_tenant_id, 'Obras', 'Acesso ao módulo de Obras e Compras', true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- ─── STEP 3: Assign permissions to each role ─────────────────────────────────

DO $$
DECLARE
  v_tenant_id UUID;
  v_role_id UUID;
  v_perm_id UUID;

  -- Admin permissions: everything
  admin_perms TEXT[] := ARRAY[
    'dashboard.view', 'obras.view', 'obras.manage',
    'finance.view', 'finance.manage',
    'rh.view', 'rh.manage',
    'compras.view', 'compras.manage',
    'relatorios.view', 'admin.view', 'admin.manage'
  ];

  -- RH permissions
  rh_perms TEXT[] := ARRAY['dashboard.view', 'rh.view', 'rh.manage'];

  -- Financeiro permissions
  finance_perms TEXT[] := ARRAY['dashboard.view', 'finance.view', 'finance.manage', 'relatorios.view'];

  -- Compras permissions
  compras_perms TEXT[] := ARRAY['dashboard.view', 'compras.view', 'compras.manage'];

  -- Obras permissions
  obras_perms TEXT[] := ARRAY['dashboard.view', 'obras.view', 'obras.manage', 'compras.view', 'compras.manage'];

  v_perm_key TEXT;
BEGIN
  FOR v_tenant_id IN SELECT id FROM public.tenants LOOP
    -- Admin role
    SELECT id INTO v_role_id FROM public.roles 
    WHERE tenant_id = v_tenant_id AND name = 'Admin' LIMIT 1;
    IF v_role_id IS NOT NULL THEN
      FOREACH v_perm_key IN ARRAY admin_perms LOOP
        SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_perm_key LIMIT 1;
        IF v_perm_id IS NOT NULL THEN
          INSERT INTO public.role_permissions (role_id, permission_id)
          VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;

    -- RH role
    SELECT id INTO v_role_id FROM public.roles 
    WHERE tenant_id = v_tenant_id AND name = 'RH' LIMIT 1;
    IF v_role_id IS NOT NULL THEN
      FOREACH v_perm_key IN ARRAY rh_perms LOOP
        SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_perm_key LIMIT 1;
        IF v_perm_id IS NOT NULL THEN
          INSERT INTO public.role_permissions (role_id, permission_id)
          VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;

    -- Financeiro role
    SELECT id INTO v_role_id FROM public.roles 
    WHERE tenant_id = v_tenant_id AND name = 'Financeiro' LIMIT 1;
    IF v_role_id IS NOT NULL THEN
      FOREACH v_perm_key IN ARRAY finance_perms LOOP
        SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_perm_key LIMIT 1;
        IF v_perm_id IS NOT NULL THEN
          INSERT INTO public.role_permissions (role_id, permission_id)
          VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;

    -- Compras role
    SELECT id INTO v_role_id FROM public.roles 
    WHERE tenant_id = v_tenant_id AND name = 'Compras' LIMIT 1;
    IF v_role_id IS NOT NULL THEN
      FOREACH v_perm_key IN ARRAY compras_perms LOOP
        SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_perm_key LIMIT 1;
        IF v_perm_id IS NOT NULL THEN
          INSERT INTO public.role_permissions (role_id, permission_id)
          VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;

    -- Obras role
    SELECT id INTO v_role_id FROM public.roles 
    WHERE tenant_id = v_tenant_id AND name = 'Obras' LIMIT 1;
    IF v_role_id IS NOT NULL THEN
      FOREACH v_perm_key IN ARRAY obras_perms LOOP
        SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_perm_key LIMIT 1;
        IF v_perm_id IS NOT NULL THEN
          INSERT INTO public.role_permissions (role_id, permission_id)
          VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ─── STEP 4: Add unique constraint on permissions.key if missing ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'permissions_key_unique' AND conrelid = 'public.permissions'::regclass
  ) THEN
    ALTER TABLE public.permissions ADD CONSTRAINT permissions_key_unique UNIQUE (key);
  END IF;
END;
$$;

-- ─── STEP 5: Ensure the 'Admin do Tenant' role gets all admin permissions ─────
-- (it was the original system role before we added the new ones)
DO $$
DECLARE
  v_tenant_id UUID;
  v_role_id UUID;
  v_perm_id UUID;
  v_perm_key TEXT;
  all_perms TEXT[] := ARRAY[
    'dashboard.view', 'obras.view', 'obras.manage',
    'finance.view', 'finance.manage',
    'rh.view', 'rh.manage',
    'compras.view', 'compras.manage',
    'relatorios.view', 'admin.view', 'admin.manage'
  ];
BEGIN
  FOR v_tenant_id IN SELECT id FROM public.tenants LOOP
    -- Find "Admin do Tenant" role (original system default)
    SELECT id INTO v_role_id FROM public.roles 
    WHERE tenant_id = v_tenant_id AND name = 'Admin do Tenant' LIMIT 1;
    IF v_role_id IS NOT NULL THEN
      FOREACH v_perm_key IN ARRAY all_perms LOOP
        SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_perm_key LIMIT 1;
        IF v_perm_id IS NOT NULL THEN
          INSERT INTO public.role_permissions (role_id, permission_id)
          VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;
