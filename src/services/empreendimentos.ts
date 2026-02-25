import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

// ─── Types ──────────────────────────────────────────────────

export type EmpreendimentoEstado = 'Em Construção' | 'Em Comercialização' | 'Concluído' | 'Suspenso' | 'Arquivado'

export type Empreendimento = {
    id: string
    tenant_id: string
    obra_id: string | null
    name: string
    address: string | null
    descricao: string | null
    concelho: string | null
    distrito: string | null
    promotor: string | null
    arquiteto: string | null
    ano_construcao: number | null
    estado: EmpreendimentoEstado
    dias_reserva: number
    total_units: number
    archived_at: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    // Computed from fracoes
    _count?: {
        total: number
        disponiveis: number
        reservados: number
        vendidos: number
        bloqueados: number
    }
}

export type EmpreendimentoInsert = {
    name: string
    address?: string | null
    descricao?: string | null
    concelho?: string | null
    distrito?: string | null
    promotor?: string | null
    arquiteto?: string | null
    ano_construcao?: number | null
    estado?: EmpreendimentoEstado
    dias_reserva?: number
    obra_id?: string | null
}

// ─── Service Functions ───────────────────────────────────────

// getProfile imported from @/lib/getProfile

export async function fetchEmpreendimentos(includeArchived = false): Promise<Empreendimento[]> {
    const profile = await getProfile()

    let query = supabase
        .from('empreendimentos')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })

    if (!includeArchived) {
        query = query.is('archived_at', null)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data as unknown as Empreendimento[]) ?? []
}

export async function fetchEmpreendimento(id: string): Promise<Empreendimento> {
    const { data, error } = await supabase
        .from('empreendimentos')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Empreendimento
}

export async function createEmpreendimento(payload: EmpreendimentoInsert): Promise<Empreendimento> {
    const profile = await getProfile()

    const { data, error } = await supabase
        .from('empreendimentos')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
        } as unknown as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Empreendimento
}

export async function updateEmpreendimento(id: string, payload: Partial<EmpreendimentoInsert>): Promise<Empreendimento> {
    const { data, error } = await supabase
        .from('empreendimentos')
        .update(payload as unknown as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Empreendimento
}

export async function archiveEmpreendimento(id: string): Promise<void> {
    const { error } = await supabase
        .from('empreendimentos')
        .update({ archived_at: new Date().toISOString() } as unknown as never)
        .eq('id', id)

    if (error) throw new Error(error.message)
}

export async function deleteEmpreendimento(id: string): Promise<void> {
    const { error } = await supabase
        .from('empreendimentos')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
