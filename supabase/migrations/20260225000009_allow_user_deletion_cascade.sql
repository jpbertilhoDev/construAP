-- Migration: Allow user deletion by changing FK constraints to ON DELETE SET NULL
-- When a user is deleted from auth.users:
--   1. profiles row is deleted (ON DELETE CASCADE already exists)
--   2. user_roles rows are deleted (ON DELETE CASCADE already exists)
--   3. All created_by/approved_by/etc. references are set to NULL (this migration)

-- Helper: drop a FK constraint if it exists, then recreate with ON DELETE SET NULL
-- We also need to make columns nullable where they are NOT NULL

-- ════════════════════════════════════════════════════════════════════════════
-- Tables from 20260220000001_initial_schema.sql (reference profiles(id))
-- ════════════════════════════════════════════════════════════════════════════

-- obras.created_by
ALTER TABLE obras ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE obras DROP CONSTRAINT IF EXISTS obras_created_by_fkey;
ALTER TABLE obras ADD CONSTRAINT obras_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- budgets.approved_by (already nullable)
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_approved_by_fkey;
ALTER TABLE budgets ADD CONSTRAINT budgets_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- budgets.created_by
ALTER TABLE budgets ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_created_by_fkey;
ALTER TABLE budgets ADD CONSTRAINT budgets_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- costs.approved_by (already nullable)
ALTER TABLE costs DROP CONSTRAINT IF EXISTS costs_approved_by_fkey;
ALTER TABLE costs ADD CONSTRAINT costs_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- costs.created_by
ALTER TABLE costs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE costs DROP CONSTRAINT IF EXISTS costs_created_by_fkey;
ALTER TABLE costs ADD CONSTRAINT costs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- diario_entries.created_by
ALTER TABLE diario_entries ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE diario_entries DROP CONSTRAINT IF EXISTS diario_entries_created_by_fkey;
ALTER TABLE diario_entries ADD CONSTRAINT diario_entries_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- tasks.assignee_id (already nullable)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_fkey
  FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- tasks.created_by
ALTER TABLE tasks ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- documents.uploaded_by
ALTER TABLE documents ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;
ALTER TABLE documents ADD CONSTRAINT documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- Tables from 20260220000006_finance_schema.sql (reference auth.users(id))
-- ════════════════════════════════════════════════════════════════════════════

-- accounts_payable.created_by
ALTER TABLE accounts_payable ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE accounts_payable DROP CONSTRAINT IF EXISTS accounts_payable_created_by_fkey;
ALTER TABLE accounts_payable ADD CONSTRAINT accounts_payable_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- accounts_receivable.created_by
ALTER TABLE accounts_receivable ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE accounts_receivable DROP CONSTRAINT IF EXISTS accounts_receivable_created_by_fkey;
ALTER TABLE accounts_receivable ADD CONSTRAINT accounts_receivable_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- financial_transactions.created_by
ALTER TABLE financial_transactions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_created_by_fkey;
ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- Tables from 20260220000011_imobiliario_v1.sql (reference auth.users(id))
-- ════════════════════════════════════════════════════════════════════════════

-- empreendimentos.created_by (already nullable from ALTER ADD COLUMN)
ALTER TABLE empreendimentos DROP CONSTRAINT IF EXISTS empreendimentos_created_by_fkey;
ALTER TABLE empreendimentos ADD CONSTRAINT empreendimentos_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- fracoes.created_by (already nullable from ALTER ADD COLUMN)
ALTER TABLE fracoes DROP CONSTRAINT IF EXISTS fracoes_created_by_fkey;
ALTER TABLE fracoes ADD CONSTRAINT fracoes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- reservas.created_by
ALTER TABLE IF EXISTS reservas ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE IF EXISTS reservas DROP CONSTRAINT IF EXISTS reservas_created_by_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservas') THEN
    ALTER TABLE reservas ADD CONSTRAINT reservas_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- precos_historico.created_by
ALTER TABLE IF EXISTS precos_historico ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE IF EXISTS precos_historico DROP CONSTRAINT IF EXISTS precos_historico_created_by_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'precos_historico') THEN
    ALTER TABLE precos_historico ADD CONSTRAINT precos_historico_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- imob_documentos.created_by
ALTER TABLE IF EXISTS imob_documentos ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE IF EXISTS imob_documentos DROP CONSTRAINT IF EXISTS imob_documentos_created_by_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'imob_documentos') THEN
    ALTER TABLE imob_documentos ADD CONSTRAINT imob_documentos_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Tables from 20260220000012_funcionarios_v1.sql (reference profiles(id))
-- ════════════════════════════════════════════════════════════════════════════

-- funcionarios.created_by
ALTER TABLE IF EXISTS funcionarios ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE IF EXISTS funcionarios DROP CONSTRAINT IF EXISTS funcionarios_created_by_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'funcionarios') THEN
    ALTER TABLE funcionarios ADD CONSTRAINT funcionarios_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- employee_timesheets.created_by
ALTER TABLE IF EXISTS employee_timesheets ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE IF EXISTS employee_timesheets DROP CONSTRAINT IF EXISTS employee_timesheets_created_by_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_timesheets') THEN
    ALTER TABLE employee_timesheets ADD CONSTRAINT employee_timesheets_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- timesheet_approvals.aprovado_por (already nullable)
ALTER TABLE IF EXISTS timesheet_approvals DROP CONSTRAINT IF EXISTS timesheet_approvals_aprovado_por_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timesheet_approvals') THEN
    ALTER TABLE timesheet_approvals ADD CONSTRAINT timesheet_approvals_aprovado_por_fkey
      FOREIGN KEY (aprovado_por) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- timesheet_approvals.created_by
ALTER TABLE IF EXISTS timesheet_approvals ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE IF EXISTS timesheet_approvals DROP CONSTRAINT IF EXISTS timesheet_approvals_created_by_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timesheet_approvals') THEN
    ALTER TABLE timesheet_approvals ADD CONSTRAINT timesheet_approvals_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Tables from 20260220000013_materiais_v1.sql (reference profiles(id))
-- ════════════════════════════════════════════════════════════════════════════

-- suppliers.created_by (already nullable)
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_created_by_fkey;
ALTER TABLE suppliers ADD CONSTRAINT suppliers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- materials.created_by
ALTER TABLE materials ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_created_by_fkey;
ALTER TABLE materials ADD CONSTRAINT materials_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- purchase_orders.aprovado_por (already nullable)
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_aprovado_por_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_aprovado_por_fkey
  FOREIGN KEY (aprovado_por) REFERENCES profiles(id) ON DELETE SET NULL;

-- purchase_orders.created_by
ALTER TABLE purchase_orders ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_created_by_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- goods_receipts.created_by
ALTER TABLE goods_receipts ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_created_by_fkey;
ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- material_consumptions.created_by
ALTER TABLE material_consumptions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE material_consumptions DROP CONSTRAINT IF EXISTS material_consumptions_created_by_fkey;
ALTER TABLE material_consumptions ADD CONSTRAINT material_consumptions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- stock_movements.created_by (already nullable)
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_created_by_fkey;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
