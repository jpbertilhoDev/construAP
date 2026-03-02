-- ============================================================================
-- Migration: Cron Job - check-trial-expiry
-- Date: 2026-02-28
--
-- PRE-REQUISITO: Activar pg_cron e pg_net no Supabase Dashboard
--   1. Database > Extensions > procurar "pg_cron" > Enable
--   2. Database > Extensions > procurar "pg_net" > Enable
--   3. So depois correr este SQL
-- ============================================================================

-- Schedule the Edge Function to run daily at 03:00 UTC
SELECT cron.schedule(
  'check-trial-expiry',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fftlcrijarsqfknfnrlm.supabase.co/functions/v1/check-trial-expiry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
