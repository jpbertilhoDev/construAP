-- ============================================================
-- Migration: 20260220000013_materiais_v1
-- ConstruAP — Módulo Materiais, Fornecedores e Compras V1
-- ============================================================

-- Remover tabelas placeholder do schema inicial
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TYPE IF EXISTS purchase_order_status CASCADE;

-- ─── Expandir suppliers existente ────────────────────────────

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS morada          TEXT,
  ADD COLUMN IF NOT EXISTS tipo            TEXT NOT NULL DEFAULT 'ambos'
                                           CHECK (tipo IN ('material','servico','ambos')),
  ADD COLUMN IF NOT EXISTS condicoes_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS estado          TEXT NOT NULL DEFAULT 'Ativo'
                                           CHECK (estado IN ('Ativo','Inativo')),
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── Catálogo de Materiais ────────────────────────────────────

CREATE TABLE materials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo          TEXT NOT NULL,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  categoria       TEXT,
  unidade         TEXT NOT NULL DEFAULT 'un'
                  CHECK (unidade IN ('un','kg','m','m2','m3','L','ROL','CX','hr','outro')),
  iva_pct         NUMERIC(4,2) NOT NULL DEFAULT 23.00,
  custo_medio     NUMERIC(10,4) NOT NULL DEFAULT 0,
  estoque_atual   NUMERIC(10,3) NOT NULL DEFAULT 0,
  estoque_minimo  NUMERIC(10,3) NOT NULL DEFAULT 0,
  tipo            TEXT NOT NULL DEFAULT 'material'
                  CHECK (tipo IN ('material','servico')),
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, codigo)
);

CREATE INDEX idx_materials_tenant ON materials(tenant_id);
CREATE INDEX idx_materials_categoria ON materials(tenant_id, categoria);
CREATE INDEX idx_materials_tipo ON materials(tipo);

-- ─── Pedidos de Compra (PO) ───────────────────────────────────

CREATE TABLE purchase_orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id           UUID NOT NULL REFERENCES suppliers(id),
  obra_id               UUID NOT NULL REFERENCES obras(id),
  numero                TEXT NOT NULL,
  estado                TEXT NOT NULL DEFAULT 'Rascunho'
                        CHECK (estado IN ('Rascunho','Submetido','Aprovado','Em Curso','Parcialmente Recebido','Recebido','Cancelado')),
  data_pedido           DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista DATE,
  total_sem_iva         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_com_iva         NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas                 TEXT,
  motivo_cancelamento   TEXT,
  aprovado_por          UUID REFERENCES profiles(id),
  aprovado_em           TIMESTAMPTZ,
  created_by            UUID NOT NULL REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, numero)
);

CREATE INDEX idx_po_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_po_obra ON purchase_orders(obra_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_estado ON purchase_orders(estado);
CREATE INDEX idx_po_data ON purchase_orders(data_pedido);

-- ─── Linhas do PO ────────────────────────────────────────────

CREATE TABLE purchase_order_lines (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_id                 UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id           UUID NOT NULL REFERENCES materials(id),
  descricao             TEXT,                 -- override ou serviço personalizado
  quantidade            NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
  preco_unitario        NUMERIC(10,4) NOT NULL CHECK (preco_unitario >= 0),
  iva_pct               NUMERIC(4,2) NOT NULL DEFAULT 23.00,
  total_sem_iva         NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_entrega_prevista DATE,
  qtd_recebida          NUMERIC(10,3) NOT NULL DEFAULT 0,
  notas                 TEXT
);

CREATE INDEX idx_pol_po ON purchase_order_lines(po_id);
CREATE INDEX idx_pol_material ON purchase_order_lines(material_id);

-- ─── Receções / GRN ──────────────────────────────────────────

CREATE TABLE goods_receipts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_id           UUID NOT NULL REFERENCES purchase_orders(id),
  obra_id         UUID NOT NULL REFERENCES obras(id),
  data_recepcao   DATE NOT NULL DEFAULT CURRENT_DATE,
  tem_divergencia BOOLEAN NOT NULL DEFAULT false,
  notas           TEXT,
  cost_entry_id   UUID REFERENCES costs(id),  -- lançamento no Financeiro
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grn_po ON goods_receipts(po_id);
CREATE INDEX idx_grn_obra ON goods_receipts(obra_id);
CREATE INDEX idx_grn_tenant ON goods_receipts(tenant_id);

-- ─── Linhas de GRN ───────────────────────────────────────────

CREATE TABLE goods_receipt_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grn_id          UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_line_id      UUID NOT NULL REFERENCES purchase_order_lines(id),
  material_id     UUID NOT NULL REFERENCES materials(id),
  qtd_recebida    NUMERIC(10,3) NOT NULL CHECK (qtd_recebida >= 0),
  preco_unitario  NUMERIC(10,4),       -- pode diferir do PO (divergência de preço)
  divergencia     BOOLEAN NOT NULL DEFAULT false,
  divergencia_nota TEXT
);

CREATE INDEX idx_grl_grn ON goods_receipt_lines(grn_id);
CREATE INDEX idx_grl_material ON goods_receipt_lines(material_id);

