-- Migration: Fix recursive RLS policy on profiles
-- Replaces the self-referencing SELECT policy with a SECURITY DEFINER function

-- Drop the recursive policy if it exists
DROP POLICY IF EXISTS "Profiles: tenant members can view" ON public.profiles;

-- Create a SECURITY DEFINER function to safely retrieve tenant_id for the current user
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Create the final non-recursive SELECT policy
DROP POLICY IF EXISTS "Profiles: view same tenant" ON public.profiles;
CREATE POLICY "Profiles: view same tenant"
  ON public.profiles
  FOR SELECT
  USING (
    tenant_id = public.get_my_tenant_id()
  );
