const { Client } = require('pg');
async function run() {
    const client = new Client({ connectionString: 'postgres://postgres:construapp123@db.fftlcrijarsqfknfnrlm.supabase.co:5432/postgres' });
    try {
        await client.connect();
        const { rows } = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_roles'");
        console.log('Columns in user_roles:');
        rows.forEach(r => console.log(' - ' + r.column_name + ' (' + r.data_type + ')'));
    } catch (e) { console.error('Error:', e.message); } finally { await client.end(); }
}
run();
