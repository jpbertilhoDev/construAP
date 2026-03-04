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

export type BudgetChapter = {
    id: string
    budget_id: string
    tenant_id: string
    name: string
    sort_order: number
    created_at: string
    updated_at: string
}

export type BudgetChapterWithItems = BudgetChapter & {
    items: BudgetItem[]
}

export type BudgetWithChapters = Budget & {
    chapters: BudgetChapterWithItems[]
    uncategorizedItems: BudgetItem[] // Items without a chapter
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

export async function fetchBudget(obraId: string): Promise<BudgetWithChapters | null> {
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

    // Fetch chapters
    const { data: chaptersData, error: chaptersError } = await (supabase as any)
        .from('budget_chapters')
        .select('*')
        .eq('budget_id', budget.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

    if (chaptersError) throw new Error(chaptersError.message)

    // Fetch items
    const { data: itemsData, error: itemsError } = await (supabase as any)
        .from('budget_items')
        .select('*')
        .eq('budget_id', budget.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

    if (itemsError) throw new Error(itemsError.message)

    const chapters = (chaptersData as unknown as BudgetChapter[]) ?? []
    const items = (itemsData as unknown as BudgetItem[]) ?? []

    const chaptersWithItems: BudgetChapterWithItems[] = chapters.map(ch => ({
        ...ch,
        items: items.filter(i => i.chapter_id === ch.id)
    }))

    const uncategorizedItems = items.filter(i => !i.chapter_id)

    return {
        ...budget,
        chapters: chaptersWithItems,
        uncategorizedItems,
    }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createBudget(obraId: string): Promise<BudgetWithChapters> {
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
        chapters: [],
        uncategorizedItems: []
    }
}

// ─── Chapters CRUD ────────────────────────────────────────────────────────────

export async function createBudgetChapter(budgetId: string, name: string): Promise<BudgetChapter> {
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single()
    if (!profile) throw new Error('Perfil não encontrado')

    const { data, error } = await (supabase as any)
        .from('budget_chapters')
        .insert({
            budget_id: budgetId,
            tenant_id: (profile as any).tenant_id,
            name,
        })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as any as BudgetChapter
}

export async function updateBudgetChapter(id: string, name: string): Promise<BudgetChapter> {
    const { data, error } = await (supabase as any)
        .from('budget_chapters')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as any as BudgetChapter
}

export async function deleteBudgetChapter(id: string): Promise<void> {
    const { error } = await (supabase as any)
        .from('budget_chapters')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
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

    const { data: insertedData, error } = await (supabase as any)
        .from('budget_items')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
        })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return insertedData as any as BudgetItem
}

export async function updateBudgetItem(id: string, payload: Partial<BudgetItemInsert>): Promise<BudgetItem> {
    const { data: updatedData, error } = await (supabase as any)
        .from('budget_items')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return updatedData as any as BudgetItem
}

export async function deleteBudgetItem(id: string): Promise<void> {
    const { error } = await (supabase as any)
        .from('budget_items')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
