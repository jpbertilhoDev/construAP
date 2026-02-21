-- ============================================================
-- Migration: 20260221000001_relatorios_v1
-- ConstruAP — Módulo de Relatórios Analytics V1
-- ============================================================

-- 1. Preparar Audit Log para suportar exportações de relatórios
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EXPORT_REPORT';

-- ============================================================
-- VIEWS DE REPORTING GERAIS
-- ============================================================

-- View: Andamento e Estado Global das Obras
CREATE OR REPLACE VIEW vw_report_obra_status AS
SELECT 
  o.id as obra_id,
  o.tenant_id,
  o.name as obra_name,
  o.ref as obra_ref,
  o.status as status,
  o.type as type,
  o.start_date,
  o.end_date_planned,
  o.end_date_actual,
  o.contract_value
FROM obras o;

-- ============================================================
-- RPCs DE REPORTING (Com suporte a filtros e segurança RLS)
-- ============================================================

-- Function: Orçado vs. Real (Desvios Financeiros globais de Obra)
CREATE OR REPLACE FUNCTION get_report_budget_vs_actual(
  p_obra_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  obra_id UUID,
  obra_name TEXT,
  obra_status TEXT,
  contract_value NUMERIC,
  total_costs NUMERIC,
  profit_margin NUMERIC,
  profit_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id AS obra_id,
    o.name AS obra_name,
    o.status::TEXT AS obra_status,
    o.contract_value AS contract_value,
    COALESCE(SUM(c.amount), 0) AS total_costs,
    o.contract_value - COALESCE(SUM(c.amount), 0) AS profit_margin,
    CASE WHEN o.contract_value > 0 THEN 
      ROUND(((o.contract_value - COALESCE(SUM(c.amount), 0)) / o.contract_value) * 100, 2)
    ELSE 0::NUMERIC END AS profit_percentage
  FROM obras o
  LEFT JOIN costs c ON o.id = c.obra_id 
    AND c.status = 'Aprovado'
    AND (p_start_date IS NULL OR c.cost_date >= p_start_date)
    AND (p_end_date IS NULL OR c.cost_date <= p_end_date)
  WHERE o.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (p_obra_id IS NULL OR o.id = p_obra_id)
  GROUP BY o.id, o.name, o.status, o.contract_value
  ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Agregado de Horas de Funcionários por Obra
CREATE OR REPLACE FUNCTION get_report_timesheet_aggregate(
  p_obra_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  obra_id UUID,
  obra_name TEXT,
  employee_id UUID,
  employee_name TEXT,
  total_horas NUMERIC,
  total_presencas BIGINT,
  total_cost_calculated NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id AS obra_id,
    o.name AS obra_name,
    e.id AS employee_id,
    e.nome AS employee_name,
    COALESCE(SUM(t.horas), 0) AS total_horas,
    COUNT(CASE WHEN t.presenca = true THEN 1 END) AS total_presencas,
    COALESCE(SUM(t.custo_calculado), 0) AS total_cost_calculated
  FROM timesheets t
  JOIN obras o ON o.id = t.obra_id
  JOIN employees e ON e.id = t.employee_id
  WHERE t.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND t.estado = 'Aprovado'
    AND (p_obra_id IS NULL OR t.obra_id = p_obra_id)
    AND (p_start_date IS NULL OR t.data >= p_start_date)
    AND (p_end_date IS NULL OR t.data <= p_end_date)
  GROUP BY o.id, o.name, e.id, e.nome
  ORDER BY o.name, e.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Registo de Exfiltração de Relatórios
CREATE OR REPLACE FUNCTION log_report_export(
  p_report_name TEXT,
  p_format TEXT,
  p_filters JSONB DEFAULT '{}'::JSONB
)
RETURNS void AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;

  INSERT INTO audit_log (tenant_id, table_name, record_id, action, new_value, changed_by)
  VALUES (
    v_tenant_id,
    'reports',
    v_user_id, -- Usamos user_id como fallback para log seguro
    'EXPORT_REPORT',
    jsonb_build_object('report', p_report_name, 'format', p_format, 'filters', p_filters),
    v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
