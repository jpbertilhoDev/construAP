const { Client } = require('pg');
async function run() {
    const client = new Client({ connectionString: 'postgres://postgres:construapp123@db.fftlcrijarsqfknfnrlm.supabase.co:5432/postgres' });
    try {
        await client.connect();

        // Get a valid role_id for the tenant to test the trigger
        const { rows: roles } = await client.query(`SELECT id FROM public.roles WHERE tenant_id = 'fd66a0ff-1fbd-40b8-b827-22554a637af8' LIMIT 1`);
        const validRoleId = roles[0].id;

        // Create a temporary function to mock the trigger execution and catch errors
        await client.query(`
      CREATE OR REPLACE FUNCTION public.debug_trigger() RETURNS text LANGUAGE plpgsql AS $$
      DECLARE
        mock_new RECORD;
      BEGIN
        -- Manually execute the logic of the trigger to see the exact line that fails
        DECLARE
          v_tenant_id UUID := 'fd66a0ff-1fbd-40b8-b827-22554a637af8';
          v_role_id UUID := '${validRoleId}';
          v_user_id UUID := gen_random_uuid();
          v_name TEXT := 'Test Debug';
          v_email TEXT := 'debug@example.com';
        BEGIN
          -- Simulate profile insertion
          INSERT INTO public.profiles (id, tenant_id, name, email)
          VALUES (v_user_id, v_tenant_id, v_name, v_email)
          ON CONFLICT (id) DO NOTHING;
          
          -- Simulate user_roles insertion
          INSERT INTO public.user_roles (profile_id, tenant_id, role, custom_role_id)
          VALUES (v_user_id, v_tenant_id, 'custom', v_role_id)
          ON CONFLICT DO NOTHING;
          
          -- Cleanup since it didn't fail
          DELETE FROM public.user_roles WHERE profile_id = v_user_id;
          DELETE FROM public.profiles WHERE id = v_user_id;
          
          RETURN 'SUCCESS';
        EXCEPTION WHEN OTHERS THEN
          RETURN SQLERRM;
        END;
      END;
      $$;
    `);

        const { rows } = await client.query('SELECT public.debug_trigger() as error');
        console.log('DEBUG TRIGGER RESULT:', rows[0].error);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}
run();
