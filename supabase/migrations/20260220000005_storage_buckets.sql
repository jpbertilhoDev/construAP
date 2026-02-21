-- ============================================================
-- Migration: 20260220000005_storage_buckets
-- ConstruAP — Criação de buckets de Storage e Políticas RLS
-- ============================================================

-- Preparar bucket para anexos de custos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custos-anexos', 
  'custos-anexos', 
  false, 
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS Políticas para storage.objects
-- ============================================================


-- Política: Utilizadores autenticados podem fazer upload para o seu tenant
CREATE POLICY "Authenticated users can upload to seu tenant em custos-anexos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'custos-anexos' AND
  (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = (string_to_array(name, '/'))[1]
);

-- Política: Utilizadores autenticados podem ler ficheiros do seu tenant
CREATE POLICY "Authenticated users can read do seu tenant em custos-anexos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'custos-anexos' AND
  (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = (string_to_array(name, '/'))[1]
);

-- Política: Utilizadores autenticados podem apagar ficheiros do seu tenant
CREATE POLICY "Authenticated users can delete do seu tenant em custos-anexos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'custos-anexos' AND
  (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = (string_to_array(name, '/'))[1]
);
