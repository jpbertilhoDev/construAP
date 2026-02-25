const { Client } = require('pg');
async function run() {
    const client = new Client({ connectionString: 'postgres://postgres:construapp123@db.fftlcrijarsqfknfnrlm.supabase.co:5432/postgres' });
    try {
        await client.connect();

        const sql = `
DO $$
DECLARE
  v_tenant_id UUID := 'fd66a0ff-1fbd-40b8-b827-22554a637af8';
  v_role_id UUID := (SELECT id FROM public.roles WHERE tenant_id = 'fd66a0ff-1fbd-40b8-b827-22554a637af8' LIMIT 1);
  v_user_id UUID := gen_random_uuid();
  v_name TEXT := 'Test Debug';
  v_email TEXT := 'debug@example.com';
BEGIN
  -- SET ROLE to match GoTrue execution context
  SET ROLE supabase_auth_admin;
  
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email, 'xxxx', now(), 
    jsonb_build_object('tenant_id', v_tenant_id, 'role_id', v_role_id, 'name', v_name));
    
  -- If it succeeds, rollback.
  RAISE EXCEPTION 'SUCCESS_ROLLBACK';
END;
$$;
    `;
        await client.query(sql);
    } catch (e) {
        console.error('TRACED ERROR:', e.message);
    } finally {
        await client.end();
    }
}
run();
