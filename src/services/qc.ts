// @ts-nocheck
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

// ── Types ────────────────────────────────────────────────────────────────────

export type QCChecklist = {
    id: string
    tenant_id: string
    obra_id: string
    fase: string
    title: string
    created_by: string | null
    created_at: string
    items?: QCItem[]
}

export type QCItem = {
    id: string
    tenant_id: string
    checklist_id: string
    description: string
    conforme: boolean | null
    observacoes: string | null
    verificado_por: string | null
    verificado_em: string | null
    created_at: string
}

export type QCNonConformidade = {
    id: string
    tenant_id: string
    obra_id: string
    checklist_id: string | null
    descricao: string
    gravidade: 'Baixa' | 'Média' | 'Alta' | 'Crítica'
    estado: 'Aberta' | 'Em Resolução' | 'Encerrada'
    acao_corretiva: string | null
    reportado_por: string | null
    resolvido_por: string | null
    resolved_at: string | null
    created_at: string
}

// ── Checklist Queries ─────────────────────────────────────────────────────────

export async function fetchChecklists(obra_id: string): Promise<QCChecklist[]> {
    const { data, error } = await supabase
        .from('qc_checklists')
        .select('*, qc_items(*)')
        .eq('obra_id', obra_id)
        .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as QCChecklist[]
}

export async function createChecklist(obra_id: string, fase: string, title: string): Promise<QCChecklist> {
    const profile = await getProfile()

    const { data, error } = await supabase
        .from('qc_checklists')
        .insert({ obra_id, fase, title, tenant_id: profile.tenant_id, created_by: profile.id } as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as QCChecklist
}

export async function deleteChecklist(id: string): Promise<void> {
    const { error } = await supabase.from('qc_checklists').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ── Item Queries ──────────────────────────────────────────────────────────────

export async function createQCItem(checklist_id: string, obra_id: string, description: string): Promise<QCItem> {
    const profile = await getProfile()

    const { data, error } = await supabase
        .from('qc_items')
        .insert({ checklist_id, description, tenant_id: profile.tenant_id } as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as QCItem
}

export async function updateQCItem(id: string, payload: {
    conforme?: boolean | null
    observacoes?: string | null
}): Promise<void> {
    const profile = await getProfile()
    const updatePayload: Record<string, unknown> = { ...payload }
    if (payload.conforme !== undefined) {
        updatePayload.verificado_por = profile.id
        updatePayload.verificado_em = new Date().toISOString()
    }

    const { error } = await supabase
        .from('qc_items')
        .update(updatePayload as never)
        .eq('id', id)

    if (error) throw new Error(error.message)
}

export async function deleteQCItem(id: string): Promise<void> {
    const { error } = await supabase.from('qc_items').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ── Non-Conformidade Queries ──────────────────────────────────────────────────

export async function fetchNonConformidades(obra_id: string): Promise<QCNonConformidade[]> {
    const { data, error } = await supabase
        .from('qc_non_conformidades')
        .select('*')
        .eq('obra_id', obra_id)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as QCNonConformidade[]
}

export async function createNonConformidade(payload: {
    obra_id: string
    descricao: string
    gravidade: string
    checklist_id?: string | null
}): Promise<QCNonConformidade> {
    const profile = await getProfile()

    const { data, error } = await supabase
        .from('qc_non_conformidades')
        .insert({ ...payload, tenant_id: profile.tenant_id, reportado_por: profile.id } as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as QCNonConformidade
}

export async function updateNonConformidade(id: string, payload: {
    estado?: string
    acao_corretiva?: string
    gravidade?: string
}): Promise<void> {
    const profile = await getProfile()
    const update: Record<string, unknown> = { ...payload }
    if (payload.estado === 'Encerrada') {
        update.resolvido_por = profile.id
        update.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase
        .from('qc_non_conformidades')
        .update(update as never)
        .eq('id', id)

    if (error) throw new Error(error.message)
}

export async function deleteNonConformidade(id: string): Promise<void> {
    const { error } = await supabase.from('qc_non_conformidades').delete().eq('id', id)
    if (error) throw new Error(error.message)
}
