-- ============================================================
-- Migration: 20260220000001_initial_schema
-- ConstruAP — Schema inicial do V1
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMERATIONS
-- ============================================================

CREATE TYPE obra_status AS ENUM (
  'Em preparação', 'Em execução', 'Suspensa', 'Concluída', 'Arquivada'
);

CREATE TYPE obra_type AS ENUM (
  'Construção Nova', 'Remodelação', 'Reabilitação', 'Especialidades', 'Outro'
);

CREATE TYPE budget_status AS ENUM (
  'Rascunho', 'Pendente Aprovação', 'Aprovado', 'Histórico'
);

CREATE TYPE cost_status AS ENUM (
  'Rascunho', 'Pendente Aprovação', 'Aprovado', 'Anulado'
);

CREATE TYPE task_status AS ENUM (
  'Aberta', 'Em Curso', 'Concluída', 'Cancelada'
);

CREATE TYPE task_priority AS ENUM (
  'Baixa', 'Média', 'Alta', 'Crítica'
);

CREATE TYPE fracao_status AS ENUM (
  'Disponível', 'Reservada', 'Vendida', 'Arrendada', 'Indisponível'
);

CREATE TYPE user_role AS ENUM (
  'admin', 'gestor', 'encarregado', 'financeiro', 'compras', 'leitura'
);

CREATE TYPE purchase_order_status AS ENUM (
  'Rascunho', 'Pendente Aprovação', 'Aprovado', 'Encomendado', 'Recebido', 'Cancelado'
);

CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- ============================================================
-- TENANTS (empresas / clientes SaaS)
-- ============================================================

CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  nif         TEXT UNIQUE,
  email       TEXT,
  logo_url    TEXT,
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (ligado a auth.users)
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  consent_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);

-- ============================================================
-- USER ROLES (RBAC por obra ou global)
-- ============================================================

CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  obra_id     UUID,  -- NULL = papel global no tenant
  role        user_role NOT NULL DEFAULT 'leitura',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, obra_id)
);

CREATE INDEX idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX idx_user_roles_profile ON user_roles(profile_id);

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  nif         TEXT,
  email       TEXT,
  phone       TEXT,
  type        TEXT NOT NULL DEFAULT 'Particular', -- Particular | Empresa
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_tenant ON clients(tenant_id);

-- ============================================================
-- SUPPLIERS
-- ============================================================

CREATE TABLE suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  nif         TEXT,
  email       TEXT,
  phone       TEXT,
  category    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);

-- ============================================================
-- OBRAS (projetos de construção)
-- ============================================================

CREATE TABLE obras (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  ref               TEXT,
  client_id         UUID REFERENCES clients(id),
  address           TEXT,
  type              obra_type NOT NULL DEFAULT 'Construção Nova',
  status            obra_status NOT NULL DEFAULT 'Em preparação',
  start_date        DATE,
  end_date_planned  DATE,
  end_date_actual   DATE,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT obras_dates_check CHECK (
    end_date_planned IS NULL OR start_date IS NULL OR end_date_planned >= start_date
  )
);

CREATE INDEX idx_obras_tenant ON obras(tenant_id);
CREATE INDEX idx_obras_tenant_status ON obras(tenant_id, status);
CREATE INDEX idx_obras_created_at ON obras(tenant_id, created_at DESC);

-- ============================================================
-- OBRA CHAPTERS (capítulos/categorias do orçamento)
-- ============================================================

CREATE TABLE obra_chapters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id     UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES obra_chapters(id),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chapters_obra ON obra_chapters(obra_id);
CREATE INDEX idx_chapters_tenant ON obra_chapters(tenant_id);

-- ============================================================
-- BUDGETS (orçamentos versionados)
-- ============================================================

CREATE TABLE budgets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id      UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL DEFAULT 1,
  status       budget_status NOT NULL DEFAULT 'Rascunho',
  notes        TEXT,
  approved_by  UUID REFERENCES profiles(id),
  approved_at  TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(obra_id, version)
);

CREATE INDEX idx_budgets_obra ON budgets(obra_id);
CREATE INDEX idx_budgets_tenant ON budgets(tenant_id);

-- ============================================================
-- BUDGET ITEMS (rubricas do orçamento)
-- ============================================================

CREATE TABLE budget_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id    UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  chapter_id   UUID REFERENCES obra_chapters(id),
  description  TEXT NOT NULL,
  unit         TEXT NOT NULL DEFAULT 'vg',
  qty          NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_price   NUMERIC(14,4) NOT NULL DEFAULT 0,
  total        NUMERIC(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT budget_items_qty_check CHECK (qty >= 0),
  CONSTRAINT budget_items_price_check CHECK (unit_price >= 0)
);

CREATE INDEX idx_budget_items_budget ON budget_items(budget_id);
CREATE INDEX idx_budget_items_tenant ON budget_items(tenant_id);
CREATE INDEX idx_budget_items_chapter ON budget_items(chapter_id);

-- ============================================================
-- COSTS (custos reais)
-- ============================================================

CREATE TABLE costs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id          UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  budget_item_id   UUID REFERENCES budget_items(id),
  chapter_id       UUID REFERENCES obra_chapters(id),
  supplier_id      UUID REFERENCES suppliers(id),
  description      TEXT NOT NULL,
  amount           NUMERIC(14,2) NOT NULL,
  cost_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  doc_url          TEXT,
  doc_number       TEXT,
  status           cost_status NOT NULL DEFAULT 'Rascunho',
  notes            TEXT,
  approved_by      UUID REFERENCES profiles(id),
  approved_at      TIMESTAMPTZ,
  created_by       UUID NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT costs_amount_check CHECK (amount > 0)
);

