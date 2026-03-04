-- ============================================================================
-- Migration: Obra Comments (Chat Collaboration)
-- Date: 2026-03-04
-- Purpose: Add ability for users to comment and chat within specific obras
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.obra_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  obra_id     UUID        NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for quick fetching of comments per obra
CREATE INDEX IF NOT EXISTS idx_obra_comments_obra 
  ON public.obra_comments (obra_id);

CREATE INDEX IF NOT EXISTS idx_obra_comments_tenant_obra_created
  ON public.obra_comments (tenant_id, obra_id, created_at);

-- RLS Policies
ALTER TABLE public.obra_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obra_comments_tenant_isolation" ON public.obra_comments;
CREATE POLICY "obra_comments_tenant_isolation"
  ON public.obra_comments
  FOR ALL
  USING (tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id());
