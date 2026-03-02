-- ============================================================================
-- Migration: Create RBAC tables (roles, permissions, role_permissions)
-- Date: 2026-02-28
--
-- These tables were originally created via the Supabase Dashboard and are
-- referenced by multiple migrations (20260225000003, 20260225000004,
-- 20260225000005, 20260225000011, 20260228000001) but were never codified
-- in a migration file. This migration uses IF NOT EXISTS to be safe for
-- databases where they already exist.
--
-- Also adds the custom_role_id column to user_roles, which is used by
-- handle_new_user() and has_permission() but was never added via ALTER TABLE.
-- ============================================================================

-- ─── 1. PERMISSIONS TABLE (global reference data, no tenant_id) ────────────

CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL,
  module      TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraint on key if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'permissions_key_unique'
      AND conrelid = 'public.permissions'::regclass
  ) THEN
    -- Check for any other unique constraint on key
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conrelid = 'public.permissions'::regclass
        AND c.contype = 'u'
        AND a.attname = 'key'
    ) THEN
      ALTER TABLE public.permissions ADD CONSTRAINT permissions_key_unique UNIQUE (key);
    END IF;
  END IF;
END;
$$;

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can read permissions (reference data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'permissions' AND policyname = 'permissions_read_all'
  ) THEN
    CREATE POLICY "permissions_read_all" ON public.permissions
      FOR SELECT USING (true);
  END IF;
END;
$$;


-- ─── 2. ROLES TABLE (scoped per tenant) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one role name per tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'roles_tenant_id_name_key'
      AND conrelid = 'public.roles'::regclass
  ) THEN
    -- Check for any unique constraint on (tenant_id, name)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.roles'::regclass
        AND contype = 'u'
        AND array_length(conkey, 1) = 2
    ) THEN
      ALTER TABLE public.roles ADD CONSTRAINT roles_tenant_id_name_key UNIQUE (tenant_id, name);
    END IF;
  END IF;
END;
$$;

-- Index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON public.roles(tenant_id);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Read: own tenant only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'roles' AND policyname = 'roles_read_own_tenant'
  ) THEN
    CREATE POLICY "roles_read_own_tenant" ON public.roles
      FOR SELECT USING (tenant_id = get_tenant_id());
  END IF;
END;
$$;

-- Insert: admin.manage permission required
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'roles' AND policyname = 'roles_insert_admin'
  ) THEN
    CREATE POLICY "roles_insert_admin" ON public.roles
      FOR INSERT WITH CHECK (
        tenant_id = get_tenant_id()
        AND has_permission('admin.manage')
      );
  END IF;
END;
$$;

-- Update: admin.manage permission, own tenant, cannot modify system defaults
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'roles' AND policyname = 'roles_update_admin'
  ) THEN
    CREATE POLICY "roles_update_admin" ON public.roles
      FOR UPDATE USING (
        tenant_id = get_tenant_id()
        AND has_permission('admin.manage')
      );
  END IF;
END;
$$;

-- Delete: admin.manage, own tenant, non-system roles only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'roles' AND policyname = 'roles_delete_admin'
  ) THEN
    CREATE POLICY "roles_delete_admin" ON public.roles
      FOR DELETE USING (
        tenant_id = get_tenant_id()
        AND has_permission('admin.manage')
        AND is_system_default = false
      );
  END IF;
END;
$$;


-- ─── 3. ROLE_PERMISSIONS TABLE (junction: which role has which permissions) ─

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Index for permission lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users can read role_permissions for their tenant's roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'role_permissions' AND policyname = 'rp_read_own_tenant'
  ) THEN
    CREATE POLICY "rp_read_own_tenant" ON public.role_permissions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.roles r
          WHERE r.id = role_id AND r.tenant_id = get_tenant_id()
        )
      );
  END IF;
END;
$$;

-- Insert: admin.manage only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'role_permissions' AND policyname = 'rp_insert_admin'
  ) THEN
    CREATE POLICY "rp_insert_admin" ON public.role_permissions
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.roles r
          WHERE r.id = role_id AND r.tenant_id = get_tenant_id()
        )
        AND has_permission('admin.manage')
      );
  END IF;
END;
$$;

-- Delete: admin.manage only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'role_permissions' AND policyname = 'rp_delete_admin'
  ) THEN
    CREATE POLICY "rp_delete_admin" ON public.role_permissions
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.roles r
          WHERE r.id = role_id AND r.tenant_id = get_tenant_id()
        )
        AND has_permission('admin.manage')
      );
  END IF;
END;
$$;


-- ─── 4. ADD custom_role_id TO user_roles ───────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND column_name = 'custom_role_id'
  ) THEN
    ALTER TABLE public.user_roles
      ADD COLUMN custom_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- Index for custom_role_id lookups (used by has_permission JOIN)
CREATE INDEX IF NOT EXISTS idx_user_roles_custom_role ON public.user_roles(custom_role_id)
  WHERE custom_role_id IS NOT NULL;


-- ─── 5. GRANTS ─────────────────────────────────────────────────────────────

GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT INSERT, DELETE ON public.role_permissions TO authenticated;
