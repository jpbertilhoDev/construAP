import { supabase } from '@/lib/supabase'

// ── Types ───────────────────────────────────────────────────

export type WorkersByCategory = Record<string, number>

export type EquipmentEntry = {
    name: string
    hours: number
}

export type StructuredActivity = {
    description: string
    chapter?: string
}

export type DiarioIncident = {
    id: string
    entry_id: string
    tenant_id: string
    description: string
    severity: 'Baixa' | 'Média' | 'Alta' | 'Crítica'
    created_at: string
}

export type DiarioPhoto = {
    id: string
    entry_id: string
    tenant_id: string
    storage_path: string
    caption: string | null
    uploaded_at: string
}

export type DiarioEntry = {
    id: string
    obra_id: string
    tenant_id: string
    entry_date: string
    weather: string | null
    temp_min: number | null
    temp_max: number | null
    work_shift: string
    resources_count: number
    workers_by_category: WorkersByCategory
    equipment_used: EquipmentEntry[]
    structured_activities: StructuredActivity[]
    activities: string | null
    notes: string | null
    progress_pct: number
    created_by: string
    created_at: string
    updated_at: string
    diario_incidents?: DiarioIncident[]
    diario_photos?: DiarioPhoto[]
    profiles?: { name: string } | null
}

export type DiarioEntryInsert = {
    obra_id: string
    entry_date: string
    weather?: string | null
    temp_min?: number | null
    temp_max?: number | null
    work_shift?: string
    resources_count?: number
    workers_by_category?: WorkersByCategory
    equipment_used?: EquipmentEntry[]
    structured_activities?: StructuredActivity[]
    activities?: string | null
    notes?: string | null
    progress_pct?: number
}

// ── Helpers ─────────────────────────────────────────────────

async function getProfile(): Promise<{ id: string; tenant_id: string }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilizador não autenticado')

    const { data, error } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', user.id)
        .single()

    const profile = data as { id: string; tenant_id: string } | null
    if (error || !profile) throw new Error('Perfil não encontrado')
    return profile
}

function sumWorkers(workers: WorkersByCategory | undefined): number {
    if (!workers) return 0
    return Object.values(workers).reduce((sum, n) => sum + n, 0)
}

// ── Diary Entries CRUD ──────────────────────────────────────

const ENTRY_SELECT = `
    *,
    diario_incidents(*),
    diario_photos(*),
    profiles!diario_entries_created_by_fkey(name)
`

export async function fetchDiarioEntries(obraId: string): Promise<DiarioEntry[]> {
    const { data, error } = await supabase
        .from('diario_entries')
        .select(ENTRY_SELECT)
        .eq('obra_id', obraId)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as unknown as DiarioEntry[] | null) ?? []
}

export async function fetchDiarioEntriesByDateRange(
    obraId: string,
    startDate: string,
    endDate: string,
): Promise<DiarioEntry[]> {
    const { data, error } = await supabase
        .from('diario_entries')
        .select(ENTRY_SELECT)
        .eq('obra_id', obraId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: true })

    if (error) throw new Error(error.message)
    return (data as unknown as DiarioEntry[] | null) ?? []
}

export async function createDiarioEntry(payload: DiarioEntryInsert): Promise<DiarioEntry> {
    const profile = await getProfile()

    const totalWorkers = payload.workers_by_category
        ? sumWorkers(payload.workers_by_category)
        : payload.resources_count || 0

    const { data, error } = await supabase
        .from('diario_entries')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
            resources_count: totalWorkers,
        } as unknown as never)
        .select(ENTRY_SELECT)
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as DiarioEntry
}

export async function updateDiarioEntry(
    id: string,
    payload: Partial<DiarioEntryInsert>,
): Promise<DiarioEntry> {
    const updatePayload: Record<string, unknown> = {
        ...payload,
        updated_at: new Date().toISOString(),
    }

    if (payload.workers_by_category) {
        updatePayload.resources_count = sumWorkers(payload.workers_by_category)
    }

    const { data, error } = await supabase
        .from('diario_entries')
        .update(updatePayload as unknown as never)
        .eq('id', id)
        .select(ENTRY_SELECT)
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as DiarioEntry
}

export async function deleteDiarioEntry(id: string): Promise<void> {
    const { error } = await supabase
        .from('diario_entries')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}

// ── Incidents CRUD ──────────────────────────────────────────

export async function createDiarioIncident(
    entryId: string,
    description: string,
    severity: string,
): Promise<DiarioIncident> {
    const profile = await getProfile()

    const { data, error } = await supabase
        .from('diario_incidents')
        .insert({
            entry_id: entryId,
            tenant_id: profile.tenant_id,
            description,
            severity,
        } as unknown as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as DiarioIncident
}

export async function deleteDiarioIncident(id: string): Promise<void> {
    const { error } = await supabase
        .from('diario_incidents')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}

// ── Photos CRUD ─────────────────────────────────────────────

export async function uploadDiarioPhoto(
    entryId: string,
    obraId: string,
    file: File,
    caption?: string,
): Promise<DiarioPhoto> {
    const profile = await getProfile()

    const fileExt = file.name.split('.').pop() ?? 'jpg'
    const fileName = `diario_${String(Date.now())}.${fileExt}`
    const storagePath = `${profile.tenant_id}/${obraId}/diario/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false })
    if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

    const { data, error } = await supabase
        .from('diario_photos')
        .insert({
            entry_id: entryId,
            tenant_id: profile.tenant_id,
            storage_path: storagePath,
            caption: caption || null,
        } as unknown as never)
        .select()
        .single()

    if (error) {
        await supabase.storage.from('documentos').remove([storagePath])
        throw new Error(error.message)
    }
    return data as unknown as DiarioPhoto
}

export async function deleteDiarioPhoto(id: string, storagePath: string): Promise<void> {
    const { error } = await supabase
        .from('diario_photos')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
    await supabase.storage.from('documentos').remove([storagePath])
}

export async function getDiarioPhotoUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(storagePath, 3600)

    if (error) throw new Error(error.message)
    return data.signedUrl
}
