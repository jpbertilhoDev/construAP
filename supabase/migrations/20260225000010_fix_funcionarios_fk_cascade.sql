-- Migration: Fix FK constraints for funcionarios module tables
-- The previous migration (20260225000009) used wrong table names:
--   "funcionarios" → actual table is "employees"
--   "employee_timesheets" / "timesheet_approvals" → actual table is "timesheets"
-- Also missed: employee_rates.created_by, allocations.created_by

-- ════════════════════════════════════════════════════════════════════════════
-- employees.created_by → profiles(id) ON DELETE SET NULL
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE employees ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_created_by_fkey;
ALTER TABLE employees ADD CONSTRAINT employees_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- employee_rates.created_by → profiles(id) ON DELETE SET NULL
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE employee_rates ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE employee_rates DROP CONSTRAINT IF EXISTS employee_rates_created_by_fkey;
ALTER TABLE employee_rates ADD CONSTRAINT employee_rates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- allocations.created_by → profiles(id) ON DELETE SET NULL
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE allocations ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE allocations DROP CONSTRAINT IF EXISTS allocations_created_by_fkey;
ALTER TABLE allocations ADD CONSTRAINT allocations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- timesheets.created_by → profiles(id) ON DELETE SET NULL
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE timesheets ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_created_by_fkey;
ALTER TABLE timesheets ADD CONSTRAINT timesheets_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- timesheets.aprovado_por → profiles(id) ON DELETE SET NULL (already nullable)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_aprovado_por_fkey;
ALTER TABLE timesheets ADD CONSTRAINT timesheets_aprovado_por_fkey
  FOREIGN KEY (aprovado_por) REFERENCES profiles(id) ON DELETE SET NULL;
