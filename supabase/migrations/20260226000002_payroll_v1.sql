-- ============================================================
-- PAYROLL MODULE V1
-- Processamento salarial com SS, IRS, subsídios, horas extra
-- ============================================================

-- ── 1. Colunas fiscais em employees ─────────────────────────

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS situacao_fiscal TEXT NOT NULL DEFAULT 'solteiro'
    CHECK (situacao_fiscal IN ('solteiro','casado_2_titulares','casado_unico_titular')),
  ADD COLUMN IF NOT EXISTS numero_dependentes INTEGER NOT NULL DEFAULT 0
    CHECK (numero_dependentes >= 0),
  ADD COLUMN IF NOT EXISTS niss TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT;

-- ── 2. payroll_config (configuração por tenant) ─────────────

CREATE TABLE IF NOT EXISTS payroll_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Segurança Social
  ss_taxa_entidade      NUMERIC(5,2) NOT NULL DEFAULT 23.75,
  ss_taxa_trabalhador   NUMERIC(5,2) NOT NULL DEFAULT 11.00,
  -- Subsídio de Alimentação
  subsidio_alimentacao_valor  NUMERIC(6,2) NOT NULL DEFAULT 6.00,
  subsidio_alimentacao_tipo   TEXT NOT NULL DEFAULT 'cash'
    CHECK (subsidio_alimentacao_tipo IN ('cash', 'card')),
  -- Horas Extra (multiplicadores)
  overtime_1h           NUMERIC(4,3) NOT NULL DEFAULT 1.250,
  
  overtime_subsequent   NUMERIC(4,3) NOT NULL DEFAULT 1.375,
  overtime_rest_day     NUMERIC(4,3) NOT NULL DEFAULT 1.500,
  overtime_holiday      NUMERIC(4,3) NOT NULL DEFAULT 2.000,
  -- Horário padrão
  horas_diarias_padrao  NUMERIC(3,1) NOT NULL DEFAULT 8.0,
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_config_tenant ON payroll_config(tenant_id);

-- ── 3. payroll_runs (processamentos mensais) ────────────────

CREATE TABLE IF NOT EXISTS payroll_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  periodo_mes       INTEGER NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_ano       INTEGER NOT NULL CHECK (periodo_ano >= 2020),
  status            TEXT NOT NULL DEFAULT 'Rascunho'
    CHECK (status IN ('Rascunho','Processado','Finalizado','Anulado')),
  inclui_sub_ferias    BOOLEAN NOT NULL DEFAULT false,
  inclui_sub_natal     BOOLEAN NOT NULL DEFAULT false,
  total_bruto          NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_ss_entidade    NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_ss_trabalhador NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_irs            NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_liquido        NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_subsidio_alimentacao NUMERIC(14,2) NOT NULL DEFAULT 0,
  num_funcionarios     INTEGER NOT NULL DEFAULT 0,
  notas                TEXT,
  processado_por       UUID REFERENCES profiles(id),
  processado_em        TIMESTAMPTZ,
  finalizado_por       UUID REFERENCES profiles(id),
  finalizado_em        TIMESTAMPTZ,
  created_by           UUID NOT NULL REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, periodo_mes, periodo_ano)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant ON payroll_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_periodo ON payroll_runs(periodo_ano, periodo_mes);

-- ── 4. payroll_lines (detalhe por funcionário) ──────────────

