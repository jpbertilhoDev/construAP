-- ============================================================
-- Migration: 20260220000011_imobiliario_v1
-- ConstruAP — Módulo Imobiliário V1
-- Expande as tabelas stub empreendimentos/fracoes e adiciona
-- blocos, tipologias, reservas, histórico de preços e documentos
-- ============================================================

-- ─── Expand empreendimentos ─────────────────────────────────
ALTER TABLE empreendimentos
  ADD COLUMN IF NOT EXISTS descricao       TEXT,
  ADD COLUMN IF NOT EXISTS concelho        TEXT,
  ADD COLUMN IF NOT EXISTS distrito        TEXT,
  ADD COLUMN IF NOT EXISTS promotor        TEXT,
  ADD COLUMN IF NOT EXISTS arquiteto       TEXT,
  ADD COLUMN IF NOT EXISTS ano_construcao  INT,
  ADD COLUMN IF NOT EXISTS estado          TEXT NOT NULL DEFAULT 'Em Comercialização'
                                           CHECK (estado IN ('Em Construção','Em Comercialização','Concluído','Suspenso','Arquivado')),
  ADD COLUMN IF NOT EXISTS dias_reserva    INT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS archived_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES auth.users(id);

-- ─── Blocos / Torres ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  descricao           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empreendimento_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_blocos_empreend ON blocos(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_blocos_tenant ON blocos(tenant_id);

-- ─── Tipologias ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipologias (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  tipo                TEXT NOT NULL
                      CHECK (tipo IN ('T0','T1','T2','T3','T4+','Garagem','Arrecadação','Comercial','Lote','Outro')),
  designacao          TEXT,
  area_bruta_m2       NUMERIC(8,2),
  area_util_m2        NUMERIC(8,2),
  quartos             INT,
  casas_banho         INT,
  notas               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tipologias_empreend ON tipologias(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_tipologias_tenant ON tipologias(tenant_id);

-- ─── Expand fracoes ─────────────────────────────────────────
-- The existing table has: id, empreendimento_id, tenant_id, ref, type, floor, area_m2, orientation, status, sale_price, client_id, contract_date, notes, created_at, updated_at
-- We extend it with richer fields
ALTER TABLE fracoes
  ADD COLUMN IF NOT EXISTS bloco_id          UUID REFERENCES blocos(id),
  ADD COLUMN IF NOT EXISTS tipologia_id      UUID REFERENCES tipologias(id),
  ADD COLUMN IF NOT EXISTS designacao        TEXT,           -- friendly code ex: A1.02 (falls back to ref)
  ADD COLUMN IF NOT EXISTS piso              INT,            -- alias for floor (floor is reserved word)
  ADD COLUMN IF NOT EXISTS area_bruta_m2     NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS area_util_m2      NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS preco_atual       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS estado_comercial  TEXT NOT NULL DEFAULT 'Disponível'
                                             CHECK (estado_comercial IN ('Disponível','Reservado','Vendido','Bloqueado')),
  ADD COLUMN IF NOT EXISTS motivo_bloqueio   TEXT,
  ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES auth.users(id);

-- Backfill designacao from ref
UPDATE fracoes SET designacao = ref WHERE designacao IS NULL;
-- Backfill preco_atual from sale_price
UPDATE fracoes SET preco_atual = COALESCE(sale_price, 0) WHERE preco_atual IS NULL;

CREATE INDEX IF NOT EXISTS idx_fracoes_bloco ON fracoes(bloco_id);
CREATE INDEX IF NOT EXISTS idx_fracoes_estado_comercial ON fracoes(tenant_id, estado_comercial);

-- ─── Histórico de Preços ────────────────────────────────────
CREATE TABLE IF NOT EXISTS fracao_preco_historico (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fracao_id       UUID NOT NULL REFERENCES fracoes(id) ON DELETE CASCADE,
  preco_anterior  NUMERIC(12,2) NOT NULL,
  preco_novo      NUMERIC(12,2) NOT NULL,
  delta_pct       NUMERIC(6,2),
  motivo          TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preco_hist_fracao ON fracao_preco_historico(fracao_id);
CREATE INDEX IF NOT EXISTS idx_preco_hist_tenant ON fracao_preco_historico(tenant_id);

-- ─── Reservas ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fracao_id           UUID NOT NULL REFERENCES fracoes(id) ON DELETE CASCADE,
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id),
  cliente_nome        TEXT NOT NULL,
  cliente_email       TEXT,
  cliente_telefone    TEXT,
  cliente_nif         TEXT,
  valor_sinal         NUMERIC(12,2),
  preco_venda         NUMERIC(12,2),
  data_inicio         DATE NOT NULL DEFAULT CURRENT_DATE,
  data_expiracao      DATE NOT NULL,
  extensoes_count     INT NOT NULL DEFAULT 0,
  estado              TEXT NOT NULL DEFAULT 'Ativa'
                      CHECK (estado IN ('Ativa','Expirada','Cancelada','Confirmada')),
  motivo_cancelamento TEXT,
  notas               TEXT,
  created_by          UUID NOT NULL REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservas_fracao ON reservas(fracao_id);
CREATE INDEX IF NOT EXISTS idx_reservas_tenant ON reservas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservas_expiracao ON reservas(data_expiracao) WHERE estado = 'Ativa';
CREATE INDEX IF NOT EXISTS idx_reservas_empreend ON reservas(empreendimento_id);

CREATE TRIGGER trg_reservas_updated_at
  BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Documentos Imobiliários ─────────────────────────────────
CREATE TABLE IF NOT EXISTS imob_documentos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empreendimento_id   UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  fracao_id           UUID REFERENCES fracoes(id),
  nome_ficheiro       TEXT NOT NULL,
  storage_path        TEXT NOT NULL,
  tipo_documento      TEXT NOT NULL DEFAULT 'Outro'
                      CHECK (tipo_documento IN ('Planta','Certificado','Caderneta','Regulamento','Contrato','Foto','Outro')),
  descricao           TEXT,
  tamanho_bytes       BIGINT,
  mime_type           TEXT,
  version             INT NOT NULL DEFAULT 1,
  deleted_at          TIMESTAMPTZ,
  created_by          UUID NOT NULL REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imob_docs_empreend ON imob_documentos(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_imob_docs_fracao ON imob_documentos(fracao_id);
CREATE INDEX IF NOT EXISTS idx_imob_docs_tenant ON imob_documentos(tenant_id);

-- ─── RLS ────────────────────────────────────────────────────

-- blocos
ALTER TABLE blocos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocos_read_tenant" ON blocos
  FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "blocos_write_gestor" ON blocos
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('gestor'));
CREATE POLICY "blocos_update_gestor" ON blocos
  FOR UPDATE USING (tenant_id = get_tenant_id() AND has_role('gestor'));
CREATE POLICY "blocos_delete_admin" ON blocos
  FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('admin'));

-- tipologias
ALTER TABLE tipologias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tipologias_read_tenant" ON tipologias
  FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "tipologias_write_gestor" ON tipologias
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('gestor'));
CREATE POLICY "tipologias_update_gestor" ON tipologias
  FOR UPDATE USING (tenant_id = get_tenant_id() AND has_role('gestor'));
CREATE POLICY "tipologias_delete_gestor" ON tipologias
  FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('gestor'));

