import { supabase } from '@/lib/supabase'
import type { PayableStatus } from '@/types/database.types'

export type Payable = {
    id: string
    tenant_id: string
    obra_id: string | null
    supplier_id: string | null
    cost_id: string | null
    description: string
    amount: number
    due_date: string
    status: PayableStatus
    notes: string | null
    created_by: string
    created_at: string
    updated_at: string
    suppliers?: { name: string } | null
    obras?: { name: string } | null
}

export type PayableInsert = {
    obra_id?: string | null
    supplier_id?: string | null
    cost_id?: string | null
    description: string
    amount: number
    due_date: string
    status?: PayableStatus
    notes?: string | null
}

export async function fetchPayables(): Promise<Payable[]> {
    const { data: profileData } = await supabase.from('profiles').select('tenant_id').single()
    const profile = profileData as { tenant_id: string } | null
    if (!profile) throw new Error('Perfil não encontrado')

    const { data, error } = await supabase
        .from('accounts_payable')

        .select(`
            *,
            suppliers(name),
            obras(name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as unknown as Payable[]) ?? []
}

export async function createPayable(payload: PayableInsert): Promise<Payable> {
    const { data: profileData } = await supabase.from('profiles').select('id, tenant_id').single()
    const profile = profileData as { id: string; tenant_id: string } | null
    if (!profile) throw new Error('Perfil não encontrado')

    const { data, error } = await supabase
        .from('accounts_payable')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
            status: payload.status || 'Pendente',
        } as unknown as never)
        .select()
        .single()


    if (error) throw new Error(error.message)
    return data as unknown as Payable
}

export async function updatePayableStatus(id: string, status: PayableStatus): Promise<Payable> {
    const { data, error } = await supabase
        .from('accounts_payable')
        .update({ status } as unknown as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Payable
}

export async function deletePayable(id: string): Promise<void> {
    const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
