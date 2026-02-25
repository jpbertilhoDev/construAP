-- Migration: Fix admin user listing and add email to profiles
-- This migration:
-- 1. Adds email column to profiles (populated from auth.users on trigger)
-- 2. Updates the on_auth_user_created trigger to also store email
-- 3. Fixes RLS so admins can see all profiles in their tenant

-- Step 1: Add email column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Backfill email from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;

-- Step 3: Update the handle_new_user function to also set email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
  v_tenant_id UUID;
BEGIN
  v_company_name := NEW.raw_user_meta_data->>'company_name';

  -- If user provided a company_name, create a new tenant and assign them as founder
  IF v_company_name IS NOT NULL AND v_company_name != '' THEN
    INSERT INTO public.tenants (name)
    VALUES (v_company_name)
    RETURNING id INTO v_tenant_id;

    INSERT INTO public.profiles (id, tenant_id, name, email)
    VALUES (
      NEW.id,
      v_tenant_id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email
    );

    INSERT INTO public.user_roles (profile_id, tenant_id, role)
    VALUES (NEW.id, v_tenant_id, 'admin');
  ELSE
    -- Invited user: find tenant from invitation metadata or just create profile
    -- They'll be linked to a tenant later when an admin assigns them
    SELECT t.id INTO v_tenant_id
    FROM public.tenants t
    WHERE t.id = (NEW.raw_user_meta_data->>'tenant_id')::uuid
    LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
      INSERT INTO public.profiles (id, tenant_id, name, email)
      VALUES (
        NEW.id,
        v_tenant_id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 4: Drop existing trigger and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Step 5: Fix RLS so admins can see all profiles in their tenant
-- First, check if a "Users can view their own profile" policy exists and keep it
-- Add a new policy: "Tenant members can view each other's profiles"
DROP POLICY IF EXISTS "Profiles: tenant members can view" ON public.profiles;
CREATE POLICY "Profiles: tenant members can view"
  ON public.profiles
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- Step 6: Allow users to update their own profile
DROP POLICY IF EXISTS "Profiles: users can update own" ON public.profiles;
CREATE POLICY "Profiles: users can update own"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
