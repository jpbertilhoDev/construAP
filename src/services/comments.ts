import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

export type ObraComment = {
    id: string
    tenant_id: string
    obra_id: string
    user_id: string
    text: string
    created_at: string
    // Joined profile info
    profiles?: {
        full_name: string | null
        role: string
    } | null
}

export async function fetchComments(obraId: string): Promise<ObraComment[]> {
    const { data, error } = await supabase
        .from('obra_comments')
        .select(`
            *,
            profiles:user_id ( full_name, role )
        `)
        .eq('obra_id', obraId)
        .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as ObraComment[]
}

export async function createComment(obra_id: string, text: string): Promise<ObraComment> {
    const profile = await getProfile()

    if (!text.trim()) throw new Error('O comentário não pode ser vazio.')

    const { data, error } = await supabase
        .from('obra_comments')
        .insert({
            tenant_id: profile.tenant_id,
            obra_id,
            user_id: profile.id,
            text: text.trim(),
        } as never)
        .select(`
            *,
            profiles:user_id ( full_name, role )
        `)
        .single()

    if (error) throw new Error(error.message)
    return data as ObraComment
}

export async function deleteComment(id: string): Promise<void> {
    const { error } = await supabase
        .from('obra_comments')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
