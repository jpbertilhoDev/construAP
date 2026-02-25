const { Client } = require('pg');
async function run() {
    const client = new Client({ connectionString: 'postgres://postgres:construapp123@db.fftlcrijarsqfknfnrlm.supabase.co:5432/postgres' });
    try {
        await client.connect();
        const { rows } = await client.query("SELECT proname, proowner::regrole::text AS owner, prosecdef FROM pg_proc WHERE proname = 'handle_new_user'");
        console.log('Function info:', rows);

        // Also, let's verify if `custom_role_id` exists in `information_schema` just in case
        const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_roles'");
        console.log('user_roles cols:', cols.rows.map(r => r.column_name).join(', '));
    } catch (e) { console.error('Error:', e.message); } finally { await client.end(); }
}
run();
