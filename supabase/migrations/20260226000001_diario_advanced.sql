-- ============================================================
-- Migration: 20260226000001_diario_advanced
-- Enhances the Diário de Obra with advanced fields:
--   temperature, work shift, progress %, workers by category,
--   equipment used, structured activities.
-- Creates diario_incidents table.
-- Updates RLS to use permission-based system (has_permission).
-- ============================================================

-- ─── 1. ALTER diario_entries ────────────────────────────────

-- Drop old unique constraint (we now allow multiple shifts per day)
ALTER TABLE diario_entries
  DROP CONSTRAINT IF EXISTS diario_entries_obra_id_entry_date_key;

-- Add new columns
ALTER TABLE diario_entries
  ADD COLUMN IF NOT EXISTS temp_min NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS temp_max NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS work_shift TEXT NOT NULL DEFAULT 'Dia Inteiro',
  ADD COLUMN IF NOT EXISTS progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workers_by_category JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS equipment_used JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS structured_activities JSONB NOT NULL DEFAULT '[]'::JSONB;

-- New unique constraint includes shift
ALTER TABLE diario_entries
  ADD CONSTRAINT diario_entries_obra_date_shift_key
  UNIQUE(obra_id, entry_date, work_shift);

-- Shift must be a valid value
ALTER TABLE diario_entries
  ADD CONSTRAINT diario_entries_shift_check
  CHECK (work_shift IN ('Manhã', 'Tarde', 'Noite', 'Dia Inteiro'));

-- Progress between 0 and 100
ALTER TABLE diario_entries
  ADD CONSTRAINT diario_entries_progress_check
  CHECK (progress_pct >= 0 AND progress_pct <= 100);


-- ─── 2. CREATE diario_incidents ─────────────────────────────

CREATE TABLE IF NOT EXISTS diario_incidents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id      UUID NOT NULL REFERENCES diario_entries(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'Baixa',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT diario_incidents_severity_check
    CHECK (severity IN ('Baixa', 'Média', 'Alta', 'Crítica'))
);

CREATE INDEX IF NOT EXISTS idx_diario_incidents_entry ON diario_incidents(entry_id);
CREATE INDEX IF NOT EXISTS idx_diario_incidents_tenant ON diario_incidents(tenant_id);

ALTER TABLE diario_incidents ENABLE ROW LEVEL SECURITY;


-- ─── 3. Update diario_entries RLS (permission-based) ────────

DROP POLICY IF EXISTS "diario_read_encarregado" ON diario_entries;
DROP POLICY IF EXISTS "diario_write_encarregado" ON diario_entries;
DROP POLICY IF EXISTS "diario_update_own" ON diario_entries;

CREATE POLICY "diario_read" ON diario_entries
  FOR SELECT USING (
    tenant_id = get_tenant_id()
    AND has_permission('obras.view')
  );

CREATE POLICY "diario_insert" ON diario_entries
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id()
    AND has_permission('obras.manage')
  );

CREATE POLICY "diario_update" ON diario_entries
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND (created_by = auth.uid() OR has_permission('obras.manage'))
  );

CREATE POLICY "diario_delete" ON diario_entries
  FOR DELETE USING (
    tenant_id = get_tenant_id()
    AND has_permission('obras.manage')
  );


-- ─── 4. Update diario_photos RLS ───────────────────────────

DROP POLICY IF EXISTS "photos_read_tenant" ON diario_photos;
DROP POLICY IF EXISTS "photos_insert_encarregado" ON diario_photos;

CREATE POLICY "diario_photos_read" ON diario_photos
  FOR SELECT USING (
    tenant_id = get_tenant_id()
    AND has_permission('obras.view')
  );

CREATE POLICY "diario_photos_insert" ON diario_photos
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id()
    AND has_permission('obras.manage')
  );

CREATE POLICY "diario_photos_delete" ON diario_photos
  FOR DELETE USING (
    tenant_id = get_tenant_id()
    AND has_permission('obras.manage')
  );


-- ─── 5. diario_incidents RLS ────────────────────────────────

CREATE POLICY "incidents_read" ON diario_incidents
  FOR SELECT USING (
    tenant_id = get_tenant_id()
    AND has_permission('obras.view')
  );

CREATE POLICY "incidents_insert" ON diario_incidents
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id()
    AND has_permission('obras.manage')
  );

CREATE POLICY "incidents_update" ON diario_incidents
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND has_permission('obras.manage')
  );

CREATE POLICY "incidents_delete" ON diario_incidents
  FOR DELETE USING (
    tenant_id = get_tenant_id()
    AND has_permission('obras.manage')
  );
