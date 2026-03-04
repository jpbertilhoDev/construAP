// @ts-nocheck
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

// ── Types ────────────────────────────────────────────────────────────────────

export type Client = {
    id: string
    tenant_id: string
    name: string
    nif: string | null
    email: string | null
    telefone: string | null
    morada: string | null
    cidade: string | null
    codigo_postal: string | null
    notas: string | null
    created_at: string
    updated_at: string
}

export type ClientInsert = {
    name: string
    nif?: string | null
    email?: string | null
    telefone?: string | null
    morada?: string | null
    cidade?: string | null
    codigo_postal?: string | null
    notas?: string | null
}

export type ClientUpdate = Partial<ClientInsert>

// ── Queries ──────────────────────────────────────────────────────────────────

export async function fetchClients(): Promise<Client[]> {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as Client[]
}

export async function fetchClient(id: string): Promise<Client> {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data as Client
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createClient(payload: ClientInsert): Promise<Client> {
    const profile = await getProfile()

    const { data, error } = await supabase
        .from('clients')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
        } as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as Client
}

export async function updateClient(id: string, payload: ClientUpdate): Promise<Client> {
    const { data, error } = await supabase
        .from('clients')
        .update({ ...payload, updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as Client
}

export async function deleteClient(id: string): Promise<void> {
    const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
