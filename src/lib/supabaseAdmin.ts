// @ts-nocheck
/**
 * supabaseAdmin.ts
 *
 * A separate Supabase client that uses the SERVICE_ROLE key.
 * This key bypasses Row Level Security and can call auth.admin.* APIs.
 *
 * ⚠️  SECURITY NOTE:
 * This is used ONLY for admin operations (creating users).
 * It is protected by the RequirePermission('admin.manage') guard.
 *
 * The key is read from VITE_SUPABASE_SERVICE_ROLE_KEY which must be
 * set in .env.local (never committed to git).
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

if (!serviceRoleKey) {
    console.warn(
        '[supabaseAdmin] VITE_SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
        'User creation by admin will not work until you add it to .env.local\n' +
        'Get it from: Supabase Dashboard → Settings → API → service_role key',
    )
}

/**
 * Admin Supabase client — SERVICE ROLE.
 * Never persist sessions or auto-refresh from this client.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey ?? '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
})
