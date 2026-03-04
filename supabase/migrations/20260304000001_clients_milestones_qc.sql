-- ============================================================================
-- Migration: Clients, Obra Milestones & QC (Quality Control)
-- Date: 2026-03-04
-- Purpose: Add client management, obra milestones calendar, and QC checklists
-- ============================================================================

-- ─── 1. CLIENTS TABLE ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  nif         TEXT,
  email       TEXT,
  telefone    TEXT,
  morada      TEXT,
  cidade      TEXT,
  codigo_postal TEXT,
  notas       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant
  ON public.clients (tenant_id);

-- RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_tenant_isolation" ON public.clients;
CREATE POLICY "clients_tenant_isolation"
  ON public.clients
  FOR ALL
  USING (tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id());

-- ─── 2. OBRA MILESTONES TABLE ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.obra_milestones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  obra_id     UUID        NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  date        DATE        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'Marco', -- 'Início', 'Fim Previsto', 'Marco', 'Entrega', 'Inspeção'
  completed   BOOLEAN     NOT NULL DEFAULT false,
  notas       TEXT,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obra_milestones_tenant
  ON public.obra_milestones (tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_obra_milestones_obra
  ON public.obra_milestones (obra_id);

-- RLS
ALTER TABLE public.obra_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obra_milestones_tenant_isolation" ON public.obra_milestones;
CREATE POLICY "obra_milestones_tenant_isolation"
  ON public.obra_milestones
  FOR ALL
  USING (tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id());

-- ─── 3. QC CHECKLISTS TABLE ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.qc_checklists (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  obra_id     UUID        NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  fase        TEXT        NOT NULL, -- 'Fundações', 'Estrutura', 'Cobertura', 'Acabamentos', 'Final'
  title       TEXT        NOT NULL,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_checklists_obra
  ON public.qc_checklists (obra_id);

ALTER TABLE public.qc_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qc_checklists_tenant_isolation" ON public.qc_checklists;
CREATE POLICY "qc_checklists_tenant_isolation"
  ON public.qc_checklists
  FOR ALL
  USING (tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id());

-- ─── 4. QC ITEMS TABLE ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.qc_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  checklist_id    UUID        NOT NULL REFERENCES public.qc_checklists(id) ON DELETE CASCADE,
  description     TEXT        NOT NULL,
  conforme        BOOLEAN,    -- NULL = por verificar; true = OK; false = não-conforme
  observacoes     TEXT,
  verificado_por  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  verificado_em   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_items_checklist
  ON public.qc_items (checklist_id);

ALTER TABLE public.qc_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qc_items_tenant_isolation" ON public.qc_items;
CREATE POLICY "qc_items_tenant_isolation"
  ON public.qc_items
  FOR ALL
  USING (tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id());

-- ─── 5. QC NON-CONFORMIDADES TABLE ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.qc_non_conformidades (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  obra_id         UUID        NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  checklist_id    UUID        REFERENCES public.qc_checklists(id) ON DELETE SET NULL,
  descricao       TEXT        NOT NULL,
  gravidade       TEXT        NOT NULL DEFAULT 'Média',    -- 'Baixa', 'Média', 'Alta', 'Crítica'
  estado          TEXT        NOT NULL DEFAULT 'Aberta',   -- 'Aberta', 'Em Resolução', 'Encerrada'
  acao_corretiva  TEXT,
  reportado_por   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolvido_por   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_nc_obra
  ON public.qc_non_conformidades (obra_id);

ALTER TABLE public.qc_non_conformidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qc_nc_tenant_isolation" ON public.qc_non_conformidades;
CREATE POLICY "qc_nc_tenant_isolation"
  ON public.qc_non_conformidades
  FOR ALL
  USING (tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id());

-- ─── 6. UPDATED_AT TRIGGERS ──────────────────────────────────────────────────

-- Reuse existing trigger function if available
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_clients_updated_at') THEN
    CREATE TRIGGER set_clients_updated_at
      BEFORE UPDATE ON public.clients
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;
