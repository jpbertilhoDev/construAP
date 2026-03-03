-- ============================================================================
-- Migration: IVA (VAT) columns for costs, accounts_payable, accounts_receivable
-- Date: 2026-03-03
--
-- STRATEGY: Add new IVA columns alongside existing `amount` column.
--   - amount stays as-is (backward compat) = valor_base (sem IVA)
--   - iva_pct: tax rate, defaults 23%
--   - valor_iva: computed = ROUND(amount * iva_pct / 100, 2)
--   - total: computed = amount + valor_iva
-- Generated columns auto-update whenever amount or iva_pct changes.
-- ============================================================================

-- ── COSTS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.costs
  ADD COLUMN IF NOT EXISTS iva_pct   NUMERIC(4,2) NOT NULL DEFAULT 23.00,
  ADD COLUMN IF NOT EXISTS valor_iva NUMERIC(14,2)
    GENERATED ALWAYS AS (ROUND(amount * iva_pct / 100.0, 2)) STORED,
  ADD COLUMN IF NOT EXISTS total     NUMERIC(14,2)
    GENERATED ALWAYS AS (amount + ROUND(amount * iva_pct / 100.0, 2)) STORED;

COMMENT ON COLUMN public.costs.amount    IS 'Valor base sem IVA (net)';
COMMENT ON COLUMN public.costs.iva_pct   IS 'Taxa de IVA em % (ex: 23.00)';
COMMENT ON COLUMN public.costs.valor_iva IS 'Valor de IVA calculado automaticamente';
COMMENT ON COLUMN public.costs.total     IS 'Total com IVA (amount + valor_iva)';

-- ── ACCOUNTS_PAYABLE ──────────────────────────────────────────────────────────
ALTER TABLE public.accounts_payable
  ADD COLUMN IF NOT EXISTS iva_pct   NUMERIC(4,2) NOT NULL DEFAULT 23.00,
  ADD COLUMN IF NOT EXISTS valor_iva NUMERIC(15,2)
    GENERATED ALWAYS AS (ROUND(amount * iva_pct / 100.0, 2)) STORED,
  ADD COLUMN IF NOT EXISTS total     NUMERIC(15,2)
    GENERATED ALWAYS AS (amount + ROUND(amount * iva_pct / 100.0, 2)) STORED;

COMMENT ON COLUMN public.accounts_payable.amount    IS 'Valor base sem IVA (net)';
COMMENT ON COLUMN public.accounts_payable.iva_pct   IS 'Taxa de IVA em % (ex: 23.00)';
COMMENT ON COLUMN public.accounts_payable.valor_iva IS 'Valor de IVA calculado automaticamente';
COMMENT ON COLUMN public.accounts_payable.total     IS 'Total com IVA';

-- ── ACCOUNTS_RECEIVABLE ───────────────────────────────────────────────────────
ALTER TABLE public.accounts_receivable
  ADD COLUMN IF NOT EXISTS iva_pct   NUMERIC(4,2) NOT NULL DEFAULT 23.00,
  ADD COLUMN IF NOT EXISTS valor_iva NUMERIC(15,2)
    GENERATED ALWAYS AS (ROUND(amount * iva_pct / 100.0, 2)) STORED,
  ADD COLUMN IF NOT EXISTS total     NUMERIC(15,2)
    GENERATED ALWAYS AS (amount + ROUND(amount * iva_pct / 100.0, 2)) STORED;

COMMENT ON COLUMN public.accounts_receivable.amount    IS 'Valor base sem IVA (net)';
COMMENT ON COLUMN public.accounts_receivable.iva_pct   IS 'Taxa de IVA em % (ex: 23.00)';
COMMENT ON COLUMN public.accounts_receivable.valor_iva IS 'Valor de IVA calculado automaticamente';
COMMENT ON COLUMN public.accounts_receivable.total     IS 'Total com IVA';

-- ── UPDATE vw_cashflow - show total (with IVA) ────────────────────────────────
CREATE OR REPLACE VIEW vw_cashflow AS
SELECT
  t.tenant_id,
  t.transaction_date,
  o.id   AS obra_id,
  o.name AS obra_name,
  t.method,
  -- Use total (com IVA). Fallback to amount for old records where total may be null.
  CASE WHEN t.ar_id IS NOT NULL THEN COALESCE(ar.total, ar.amount)  ELSE 0 END AS inflow,
  CASE WHEN t.ap_id IS NOT NULL THEN COALESCE(ap.total, ap.amount) ELSE 0 END AS outflow,
  CASE
    WHEN t.ar_id IS NOT NULL THEN  COALESCE(ar.total, ar.amount)
    ELSE                          -COALESCE(ap.total, ap.amount)
  END AS net_amount,
  COALESCE(ar.description, ap.description) AS description,
  -- IVA breakdown for reporting
  CASE WHEN t.ar_id IS NOT NULL THEN ar.amount ELSE NULL END AS ar_base,
  CASE WHEN t.ap_id IS NOT NULL THEN ap.amount ELSE NULL END AS ap_base,
  CASE WHEN t.ar_id IS NOT NULL THEN ar.valor_iva ELSE NULL END AS ar_iva,
  CASE WHEN t.ap_id IS NOT NULL THEN ap.valor_iva ELSE NULL END AS ap_iva
FROM financial_transactions t
LEFT JOIN accounts_receivable ar ON t.ar_id = ar.id
LEFT JOIN accounts_payable    ap ON t.ap_id = ap.id
LEFT JOIN obras o ON COALESCE(ar.obra_id, ap.obra_id) = o.id;
