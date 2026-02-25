const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
async function run() {
    const client = new Client({ connectionString: 'postgres://postgres:construapp123@db.fftlcrijarsqfknfnrlm.supabase.co:5432/postgres' });
    try {
        await client.connect();
        const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/20260225000005_seed_new_tenant_roles.sql'), 'utf8');
        await client.query(sql);
        console.log('Migration 00005 applied - roles seeded for new tenants!');
    } catch (e) { console.error('Error applying migration:', e.message); } finally { await client.end(); }
}
run();
