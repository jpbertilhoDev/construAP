import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

export type Obra = {
    id: string
    tenant_id: string
    name: string
    ref: string | null
    client_id: string | null
    address: string | null
    type: string
    status: string
    start_date: string | null
    end_date_planned: string | null
    end_date_actual: string | null
    contract_value: number
    created_by: string
    created_at: string

    updated_at: string
}

export type ObraWithClient = Obra & {
    clients?: { name: string } | null
}

export type ObraInsert = {
    name: string
    ref?: string | null
    address?: string | null
    type: string
    status: string
    start_date?: string | null
    end_date_planned?: string | null
    end_date_actual?: string | null
    contract_value?: number
    client_id?: string | null
}


export type ObraUpdate = Partial<ObraInsert>

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function fetchObras(): Promise<ObraWithClient[]> {
    const { data, error } = await supabase
        .from('obras')
        .select('*, clients(name)')
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as ObraWithClient[]
}

export async function fetchObra(id: string): Promise<ObraWithClient> {
    const { data, error } = await supabase
        .from('obras')
        .select('*, clients(name)')
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as ObraWithClient
}

export type ObraFinancials = {
    obra_id: string
    tenant_id: string
    obra_name: string
    status: string
    total_budgeted: number
    total_costs: number
    deviation: number
    deviation_pct: number | null
}

export async function fetchObraFinancials(id: string): Promise<ObraFinancials | null> {
    const { data, error } = await supabase
        .from('vw_obra_financials')
        .select('*')
        .eq('obra_id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null // No rows
        throw new Error(error.message)
    }
    return data as unknown as ObraFinancials
}



export async function fetchAllObraFinancials(): Promise<ObraFinancials[]> {
    const { data, error } = await supabase
        .from('vw_obra_financials')
        .select('*')

    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as ObraFinancials[]
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createObra(payload: ObraInsert): Promise<Obra> {
    const profile = await getProfile()

    const { data, error } = await supabase
        .from('obras')
        .insert({
            ...payload,
            tenant_id: (profile as { id: string; tenant_id: string }).tenant_id,
            created_by: (profile as { id: string; tenant_id: string }).id,
        } as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Obra
}

export async function updateObra(id: string, payload: ObraUpdate): Promise<Obra> {
    const { data, error } = await supabase
        .from('obras')
        .update({ ...payload, updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Obra
}

export async function deleteObra(id: string): Promise<void> {
    const { error } = await supabase
        .from('obras')
        .update({ status: 'Arquivada' } as never)
        .eq('id', id)

    if (error) throw new Error(error.message)
}
