import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

export type Supplier = {
    id: string
    tenant_id: string
    name: string
    nif: string | null
    email: string | null
    phone: string | null
    category: string | null
    created_at: string
    updated_at: string
}

export type SupplierInsert = {
    name: string
    nif?: string | null
    email?: string | null
    phone?: string | null
    category?: string | null
}

export async function fetchSuppliers(): Promise<Supplier[]> {
    const profile = await getProfile()

    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', profile.tenant_id)

        .order('name', { ascending: true })

    if (error) throw new Error(error.message)
    return (data as unknown as Supplier[]) ?? []
}

export async function createSupplier(payload: SupplierInsert): Promise<Supplier> {
    const profile = await getProfile()


    const { data, error } = await supabase
        .from('suppliers')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
        } as unknown as never)

        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Supplier
}
