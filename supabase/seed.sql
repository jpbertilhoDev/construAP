-- ============================================================
-- ConstruAP — Seed data for development
-- Run only in development environment
-- ============================================================

-- Demo tenant
INSERT INTO tenants (id, name, nif, email, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Construções Demo, Lda',
  '123456789',
  'demo@construap.pt',
  'pro'
) ON CONFLICT DO NOTHING;

-- Note: profiles are created via the handle_new_user trigger after Auth signup.
-- To create a test user, use the Supabase Auth dashboard or:
--   supabase auth signup --email admin@construap.pt --password Demo1234!
-- Then manually set the tenant_id in app_metadata via the dashboard if needed.

-- Demo client
INSERT INTO clients (id, tenant_id, name, nif, email, type)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'João Silva',
  '987654321',
  'joao.silva@example.com',
  'Particular'
) ON CONFLICT DO NOTHING;

-- Demo supplier
INSERT INTO suppliers (id, tenant_id, name, nif, email, category)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  'Materiais Ferreira & Filhos',
  '555666777',
  'comercial@ferreira.pt',
  'Materiais de Construção'
) ON CONFLICT DO NOTHING;
