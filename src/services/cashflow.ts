import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

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
    const profile = await getProfile()

    const { data, error } = await (supabase.from('vw_cashflow' as any)
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('transaction_date', { ascending: true }) as any)

    if (error) throw new Error(error.message)
    return (data as CashFlowTransaction[]) ?? []
}
