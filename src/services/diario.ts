import { supabase } from '@/lib/supabase'

export type DiarioEntry = {
    id: string
    obra_id: string
    tenant_id: string
    entry_date: string
    weather: string | null
    resources_count: number
    activities: string | null
    notes: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export type DiarioEntryInsert = {
    obra_id: string
    entry_date: string
    weather?: string | null
    resources_count?: number
    activities?: string | null
    notes?: string | null
}

export async function fetchDiarioEntries(obraId: string): Promise<DiarioEntry[]> {
    const { data, error } = await supabase
        .from('diario_entries')
        .select('*')
        .eq('obra_id', obraId)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as unknown as DiarioEntry[]) ?? []
}

export async function createDiarioEntry(payload: DiarioEntryInsert): Promise<DiarioEntry> {
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .single()

    const profile = profileData as { id: string; tenant_id: string } | null
    if (profileError || !profile) {
        throw new Error('Perfil não encontrado')
    }

    const { data: insertedData, error } = await supabase
        .from('diario_entries')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
            resources_count: payload.resources_count || 0,
        } as unknown as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return insertedData as unknown as DiarioEntry
}

export async function updateDiarioEntry(id: string, payload: Partial<DiarioEntryInsert>): Promise<DiarioEntry> {
    const { data: updatedData, error } = await supabase
        .from('diario_entries')
        .update({ ...payload, updated_at: new Date().toISOString() } as unknown as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return updatedData as unknown as DiarioEntry
}

export async function deleteDiarioEntry(id: string): Promise<void> {
    const { error } = await supabase
        .from('diario_entries')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
