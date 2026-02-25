-- Migration: Replace get_tenant_id() to use SECURITY DEFINER
--
-- PROBLEM: get_tenant_id() reads tenant_id from JWT app_metadata,
-- but app_metadata.tenant_id is not always set (especially for existing users).
-- ALL RLS policies in the system depend on this function, so nothing works.
--
-- FIX: Replace get_tenant_id() to read directly from the profiles table
-- using SECURITY DEFINER (bypasses RLS). This is the same approach as
-- get_my_tenant_id() but applied to the function that ALL policies use.

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;