CREATE INDEX idx_costs_obra ON costs(obra_id);
CREATE INDEX idx_costs_tenant ON costs(tenant_id);
CREATE INDEX idx_costs_tenant_date ON costs(tenant_id, cost_date DESC);
CREATE INDEX idx_costs_supplier ON costs(supplier_id);
CREATE INDEX idx_costs_chapter ON costs(chapter_id);

-- ============================================================
-- DIARIO ENTRIES (diário de obra)
-- ============================================================

CREATE TABLE diario_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id          UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  weather          TEXT,
  resources_count  INTEGER DEFAULT 0,
  activities       TEXT,
  notes            TEXT,
  created_by       UUID NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(obra_id, entry_date)
);

CREATE INDEX idx_diario_obra ON diario_entries(obra_id);
CREATE INDEX idx_diario_tenant ON diario_entries(tenant_id);
CREATE INDEX idx_diario_date ON diario_entries(obra_id, entry_date DESC);

-- ============================================================
-- DIARIO PHOTOS
-- ============================================================

CREATE TABLE diario_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id      UUID NOT NULL REFERENCES diario_entries(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  caption       TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_entry ON diario_photos(entry_id);
CREATE INDEX idx_photos_tenant ON diario_photos(tenant_id);

-- ============================================================
-- TASKS (punch list / tarefas de qualidade)
-- ============================================================

CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id      UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  assignee_id  UUID REFERENCES profiles(id),
  due_date     DATE,
  status       task_status NOT NULL DEFAULT 'Aberta',
  priority     task_priority NOT NULL DEFAULT 'Média',
  created_by   UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_obra ON tasks(obra_id);
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(tenant_id, status);

-- ============================================================
-- TASK ATTACHMENTS
-- ============================================================

CREATE TABLE task_attachments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_attach_task ON task_attachments(task_id);

-- ============================================================
-- DOCUMENTS (documentos versionados)
-- ============================================================

CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id       UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'Geral',
  version       INTEGER NOT NULL DEFAULT 1,
  storage_path  TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    BIGINT,
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_obra ON documents(obra_id);
CREATE INDEX idx_documents_tenant ON documents(tenant_id);

-- ============================================================
-- PURCHASE ORDERS (pedidos de compra)
-- ============================================================

CREATE TABLE purchase_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id          UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id      UUID REFERENCES suppliers(id),
  status           purchase_order_status NOT NULL DEFAULT 'Rascunho',
  total_estimated  NUMERIC(14,2),
  notes            TEXT,
  requested_by     UUID NOT NULL REFERENCES profiles(id),
  approved_by      UUID REFERENCES profiles(id),
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_obra ON purchase_orders(obra_id);
CREATE INDEX idx_po_tenant ON purchase_orders(tenant_id);

CREATE TABLE purchase_order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  unit         TEXT NOT NULL DEFAULT 'un',
  qty          NUMERIC(14,4) NOT NULL DEFAULT 1,
  unit_price   NUMERIC(14,4),
  total        NUMERIC(14,2) GENERATED ALWAYS AS (qty * COALESCE(unit_price, 0)) STORED,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_items_order ON purchase_order_items(order_id);

-- ============================================================
-- EMPREENDIMENTOS (imobiliário)
-- ============================================================

CREATE TABLE empreendimentos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  obra_id     UUID REFERENCES obras(id),
  name        TEXT NOT NULL,
  address     TEXT,
  total_units INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_empreen_tenant ON empreendimentos(tenant_id);

-- ============================================================
-- FRACOES (frações/unidades imobiliárias)
-- ============================================================

CREATE TABLE fracoes (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empreendimento_id    UUID NOT NULL REFERENCES empreendimentos(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ref                  TEXT NOT NULL,
  type                 TEXT NOT NULL DEFAULT 'Habitação', -- Habitação | Loja | Garagem | Arrecadação | Outro
  floor                INTEGER,
  area_m2              NUMERIC(10,2),
  orientation          TEXT,
  status               fracao_status NOT NULL DEFAULT 'Disponível',
  sale_price           NUMERIC(14,2),
  client_id            UUID REFERENCES clients(id),
  contract_date        DATE,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fracoes_empreen ON fracoes(empreendimento_id);
CREATE INDEX idx_fracoes_tenant ON fracoes(tenant_id);
CREATE INDEX idx_fracoes_status ON fracoes(tenant_id, status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  link        TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user ON notifications(user_id, read_at);
CREATE INDEX idx_notif_tenant ON notifications(tenant_id);

-- ============================================================
-- AUDIT LOG (append-only — sem UPDATE/DELETE via RLS)
-- ============================================================

CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL,
  table_name   TEXT NOT NULL,
  record_id    UUID NOT NULL,
  action       audit_action NOT NULL,
  old_value    JSONB,
  new_value    JSONB,
  changed_by   UUID,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, changed_at DESC);
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);

-- ============================================================
-- CONFLICT LOG (sync offline)
-- ============================================================

CREATE TABLE conflict_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity       TEXT NOT NULL,
  record_id    UUID NOT NULL,
  local_data   JSONB NOT NULL,
  server_data  JSONB NOT NULL,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conflict_tenant ON conflict_log(tenant_id, resolved_at);

-- ============================================================
-- updated_at auto-update trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants','profiles','obras','obra_chapters','budgets','budget_items',
    'costs','diario_entries','tasks','purchase_orders','empreendimentos','fracoes'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;
