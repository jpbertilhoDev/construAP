import { supabase } from '@/lib/supabase'

export type CostStatus = 'Rascunho' | 'Pendente Aprovação' | 'Aprovado' | 'Anulado'

export type Cost = {
    id: string
    obra_id: string
    tenant_id: string
    budget_item_id: string | null
    chapter_id: string | null
    supplier_id: string | null
    description: string
    amount: number
    cost_date: string
    doc_url: string | null
    doc_number: string | null
    status: CostStatus
    notes: string | null
    approved_by: string | null
    approved_at: string | null
    created_by: string
    created_at: string
    updated_at: string
    suppliers?: { name: string } | null
}


export type CostInsert = {
    obra_id: string
    description: string
    amount: number
    cost_date: string
    status?: CostStatus
    notes?: string | null
    doc_url?: string | null
    supplier_id?: string | null
    budget_item_id?: string | null
    file?: File | null
}


export async function fetchCosts(obraId: string): Promise<Cost[]> {
    const { data, error } = await supabase
        .from('costs')
        .select('*, suppliers(name)')
        .eq('obra_id', obraId)

        .order('cost_date', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as unknown as Cost[]) ?? []
}

export async function createCost(payload: CostInsert): Promise<Cost> {
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .single()

    const profile = profileData as { id: string; tenant_id: string } | null
    if (profileError || !profile) {
        throw new Error('Perfil não encontrado')
    }

    // Prepare insert payload without the 'file' object
    const { file, ...insertPayload } = payload

    const { data: insertedData, error } = await supabase
        .from('costs')
        .insert({
            ...insertPayload,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
            status: payload.status || 'Rascunho',
        } as unknown as never)
        .select()
        .single()

    if (error) throw new Error(error.message)

    let docUrl = null
    const newCost = insertedData as unknown as Cost

    if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `${profile.tenant_id}/${payload.obra_id}/custos/${newCost.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('custos-anexos')
            .upload(filePath, file)

        if (!uploadError) {
            // Get public URL or store just the path
            // Let's store the full public URL for simplicity in this MVP
            const { data: urlData } = supabase.storage
                .from('custos-anexos')
                .getPublicUrl(filePath)

            docUrl = urlData.publicUrl

            // Update the record with the docUrl
            await supabase
                .from('costs')
                .update({ doc_url: docUrl } as unknown as never)
                .eq('id', newCost.id)

            newCost.doc_url = docUrl
        } else {
            console.error('File upload failed:', uploadError)
        }
    }

    return newCost
}


export async function updateCost(id: string, payload: Partial<CostInsert>): Promise<Cost> {
    const { data: updatedData, error } = await supabase
        .from('costs')
        .update({ ...payload, updated_at: new Date().toISOString() } as unknown as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return updatedData as unknown as Cost
}

export async function deleteCost(id: string): Promise<void> {
    const { error } = await supabase
        .from('costs')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
