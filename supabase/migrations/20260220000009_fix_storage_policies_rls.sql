-- ============================================================
-- Migration: 20260220000009_fix_storage_policies_rls
-- ConstruAP — Atualiza as RLS do Storage para usar o fallback function
-- get_tenant_id() em vez de ler cegamente o JWT (pois utilizadores recentes
-- podem não ter o app_metadata imediatamente na sessão ativa).
-- ============================================================

-- ============================================================
-- Fix 'documentos' bucket policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload to seu tenant em documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read do seu tenant em documentos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete do seu tenant em documentos" ON storage.objects;

CREATE POLICY "Authenticated users can upload to seu tenant em documentos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos' AND
  public.get_tenant_id()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Authenticated users can read do seu tenant em documentos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos' AND
  public.get_tenant_id()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Authenticated users can delete do seu tenant em documentos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos' AND
  public.get_tenant_id()::text = (string_to_array(name, '/'))[1]
);

-- ============================================================
-- Fix 'custos-anexos' bucket policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload to seu tenant em custos-anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read do seu tenant em custos-anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete do seu tenant em custos-anexos" ON storage.objects;

CREATE POLICY "Authenticated users can upload to seu tenant em custos-anexos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'custos-anexos' AND
  public.get_tenant_id()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Authenticated users can read do seu tenant em custos-anexos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'custos-anexos' AND
  public.get_tenant_id()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Authenticated users can delete do seu tenant em custos-anexos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'custos-anexos' AND
  public.get_tenant_id()::text = (string_to_array(name, '/'))[1]
);