-- fracao_preco_historico (append-only for non-admins)
ALTER TABLE fracao_preco_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preco_hist_read_gestor" ON fracao_preco_historico
  FOR SELECT USING (tenant_id = get_tenant_id() AND has_role('gestor'));
CREATE POLICY "preco_hist_insert_gestor" ON fracao_preco_historico
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('gestor'));
-- No UPDATE or DELETE — append-only

-- reservas
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservas_read_leitura" ON reservas
  FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "reservas_insert_comercial" ON reservas
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('compras'));
CREATE POLICY "reservas_update_gestor" ON reservas
  FOR UPDATE USING (tenant_id = get_tenant_id() AND has_role('compras'));
CREATE POLICY "reservas_delete_admin" ON reservas
  FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('admin'));

-- imob_documentos
ALTER TABLE imob_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imob_docs_read_tenant" ON imob_documentos
  FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "imob_docs_insert_gestor" ON imob_documentos
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role('gestor'));
CREATE POLICY "imob_docs_update_gestor" ON imob_documentos
  FOR UPDATE USING (tenant_id = get_tenant_id() AND has_role('gestor'));
CREATE POLICY "imob_docs_delete_gestor" ON imob_documentos
  FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('gestor'));

-- Also add RLS to existing empreendimentos policies if not already done
-- (migration 002 already has empreen_read_tenant, empreen_write_gestor)
-- Adding missing UPDATE and DELETE if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'empreendimentos' AND policyname = 'empreen_update_gestor'
  ) THEN
    EXECUTE 'CREATE POLICY "empreen_update_gestor" ON empreendimentos FOR UPDATE USING (tenant_id = get_tenant_id() AND has_role(''gestor''))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'empreendimentos' AND policyname = 'empreen_delete_admin'
  ) THEN
    EXECUTE 'CREATE POLICY "empreen_delete_admin" ON empreendimentos FOR DELETE USING (tenant_id = get_tenant_id() AND has_role(''admin''))';
  END IF;
END $$;

-- Fracoes: add missing policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fracoes' AND policyname = 'fracoes_insert_gestor'
  ) THEN
    EXECUTE 'CREATE POLICY "fracoes_insert_gestor" ON fracoes FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND has_role(''gestor''))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fracoes' AND policyname = 'fracoes_update_gestor'
  ) THEN
    EXECUTE 'CREATE POLICY "fracoes_update_gestor" ON fracoes FOR UPDATE USING (tenant_id = get_tenant_id() AND has_role(''gestor''))';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fracoes' AND policyname = 'fracoes_delete_admin'
  ) THEN
    EXECUTE 'CREATE POLICY "fracoes_delete_admin" ON fracoes FOR DELETE USING (tenant_id = get_tenant_id() AND has_role(''admin''))';
  END IF;
END $$;
