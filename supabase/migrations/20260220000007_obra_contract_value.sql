-- ============================================================
-- Migration: 20260220000007_obra_contract_value
-- ConstruAP — Adicionar contract_value à tabela de obras e Receivables (AR)
-- ============================================================

-- 1. Adicionar o valor adjudicado/contrato
ALTER TABLE obras ADD COLUMN contract_value NUMERIC(15,2) DEFAULT 0 CHECK (contract_value >= 0);

-- Se já existirem obras, o valor default de 0 será aplicado, o que é seguro.
