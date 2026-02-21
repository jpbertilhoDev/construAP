-- ============================================================
-- Migration: 20260220000008_documents_bucket
-- ConstruAP — Criação de bucket de Storage para Documentos de Obras
-- ============================================================

-- Preparar bucket para documentos gerais
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos', 
  'documentos', 
  false, 
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS Políticas para storage.objects (Bucket documentos)
-- ============================================================

-- Política: Utilizadores autenticados podem fazer upload para o seu tenant
CREATE POLICY "Authenticated users can upload to seu tenant em documentos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos' AND
  (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = (string_to_array(name, '/'))[1]
);

-- Política: Utilizadores autenticados podem ler ficheiros do seu tenant
CREATE POLICY "Authenticated users can read do seu tenant em documentos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos' AND
  (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = (string_to_array(name, '/'))[1]
);

-- Política: Utilizadores autenticados podem apagar ficheiros do seu tenant
CREATE POLICY "Authenticated users can delete do seu tenant em documentos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos' AND
  (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = (string_to_array(name, '/'))[1]
);
