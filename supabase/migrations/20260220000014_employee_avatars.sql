-- ============================================================
-- Migration: 20260220000014_employee_avatars
-- ConstruAP — Adicionar avatares aos Funcionários
-- ============================================================

-- Adicionar coluna à tabela employees
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Preparar bucket para avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatares', 
  'avatares', 
  true, -- Público para facilitar exibição nas listagens
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS Políticas para storage.objects (Bucket avatares)
-- ============================================================

-- Remover políticas existentes caso a migração seja recarregada
DROP POLICY IF EXISTS "Authenticated users can upload to seu tenant em avatares" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update seu tenant em avatares" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete do seu tenant em avatares" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatares" ON storage.objects;

-- Política: Utilizadores autenticados podem fazer upload para o seu tenant
CREATE POLICY "Authenticated users can upload to seu tenant em avatares"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatares' AND
  public.get_tenant_id()::text = (string_to_array(name, '/'))[1]
);

-- Política: Utilizadores autenticados podem alterar os seus ficheiros (caso o nome passe a existir)
CREATE POLICY "Authenticated users can update seu tenant em avatares"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatares' AND
  public.get_tenant_id()::text = (string_to_array(name, '/'))[1]
);

-- Política: Utilizadores autenticados podem apagar os seus ficheiros
CREATE POLICY "Authenticated users can delete do seu tenant em avatares"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatares' AND
  public.get_tenant_id()::text = (string_to_array(name, '/'))[1]
);

-- Política: Leitura pública, pois o bucket é public
CREATE POLICY "Public can read avatares"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatares');
