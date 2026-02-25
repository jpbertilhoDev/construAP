-- Migration: Fix handle_new_user to set app_metadata.tenant_id
-- This is critical: all RLS policies use get_tenant_id() which reads
-- tenant_id from the JWT's app_metadata. Without this, users can't access any data.

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

    -- Give the owner the Admin role (the pre-seeded system one)
    INSERT INTO public.user_roles (profile_id, tenant_id, role, custom_role_id)
    SELECT NEW.id, v_tenant_id, 'custom', r.id
    FROM public.roles r
    WHERE r.tenant_id = v_tenant_id AND r.name = 'Admin'
    LIMIT 1;

    -- Fallback: if Admin role doesn't exist yet, use 'admin' string role
    IF NOT FOUND THEN
      INSERT INTO public.user_roles (profile_id, tenant_id, role)
      VALUES (NEW.id, v_tenant_id, 'admin');
    END IF;

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
    IF NEW.raw_user_meta_data->>'role_id' IS NOT NULL THEN
      v_role_id := (NEW.raw_user_meta_data->>'role_id')::uuid;

      INSERT INTO public.user_roles (profile_id, tenant_id, role, custom_role_id)
      VALUES (NEW.id, v_tenant_id, 'custom', v_role_id)
      ON CONFLICT DO NOTHING;
    END IF;

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
