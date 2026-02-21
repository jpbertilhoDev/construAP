import { supabase } from '@/lib/supabase'
import type { ReceivableStatus } from '@/types/database.types'

export type Receivable = {
    id: string
    tenant_id: string
    obra_id: string | null
    client_id: string | null
    description: string
    amount: number
    due_date: string
    status: ReceivableStatus
    notes: string | null
    created_by: string
    created_at: string
    updated_at: string
    clients?: { name: string } | null
    obras?: { name: string } | null
}

export type ReceivableInsert = {
    obra_id?: string | null
    client_id?: string | null
    description: string
    amount: number
    due_date: string
    status?: ReceivableStatus
    notes?: string | null
}

export async function fetchReceivables(): Promise<Receivable[]> {
    const { data: profileData } = await supabase.from('profiles').select('tenant_id').single()
    const profile = profileData as { tenant_id: string } | null
    if (!profile) throw new Error('Perfil não encontrado')


    const { data, error } = await (supabase
        .from('accounts_receivable')
        .select(`
            *,
            clients(name),
            obras(name)
        `) as any)
        .eq('tenant_id', profile.tenant_id)
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: false })


    if (error) throw new Error(error.message)
    return (data as unknown as Receivable[]) ?? []
}

export async function fetchReceivablesByObra(obraId: string): Promise<Receivable[]> {
    const { data, error } = await (supabase
        .from('accounts_receivable')
        .select(`
            *,
            clients(name),
            obras(name)
        `) as any)
        .eq('obra_id', obraId)
        .order('due_date', { ascending: true })


    if (error) throw new Error(error.message)
    return (data as unknown as Receivable[]) ?? []
}

export async function createReceivable(payload: ReceivableInsert): Promise<Receivable> {
    const { data: profileData } = await supabase.from('profiles').select('id, tenant_id').single()
    const profile = profileData as { id: string; tenant_id: string } | null
    if (!profile) throw new Error('Perfil não encontrado')

    const { data, error } = await supabase
        .from('accounts_receivable')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
            status: payload.status || 'Pendente',
        } as unknown as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Receivable
}

export async function updateReceivableStatus(id: string, status: ReceivableStatus): Promise<Receivable> {
    const { data, error } = await supabase
        .from('accounts_receivable')
        .update({ status } as unknown as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Receivable
}

export async function deleteReceivable(id: string): Promise<void> {
    const { error } = await supabase
        .from('accounts_receivable')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
