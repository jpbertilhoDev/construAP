const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fftlcrijarsqfknfnrlm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGxjcmlqYXJzcWZrbmZucmxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxOTQ1NCwiZXhwIjoyMDg3MDk1NDU0fQ.76O-PjCDloZMKSZVR54LZtTeZEh4yHk4EWSwKuLNuac';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    console.log('Testing user creation to catch the DB error...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: 'test_error_debug@example.com',
        password: 'Password123!',
        email_confirm: true,
        user_metadata: {
            name: 'Debug User',
            tenant_id: 'fd66a0ff-1fbd-40b8-b827-22554a637af8', // user's tenant
            role_id: '00000000-0000-0000-0000-000000000000' // dummy role for test
        }
    });

    if (error) {
        console.error('ERROR RESPONSE:', JSON.stringify(error, null, 2));
    } else {
        console.log('Success:', data.user.id);
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    }
}

run();