-- ─── Consumo por Obra ─────────────────────────────────────────

CREATE TABLE material_consumptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  obra_id     UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id),
  quantidade  NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
  custo_unit  NUMERIC(10,4),
  custo_total NUMERIC(12,2),
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao  TEXT,
  cost_entry_id UUID REFERENCES costs(id),  -- lançamento no Financeiro
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consumptions_obra ON material_consumptions(obra_id);
CREATE INDEX idx_consumptions_material ON material_consumptions(material_id);
CREATE INDEX idx_consumptions_tenant ON material_consumptions(tenant_id);
CREATE INDEX idx_consumptions_data ON material_consumptions(data);

-- ─── Movimentos de Stock ──────────────────────────────────────

CREATE TABLE stock_movements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  material_id  UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade   NUMERIC(10,3) NOT NULL,
  referencia   TEXT,    -- grn_id, consumo_id, etc.
  obra_id      UUID REFERENCES obras(id),
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_material ON stock_movements(material_id);
CREATE INDEX idx_stock_tenant ON stock_movements(tenant_id);
CREATE INDEX idx_stock_obra ON stock_movements(obra_id);

-- ─── Trigger: atualizar custo_medio e estoque_atual após GRN ─

CREATE OR REPLACE FUNCTION update_material_stock_on_grn()
RETURNS TRIGGER AS $$
DECLARE
  cur_stock   NUMERIC;
  cur_custo   NUMERIC;
  cur_total   NUMERIC;
  new_total   NUMERIC;
  preco_unit  NUMERIC;
BEGIN
  -- Obter preco_unitario (do GRN line ou do PO line)
  preco_unit := COALESCE(NEW.preco_unitario, (
    SELECT preco_unitario FROM purchase_order_lines WHERE id = NEW.po_line_id
  ));

  -- Obter stock e custo atual
  SELECT estoque_atual, custo_medio INTO cur_stock, cur_custo
  FROM materials WHERE id = NEW.material_id;

  -- Calcular custo médio ponderado
  cur_total := cur_stock * COALESCE(cur_custo, 0);
  new_total := NEW.qtd_recebida * COALESCE(preco_unit, 0);

  UPDATE materials SET
    estoque_atual = cur_stock + NEW.qtd_recebida,
    custo_medio = CASE
      WHEN (cur_stock + NEW.qtd_recebida) > 0
      THEN (cur_total + new_total) / (cur_stock + NEW.qtd_recebida)
      ELSE 0
    END,
    updated_at = now()
  WHERE id = NEW.material_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER grn_line_stock_update
  AFTER INSERT ON goods_receipt_lines
  FOR EACH ROW EXECUTE FUNCTION update_material_stock_on_grn();

-- ─── Trigger: decrementar stock no consumo ───────────────────

CREATE OR REPLACE FUNCTION update_material_stock_on_consumption()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE materials SET
    estoque_atual = GREATEST(0, estoque_atual - NEW.quantidade),
    updated_at = now()
  WHERE id = NEW.material_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER consumption_stock_update
  AFTER INSERT ON material_consumptions
  FOR EACH ROW EXECUTE FUNCTION update_material_stock_on_consumption();

-- ─── Trigger: updated_at em suppliers e materials ────────────

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER po_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Sequência para numeração de POs ─────────────────────────

CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- materials
CREATE POLICY "mat_tenant_read" ON materials FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "mat_tenant_write" ON materials FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "mat_tenant_update" ON materials FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY "mat_tenant_delete" ON materials FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('admin'));

-- purchase_orders
CREATE POLICY "po_tenant_read" ON purchase_orders FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "po_tenant_write" ON purchase_orders FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "po_tenant_update" ON purchase_orders FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY "po_tenant_delete" ON purchase_orders FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('admin') AND estado = 'Rascunho');

-- purchase_order_lines
CREATE POLICY "pol_tenant_read" ON purchase_order_lines FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "pol_tenant_write" ON purchase_order_lines FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "pol_tenant_update" ON purchase_order_lines FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY "pol_tenant_delete" ON purchase_order_lines FOR DELETE USING (tenant_id = get_tenant_id());

-- goods_receipts
CREATE POLICY "grn_tenant_read" ON goods_receipts FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "grn_tenant_write" ON goods_receipts FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "grn_tenant_update" ON goods_receipts FOR UPDATE USING (tenant_id = get_tenant_id());

-- goods_receipt_lines
CREATE POLICY "grl_tenant_read" ON goods_receipt_lines FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "grl_tenant_write" ON goods_receipt_lines FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "grl_tenant_update" ON goods_receipt_lines FOR UPDATE USING (tenant_id = get_tenant_id());

-- material_consumptions
CREATE POLICY "mc_tenant_read" ON material_consumptions FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "mc_tenant_write" ON material_consumptions FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "mc_tenant_delete" ON material_consumptions FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('admin'));

-- stock_movements (read-only para todos, escrita via triggers/serviço)
CREATE POLICY "sm_tenant_read" ON stock_movements FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "sm_tenant_write" ON stock_movements FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
