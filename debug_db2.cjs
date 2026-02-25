const { Client } = require('pg');
async function run() {
    const client = new Client({ connectionString: 'postgres://postgres:construapp123@db.fftlcrijarsqfknfnrlm.supabase.co:5432/postgres' });
    try {
        await client.connect();
        // Query pg_stat_activity or pg_stat_statements? We can just simulate the exact trigger logic
        // We already know the data the user passed. Let's run the exact PL/pgSQL block as an anonymous code block.
        // In plpgsql, we can just DO block.
        const sql = `
DO $$
DECLARE
  v_tenant_id UUID := 'fd66a0ff-1fbd-40b8-b827-22554a637af8';
  v_role_id UUID := (SELECT id FROM public.roles WHERE tenant_id = 'fd66a0ff-1fbd-40b8-b827-22554a637af8' LIMIT 1);
  v_user_id UUID := gen_random_uuid();
  v_name TEXT := 'Test Debug';
  v_email TEXT := 'debug@example.com';
BEGIN
  -- simulate inserting to auth.users but we can't do that easily without superuser privileges.
  -- But wait, we ARE connected as postgres (superuser).
  -- Let's insert into auth.users directly and see what the trigger does!
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
