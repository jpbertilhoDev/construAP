import { supabase } from '@/lib/supabase'

export type Budget = {
    id: string
    obra_id: string
    tenant_id: string
    version: number
    status: string
    notes: string | null
    approved_by: string | null
    approved_at: string | null
    created_by: string
    created_at: string
    updated_at: string
}

export type BudgetItem = {
    id: string
    budget_id: string
    tenant_id: string
    chapter_id: string | null
    description: string
    unit: string
    qty: number
    unit_price: number
    total: number
    sort_order: number
    created_at: string
    updated_at: string
}

export type BudgetWithItems = Budget & {
    items: BudgetItem[]
}

export type BudgetItemInsert = {
    budget_id: string
    chapter_id?: string | null
    description: string
    unit: string
    qty: number
    unit_price: number
    sort_order?: number
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function fetchBudget(obraId: string): Promise<BudgetWithItems | null> {
    const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('obra_id', obraId)
        .order('version', { ascending: false })
        .limit(1)
        .single()

    const budget = budgetData as unknown as Budget | null

    if (budgetError) {
        if (budgetError.code === 'PGRST116') return null // No budget found
        throw new Error(budgetError.message)
    }

    if (!budget) return null

    const { data: items, error: itemsError } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budget.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

    if (itemsError) throw new Error(itemsError.message)

    return {
        ...budget,
        items: (items as unknown as BudgetItem[]) ?? [],
    }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createBudget(obraId: string): Promise<BudgetWithItems> {
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .single()

    const profile = profileData as { id: string; tenant_id: string } | null

    if (profileError || !profile) {
        throw new Error('Perfil não encontrado')
    }

    const { data: currentBudgetData } = await supabase
        .from('budgets')
        .select('version')
        .eq('obra_id', obraId)
        .order('version', { ascending: false })
        .limit(1)
        .single()

    const currentBudget = currentBudgetData as { version: number } | null

    const nextVersion = currentBudget ? currentBudget.version + 1 : 1

    const { data: insertedData, error } = await supabase
        .from('budgets')
        .insert({
            obra_id: obraId,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
            version: nextVersion,
            status: 'Rascunho',
        } as any)
        .select()
        .single()

    if (error) throw new Error(error.message)

    const newBudget = insertedData as any
    return {
        ...(newBudget as Budget),
        items: [],
    }
}

export async function addBudgetItem(payload: BudgetItemInsert): Promise<BudgetItem> {
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .single()

    const profile = profileData as { tenant_id: string } | null

    if (profileError || !profile) {
        throw new Error('Perfil não encontrado')
    }

    const { data: insertedData, error } = await supabase
        .from('budget_items')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return insertedData as any as BudgetItem
}

export async function updateBudgetItem(id: string, payload: Partial<BudgetItemInsert>): Promise<BudgetItem> {
    const { data: updatedData, error } = await supabase
        .from('budget_items')
        .update({ ...payload, updated_at: new Date().toISOString() } as unknown as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return updatedData as any as BudgetItem
}

export async function deleteBudgetItem(id: string): Promise<void> {
    const { error } = await supabase
        .from('budget_items')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
