-- ============================================================
-- Migration: 20260220000012_funcionarios_v1
-- ConstruAP — Módulo Funcionários e Equipas V1
-- ============================================================

-- ─── Funções / Categorias profissionais ─────────────────────

CREATE TABLE employee_roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

CREATE INDEX idx_employee_roles_tenant ON employee_roles(tenant_id);

-- ─── Funcionários ────────────────────────────────────────────

CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id         UUID REFERENCES employee_roles(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  nif             TEXT,
  email           TEXT,
  telefone        TEXT,
  morada          TEXT,
  data_nascimento DATE,
  data_admissao   DATE,
  estado          TEXT NOT NULL DEFAULT 'Ativo'
                  CHECK (estado IN ('Ativo','Inativo','Suspenso')),
  notas           TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nif)
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_estado ON employees(estado);
CREATE INDEX idx_employees_role ON employees(role_id);

-- ─── Tabela de Custos por Funcionário (append-only) ─────────

CREATE TABLE employee_rates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('hourly','daily','monthly')),
  valor           NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  data_inicio     DATE NOT NULL,
  data_fim        DATE,
  notas           TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_rates_employee ON employee_rates(employee_id);
CREATE INDEX idx_employee_rates_tenant ON employee_rates(tenant_id);

-- ─── Equipas ─────────────────────────────────────────────────

CREATE TABLE teams (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  obra_id         UUID REFERENCES obras(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_tenant ON teams(tenant_id);
CREATE INDEX idx_teams_obra ON teams(obra_id);

-- ─── Membros de Equipa ───────────────────────────────────────

CREATE TABLE team_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  data_entrada DATE,
  data_saida   DATE,
  UNIQUE (team_id, employee_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_employee ON team_members(employee_id);

-- ─── Alocações (funcionário → obra) ─────────────────────────

CREATE TABLE allocations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  obra_id     UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim    DATE,
  notas       TEXT,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT allocations_dates_check CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE INDEX idx_allocations_employee ON allocations(employee_id);
CREATE INDEX idx_allocations_obra ON allocations(obra_id);
CREATE INDEX idx_allocations_tenant ON allocations(tenant_id);

-- ─── Apontamentos / Timesheets ───────────────────────────────

CREATE TABLE timesheets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data            DATE NOT NULL,
  horas           NUMERIC(4,2) CHECK (horas IS NULL OR horas > 0),
  presenca        BOOLEAN NOT NULL DEFAULT false,
  observacao      TEXT,
  estado          TEXT NOT NULL DEFAULT 'Rascunho'
                  CHECK (estado IN ('Rascunho','Submetido','Aprovado','Rejeitado')),
  motivo_rejeicao TEXT,
  aprovado_por    UUID REFERENCES profiles(id),
  aprovado_em     TIMESTAMPTZ,
  custo_calculado NUMERIC(10,2),
  cost_entry_id   UUID REFERENCES costs(id),  -- link para lançamento no Financeiro
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, obra_id, data),
  CONSTRAINT timesheets_horas_or_presenca CHECK (horas IS NOT NULL OR presenca = true)
);

CREATE INDEX idx_timesheets_employee ON timesheets(employee_id);
CREATE INDEX idx_timesheets_obra ON timesheets(obra_id);
CREATE INDEX idx_timesheets_tenant ON timesheets(tenant_id);
CREATE INDEX idx_timesheets_estado ON timesheets(estado);
CREATE INDEX idx_timesheets_data ON timesheets(data);

-- ─── Trigger: updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER timesheets_updated_at
  BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE employee_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- employee_roles
CREATE POLICY "eroles_tenant_read" ON employee_roles FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "eroles_tenant_write" ON employee_roles FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "eroles_tenant_update" ON employee_roles FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY "eroles_tenant_delete" ON employee_roles FOR DELETE USING (tenant_id = get_tenant_id());

-- employees
CREATE POLICY "employees_tenant_read" ON employees FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "employees_tenant_write" ON employees FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "employees_tenant_update" ON employees FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY "employees_tenant_delete" ON employees FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('admin'));

-- employee_rates
CREATE POLICY "erates_tenant_read" ON employee_rates FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "erates_tenant_write" ON employee_rates FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "erates_tenant_delete" ON employee_rates FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('admin'));

-- teams
CREATE POLICY "teams_tenant_read" ON teams FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "teams_tenant_write" ON teams FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "teams_tenant_update" ON teams FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY "teams_tenant_delete" ON teams FOR DELETE USING (tenant_id = get_tenant_id());

-- team_members
CREATE POLICY "tmembers_tenant_read" ON team_members FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "tmembers_tenant_write" ON team_members FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tmembers_tenant_delete" ON team_members FOR DELETE USING (tenant_id = get_tenant_id());

-- allocations
CREATE POLICY "alloc_tenant_read" ON allocations FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "alloc_tenant_write" ON allocations FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "alloc_tenant_update" ON allocations FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY "alloc_tenant_delete" ON allocations FOR DELETE USING (tenant_id = get_tenant_id());

-- timesheets
CREATE POLICY "ts_tenant_read" ON timesheets FOR SELECT USING (tenant_id = get_tenant_id());
CREATE POLICY "ts_tenant_write" ON timesheets FOR INSERT WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "ts_tenant_update" ON timesheets FOR UPDATE USING (tenant_id = get_tenant_id());
CREATE POLICY "ts_tenant_delete" ON timesheets FOR DELETE USING (tenant_id = get_tenant_id() AND has_role('admin'));
