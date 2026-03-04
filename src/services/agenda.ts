// @ts-nocheck
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

// ── Types ────────────────────────────────────────────────────────────────────

export type Milestone = {
    id: string
    tenant_id: string
    obra_id: string
    title: string
    date: string
    type: 'Início' | 'Fim Previsto' | 'Marco' | 'Entrega' | 'Inspeção'
    completed: boolean
    notas: string | null
    created_by: string | null
    created_at: string
    // joined
    obras?: { name: string; status: string } | null
}

export type MilestoneInsert = {
    obra_id: string
    title: string
    date: string
    type?: string
    completed?: boolean
    notas?: string | null
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function fetchMilestones(filters?: { obra_id?: string }): Promise<Milestone[]> {
    let q = supabase
        .from('obra_milestones')
        .select('*, obras(name, status)')
        .order('date', { ascending: true })

    if (filters?.obra_id) {
        q = q.eq('obra_id', filters.obra_id)
    }

    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []) as Milestone[]
}

export async function fetchAgendaMilestones(): Promise<Milestone[]> {
    // All milestones with obra info for the agenda calendar view
    const { data, error } = await supabase
        .from('obra_milestones')
        .select('*, obras(name, status, start_date, end_date_planned)')
        .order('date', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as Milestone[]
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createMilestone(payload: MilestoneInsert): Promise<Milestone> {
    const profile = await getProfile()

    const { data, error } = await supabase
        .from('obra_milestones')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
        } as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as Milestone
}

export async function toggleMilestone(id: string, completed: boolean): Promise<void> {
    const { error } = await supabase
        .from('obra_milestones')
        .update({ completed } as never)
        .eq('id', id)

    if (error) throw new Error(error.message)
}

export async function updateMilestone(id: string, payload: Partial<MilestoneInsert>): Promise<void> {
    const { error } = await supabase
        .from('obra_milestones')
        .update(payload as never)
        .eq('id', id)

    if (error) throw new Error(error.message)
}

export async function deleteMilestone(id: string): Promise<void> {
    const { error } = await supabase
        .from('obra_milestones')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
