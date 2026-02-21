import { supabase } from '@/lib/supabase'

export type CashFlowTransaction = {
    tenant_id: string
    transaction_date: string
    obra_id: string | null
    obra_name: string | null
    method: string
    inflow: number
    outflow: number
    net_amount: number
    description: string | null
}

export async function fetchCashflow(): Promise<CashFlowTransaction[]> {
    const { data: profileData } = await supabase.from('profiles').select('tenant_id').single()
    const profile = profileData as { tenant_id: string } | null
    if (!profile) throw new Error('Perfil não encontrado')

    const { data, error } = await (supabase.from('vw_cashflow' as any)
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('transaction_date', { ascending: true }) as any)

    if (error) throw new Error(error.message)
    return (data as CashFlowTransaction[]) ?? []
}
