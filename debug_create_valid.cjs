const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fftlcrijarsqfknfnrlm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGxjcmlqYXJzcWZrbmZucmxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxOTQ1NCwiZXhwIjoyMDg3MDk1NDU0fQ.76O-PjCDloZMKSZVR54LZtTeZEh4yHk4EWSwKuLNuac';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: 'postgres://postgres:construapp123@db.fftlcrijarsqfknfnrlm.supabase.co:5432/postgres' });
    try {
        await client.connect();
        const { rows: roles } = await client.query("SELECT id FROM public.roles WHERE tenant_id = 'fd66a0ff-1fbd-40b8-b827-22554a637af8' LIMIT 1");
        const validRoleId = roles[0].id;

        console.log('Testing user creation with valid role_id:', validRoleId);
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: 'test_real_role@example.com',
            password: 'Password123!',
            email_confirm: true,
            user_metadata: {
                name: 'Debug Valid User',
                tenant_id: 'fd66a0ff-1fbd-40b8-b827-22554a637af8',
                role_id: validRoleId
            }
        });

        if (error) {
            console.error('ERROR RESPONSE:', JSON.stringify(error, null, 2));
        } else {
            console.log('Success User Creation! ID:', data.user.id);
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        }
    } catch (e) { console.error('Error:', e.message); } finally { await client.end(); }
}
run();
