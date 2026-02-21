-- ============================================================
-- Migration: 20260220000004_fix_handle_new_user
-- ConstruAP — Corrige trigger de criação de utilizador
-- 
-- PROBLEMA: A versão anterior fazia UPDATE auth.users dentro do
-- trigger AFTER INSERT ON auth.users, o que pode causar problemas
-- de recursão ou permissões no Supabase.
--
-- SOLUÇÃO: Usar auth.uid() diretamente nas RLS policies e 
-- guardar tenant_id em app_metadata via função SECURITY DEFINER
-- sem UPDATE recursivo. O tenant_id é lido da tabela profiles
-- via uma função estável.
-- ============================================================

-- Drop and recreate the handle_new_user function (safer version)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id  UUID;
  v_name       TEXT;
  v_is_new     BOOLEAN := FALSE;
BEGIN
  -- Extract metadata from signup request
  v_name := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- If tenant_id in app_metadata = invited user joining existing tenant
  v_tenant_id := (NEW.raw_app_meta_data ->> 'tenant_id')::UUID;

  -- If no tenant_id = new company signup, create tenant first
  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, email)
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'company_name', split_part(NEW.email, '@', 1)),
      NEW.email
    )
    RETURNING id INTO v_tenant_id;
    v_is_new := TRUE;
  END IF;

  -- Create profile (link to auth.users via id)
  INSERT INTO public.profiles (id, tenant_id, name, consent_at)
  VALUES (NEW.id, v_tenant_id, v_name, now())
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        updated_at = now();

  -- Assign role: admin if new company owner, leitura if invited
  INSERT INTO public.user_roles (tenant_id, profile_id, role)
  VALUES (
    v_tenant_id,
    NEW.id,
    CASE WHEN v_is_new THEN 'admin'::user_role ELSE 'leitura'::user_role END
  )
  ON CONFLICT (profile_id, obra_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- IMPORTANT: Because we cannot UPDATE auth.users from within
-- the trigger (circular), the tenant_id JWT claim is instead
-- fetched at query time via a SECURITY DEFINER function.
-- Update the get_tenant_id() function to read from profiles table
-- as fallback when app_metadata is not yet set.
-- ============================================================

-- Drop and recreate get_tenant_id to be resilient
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- First try JWT app_metadata (set by invite flow)
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
  
  -- Fallback: read from profiles table (works for new signups)
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN v_tenant_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(user_role, UUID) TO authenticated;
