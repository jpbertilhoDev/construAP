import { supabase } from './supabase'

/**
 * Fetches the current user's profile with explicit user ID filter.
 * This avoids the RLS issue where .single() returns multiple tenant profiles.
 */
export async function getProfile(): Promise<{ id: string; tenant_id: string }> {
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado. Faça login novamente.')

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', user.id)
        .single()

    if (error || !profile) {
        throw new Error('Perfil de utilizador não encontrado. Faça login novamente.')
    }
    return profile as { id: string; tenant_id: string }
}
