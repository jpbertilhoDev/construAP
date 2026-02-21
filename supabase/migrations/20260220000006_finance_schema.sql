-- ============================================================
-- Migration: 20260220000006_finance_schema
-- ConstruAP — Esquema de Base de Dados para Módulo Financeiro
-- ============================================================

-- ─── Types ──────────────────────────────────────────────────────────────────
CREATE TYPE payable_status AS ENUM ('Pendente', 'Parcial', 'Pago', 'Cancelado');
CREATE TYPE receivable_status AS ENUM ('Pendente', 'Parcial', 'Pago', 'Cancelado');

-- ─── Tables ─────────────────────────────────────────────────────────────────

-- 1. accounts_payable (AP)
CREATE TABLE accounts_payable (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  obra_id      UUID REFERENCES obras(id) ON DELETE CASCADE,
  supplier_id  UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  cost_id      UUID REFERENCES costs(id) ON DELETE SET NULL, -- ligação opcional ao custo real
  description  TEXT NOT NULL,
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  due_date     DATE NOT NULL,
  status       payable_status NOT NULL DEFAULT 'Pendente',
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. accounts_receivable (AR)
CREATE TABLE accounts_receivable (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  obra_id      UUID REFERENCES obras(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES clients(id) ON DELETE RESTRICT,
  description  TEXT NOT NULL,
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  due_date     DATE NOT NULL,
  status       receivable_status NOT NULL DEFAULT 'Pendente',
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. financial_transactions (Pagamentos/Recebimentos Reais)
CREATE TABLE financial_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ap_id            UUID REFERENCES accounts_payable(id) ON DELETE CASCADE,
  ar_id            UUID REFERENCES accounts_receivable(id) ON DELETE CASCADE,
  amount           NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL,
  method           TEXT NOT NULL, -- ex: Transferência, Numerário, Cheque
  receipt_url      TEXT,          -- link para comprovativo (storage)
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraints
-- A transaction must be tied to EITHER an AP or an AR, not both and not neither
ALTER TABLE financial_transactions ADD CONSTRAINT chk_ap_ar_exclusive CHECK (
  (ap_id IS NOT NULL AND ar_id IS NULL) OR
  (ap_id IS NULL AND ar_id IS NOT NULL)
);

-- ─── Timestamp Triggers ─────────────────────────────────────────────────────
CREATE TRIGGER trg_accounts_payable_updated_at
BEFORE UPDATE ON accounts_payable
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_accounts_receivable_updated_at
BEFORE UPDATE ON accounts_receivable
FOR EACH ROW EXECUTE FUNCTION update_updated_at();



-- ─── View: Fluxo de Caixa / Pagamentos Consolidado ──────────────────────────
CREATE OR REPLACE VIEW vw_cashflow AS
SELECT 
  t.tenant_id,
  t.transaction_date,
  o.id AS obra_id,
  o.name AS obra_name,
  t.method,
  CASE WHEN t.ar_id IS NOT NULL THEN t.amount ELSE 0 END AS inflow,
  CASE WHEN t.ap_id IS NOT NULL THEN t.amount ELSE 0 END AS outflow,
  CASE WHEN t.ar_id IS NOT NULL THEN t.amount ELSE -t.amount END AS net_amount,
  COALESCE(ar.description, ap.description) AS description
FROM financial_transactions t
LEFT JOIN accounts_receivable ar ON t.ar_id = ar.id
LEFT JOIN accounts_payable ap ON t.ap_id = ap.id
LEFT JOIN obras o ON COALESCE(ar.obra_id, ap.obra_id) = o.id;

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX idx_ap_tenant ON accounts_payable(tenant_id);
CREATE INDEX idx_ar_tenant ON accounts_receivable(tenant_id);
CREATE INDEX idx_tx_tenant ON financial_transactions(tenant_id);
CREATE INDEX idx_ap_obra ON accounts_payable(obra_id);
CREATE INDEX idx_ar_obra ON accounts_receivable(obra_id);
CREATE INDEX idx_tx_ap ON financial_transactions(ap_id);
CREATE INDEX idx_tx_ar ON financial_transactions(ar_id);


-- ─── RLS Policies ───────────────────────────────────────────────────────────

-- accounts_payable
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AP isolation" ON accounts_payable
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- accounts_receivable
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AR isolation" ON accounts_receivable
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- financial_transactions
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tx isolation" ON financial_transactions
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

