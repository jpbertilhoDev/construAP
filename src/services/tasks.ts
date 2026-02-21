import { supabase } from '@/lib/supabase'

export type TaskStatus = 'Aberta' | 'Em Curso' | 'Concluída' | 'Cancelada'
export type TaskPriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica'

export type Task = {
    id: string
    obra_id: string
    tenant_id: string
    title: string
    description: string | null
    assignee_id: string | null
    due_date: string | null
    status: TaskStatus
    priority: TaskPriority
    created_by: string
    created_at: string
    updated_at: string
}

export type TaskInsert = {
    obra_id: string
    title: string
    description?: string | null
    assignee_id?: string | null
    due_date?: string | null
    status?: TaskStatus
    priority?: TaskPriority
}

export async function fetchTasks(obraId: string): Promise<Task[]> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as unknown as Task[]) ?? []
}

export async function createTask(payload: TaskInsert): Promise<Task> {
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .single()

    const profile = profileData as { id: string; tenant_id: string } | null
    if (profileError || !profile) {
        throw new Error('Perfil não encontrado')
    }

    const { data: insertedData, error } = await supabase
        .from('tasks')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
            status: payload.status || 'Aberta',
            priority: payload.priority || 'Média',
        } as unknown as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return insertedData as unknown as Task
}

export async function updateTask(id: string, payload: Partial<TaskInsert>): Promise<Task> {
    const { data: updatedData, error } = await supabase
        .from('tasks')
        .update({ ...payload, updated_at: new Date().toISOString() } as unknown as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return updatedData as unknown as Task
}

export async function deleteTask(id: string): Promise<void> {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}