CREATE TABLE IF NOT EXISTS payroll_lines (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_run_id         UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id            UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  -- Trabalho
  dias_trabalhados       INTEGER NOT NULL DEFAULT 0,
  horas_normais          NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_extra            NUMERIC(6,2) NOT NULL DEFAULT 0,
  -- Abonos
  salario_base           NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_horas_extra      NUMERIC(10,2) NOT NULL DEFAULT 0,
  subsidio_alimentacao   NUMERIC(10,2) NOT NULL DEFAULT 0,
  subsidio_ferias        NUMERIC(10,2) NOT NULL DEFAULT 0,
  subsidio_natal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  outros_abonos          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_bruto            NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Descontos trabalhador
  desconto_ss            NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto_irs           NUMERIC(10,2) NOT NULL DEFAULT 0,
  outros_descontos       NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Custo patronal
  ss_entidade            NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Líquido
  total_liquido          NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Snapshot IRS
  irs_tabela             TEXT,
  irs_taxa_marginal      NUMERIC(5,4),
  irs_deducao            NUMERIC(10,2),
  -- Snapshot taxa
  taxa_tipo              TEXT,
  taxa_valor             NUMERIC(10,2),
  -- Snapshot fiscal
  situacao_fiscal        TEXT,
  numero_dependentes     INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_lines_run ON payroll_lines(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_employee ON payroll_lines(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_tenant ON payroll_lines(tenant_id);

-- ── 5. RLS Policies ─────────────────────────────────────────

ALTER TABLE payroll_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;

-- payroll_config
CREATE POLICY "pc_read" ON payroll_config FOR SELECT
  USING (tenant_id = get_tenant_id() AND has_permission('rh.view'));
CREATE POLICY "pc_write" ON payroll_config FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id() AND has_permission('rh.manage'));
CREATE POLICY "pc_update" ON payroll_config FOR UPDATE
  USING (tenant_id = get_tenant_id() AND has_permission('rh.manage'));

-- payroll_runs
CREATE POLICY "pr_read" ON payroll_runs FOR SELECT
  USING (tenant_id = get_tenant_id() AND has_permission('rh.view'));
CREATE POLICY "pr_write" ON payroll_runs FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id() AND has_permission('rh.manage'));
CREATE POLICY "pr_update" ON payroll_runs FOR UPDATE
  USING (tenant_id = get_tenant_id() AND has_permission('rh.manage'));
CREATE POLICY "pr_delete" ON payroll_runs FOR DELETE
  USING (tenant_id = get_tenant_id() AND has_permission('rh.manage'));

-- payroll_lines
CREATE POLICY "pl_read" ON payroll_lines FOR SELECT
  USING (tenant_id = get_tenant_id() AND has_permission('rh.view'));
CREATE POLICY "pl_write" ON payroll_lines FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id() AND has_permission('rh.manage'));
CREATE POLICY "pl_delete" ON payroll_lines FOR DELETE
  USING (tenant_id = get_tenant_id() AND has_permission('rh.manage'));

-- ── 6. Triggers updated_at ──────────────────────────────────

CREATE TRIGGER payroll_config_updated_at
  BEFORE UPDATE ON payroll_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payroll_runs_updated_at
  BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. Seed payroll_config para tenants existentes ──────────

INSERT INTO payroll_config (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- ── 8. RPC: Agregar timesheets para payroll ─────────────────

CREATE OR REPLACE FUNCTION get_payroll_timesheet_aggregate(
  p_mes INTEGER,
  p_ano INTEGER
)
RETURNS TABLE (
  employee_id    UUID,
  employee_name  TEXT,
  employee_nif   TEXT,
  employee_niss  TEXT,
  employee_iban  TEXT,
  employee_role  TEXT,
  data_admissao  DATE,
  situacao_fiscal TEXT,
  numero_dependentes INTEGER,
  dias_trabalhados BIGINT,
  total_horas    NUMERIC,
  horas_por_dia  JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id            AS employee_id,
    e.nome          AS employee_name,
    e.nif           AS employee_nif,
    e.niss          AS employee_niss,
    e.iban          AS employee_iban,
    er.nome         AS employee_role,
    e.data_admissao AS data_admissao,
    e.situacao_fiscal AS situacao_fiscal,
    e.numero_dependentes AS numero_dependentes,
    COUNT(DISTINCT t.data)                            AS dias_trabalhados,
    COALESCE(SUM(COALESCE(t.horas, 8.0)), 0)        AS total_horas,
    jsonb_object_agg(t.data::text, COALESCE(t.horas, 8.0)) AS horas_por_dia
  FROM timesheets t
  JOIN employees e ON e.id = t.employee_id
  LEFT JOIN employee_roles er ON er.id = e.role_id
  WHERE t.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND t.estado = 'Aprovado'
    AND EXTRACT(MONTH FROM t.data) = p_mes
    AND EXTRACT(YEAR FROM t.data) = p_ano
    AND e.estado = 'Ativo'
  GROUP BY e.id, e.nome, e.nif, e.niss, e.iban, er.nome,
           e.data_admissao, e.situacao_fiscal, e.numero_dependentes
  ORDER BY e.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
