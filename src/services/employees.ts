// @ts-nocheck
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EmployeeRole {
    id: string
    tenant_id: string
    nome: string
    descricao?: string
    created_at: string
}

export interface Employee {
    id: string
    tenant_id: string
    role_id?: string
    nome: string
    nif?: string
    email?: string
    telefone?: string
    morada?: string
    data_nascimento?: string
    data_admissao?: string
    estado: 'Ativo' | 'Inativo' | 'Suspenso'
    notas?: string
    avatar_url?: string
    situacao_fiscal: 'solteiro' | 'casado_2_titulares' | 'casado_unico_titular'
    numero_dependentes: number
    niss?: string
    iban?: string
    created_by: string
    created_at: string
    updated_at: string
    employee_roles?: { nome: string } | null
}

export interface EmployeeRate {
    id: string
    tenant_id: string
    employee_id: string
    tipo: 'hourly' | 'daily' | 'monthly'
    valor: number
    data_inicio: string
    data_fim?: string
    notas?: string
    created_at: string
}

export interface Allocation {
    id: string
    tenant_id: string
    employee_id: string
    obra_id: string
    data_inicio: string
    data_fim?: string
    notas?: string
    created_at: string
    employees?: { nome: string; estado: string } | null
    obras?: { name: string; ref?: string } | null
}

export interface Timesheet {
    id: string
    tenant_id: string
    employee_id: string
    obra_id: string
    data: string
    horas?: number
    presenca: boolean
    observacao?: string
    estado: 'Rascunho' | 'Submetido' | 'Aprovado' | 'Rejeitado'
    motivo_rejeicao?: string
    aprovado_por?: string
    aprovado_em?: string
    custo_calculado?: number
    cost_entry_id?: string
    created_by: string
    created_at: string
    updated_at: string
    employees?: { nome: string } | null
    obras?: { name: string; ref?: string } | null
}

// ── Employee Roles ─────────────────────────────────────────────────────────────

export async function fetchEmployeeRoles(): Promise<EmployeeRole[]> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('employee_roles')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('nome')
    if (error) throw new Error(error.message)
    return (data ?? []) as EmployeeRole[]
}

export async function createEmployeeRole(payload: Pick<EmployeeRole, 'nome' | 'descricao'>): Promise<EmployeeRole> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('employee_roles')
        .insert({ ...payload, tenant_id: profile.tenant_id })
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as EmployeeRole
}

export async function deleteEmployeeRole(id: string): Promise<void> {
    const { error } = await supabase.from('employee_roles').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ── Employees ──────────────────────────────────────────────────────────────────

export async function fetchEmployees(includeInactive = false): Promise<Employee[]> {
    const profile = await getProfile()
    let query = supabase
        .from('employees')
        .select('*, employee_roles(nome)')
        .eq('tenant_id', profile.tenant_id)
        .order('nome')
    if (!includeInactive) query = query.eq('estado', 'Ativo')
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as Employee[]
}

export async function fetchEmployee(id: string): Promise<Employee> {
    const { data, error } = await supabase
        .from('employees')
        .select('*, employee_roles(nome)')
        .eq('id', id)
        .single()
    if (error) throw new Error(error.message)
    return data as unknown as Employee
}

export async function createEmployee(payload: Omit<Employee, 'id' | 'tenant_id' | 'created_by' | 'created_at' | 'updated_at' | 'employee_roles'>): Promise<Employee> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('employees')
        .insert({ ...payload, tenant_id: profile.tenant_id, created_by: profile.id } as never)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as Employee
}

export async function updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
        .from('employees')
        .update(payload as never)
        .eq('id', id)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as Employee
}

export async function uploadAvatar(employeeId: string, file: File): Promise<string> {
    const profile = await getProfile()

    // 1. Upload file
    const fileExt = file.name.split('.').pop()
    const fileName = `${employeeId}-${Date.now()}.${fileExt}`
    const storagePath = `${profile.tenant_id}/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('avatares')
        .upload(storagePath, file)

    if (uploadError) {
        console.error('Supabase upload error:', uploadError)
        throw new Error(uploadError.message)
    }

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('avatares')
        .getPublicUrl(storagePath)

    // 3. Update employee record
    const { error: updateError } = await supabase
        .from('employees')
        .update({ avatar_url: publicUrl } as never)
        .eq('id', employeeId)

    if (updateError) throw new Error(updateError.message)

    return publicUrl
}

export async function deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ── Employee Rates ─────────────────────────────────────────────────────────────

export async function fetchEmployeeRates(employeeId: string): Promise<EmployeeRate[]> {
    const { data, error } = await supabase
        .from('employee_rates')
        .select('*')
        .eq('employee_id', employeeId)
        .order('data_inicio', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as EmployeeRate[]
}

export async function createEmployeeRate(payload: Omit<EmployeeRate, 'id' | 'tenant_id' | 'created_at'>): Promise<EmployeeRate> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('employee_rates')
        .insert({ ...payload, tenant_id: profile.tenant_id, created_by: profile.id } as never)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as EmployeeRate
}

/** Retorna a taxa activa para data=hoje */
export async function getActiveRate(employeeId: string): Promise<EmployeeRate | null> {
    const today = new Date().toISOString().substring(0, 10)
    const { data, error } = await supabase
        .from('employee_rates')
        .select('*')
        .eq('employee_id', employeeId)
        .lte('data_inicio', today)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (error) throw new Error(error.message)
    return data as EmployeeRate | null
}

export async function getActiveRateAtDate(employeeId: string, date: string): Promise<EmployeeRate | null> {
    const { data, error } = await supabase
        .from('employee_rates')
        .select('*')
        .eq('employee_id', employeeId)
        .lte('data_inicio', date)
        .or(`data_fim.is.null,data_fim.gte.${date}`)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (error) throw new Error(error.message)
    return data as EmployeeRate | null
}

// ── Allocations ────────────────────────────────────────────────────────────────

export async function fetchAllocations(filters: { employee_id?: string; obra_id?: string } = {}): Promise<Allocation[]> {
    const profile = await getProfile()
    let query = supabase
        .from('allocations')
        .select('*, employees(nome, estado, avatar_url, employee_roles(nome)), obras(name, ref)')
        .eq('tenant_id', profile.tenant_id)
        .order('data_inicio', { ascending: false })
    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.obra_id) query = query.eq('obra_id', filters.obra_id)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as Allocation[]
}

export async function createAllocation(payload: Omit<Allocation, 'id' | 'tenant_id' | 'created_at' | 'employees' | 'obras'>): Promise<Allocation> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('allocations')
        .insert({ ...payload, tenant_id: profile.tenant_id, created_by: profile.id } as never)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as Allocation
}

export async function updateAllocation(id: string, payload: Partial<Allocation>): Promise<void> {
    const { error } = await supabase.from('allocations').update(payload as never).eq('id', id)
    if (error) throw new Error(error.message)
}

export async function deleteAllocation(id: string): Promise<void> {
    const { error } = await supabase.from('allocations').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ── Timesheets ─────────────────────────────────────────────────────────────────

export async function fetchTimesheets(filters: {
    employee_id?: string
    obra_id?: string
    estado?: string
    data_inicio?: string
    data_fim?: string
} = {}): Promise<Timesheet[]> {
    const profile = await getProfile()
    let query = supabase
        .from('timesheets')
        .select('*, employees(nome), obras(name, ref)')
        .eq('tenant_id', profile.tenant_id)
        .order('data', { ascending: false })
    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.obra_id) query = query.eq('obra_id', filters.obra_id)
    if (filters.estado) query = query.eq('estado', filters.estado)
    if (filters.data_inicio) query = query.gte('data', filters.data_inicio)
    if (filters.data_fim) query = query.lte('data', filters.data_fim)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as Timesheet[]
}

export async function createTimesheet(payload: Pick<Timesheet, 'employee_id' | 'obra_id' | 'data' | 'horas' | 'presenca' | 'observacao'>): Promise<Timesheet> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('timesheets')
        .insert({ ...payload, estado: 'Submetido', tenant_id: profile.tenant_id, created_by: profile.id } as never)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as Timesheet
}

export async function approveTimesheet(id: string): Promise<void> {
    const profile = await getProfile()

    // 1. Buscar timesheet + taxa activa
    const { data: ts, error: tsErr } = await supabase
        .from('timesheets')
        .select('*, employees(id)')
        .eq('id', id)
        .single()
    if (tsErr || !ts) throw new Error(tsErr?.message ?? 'Timesheet não encontrado')

    // 2. Calcular custo
    const rate = await getActiveRate(ts.employee_id)
    let custo = 0
    if (rate) {
        if (rate.tipo === 'hourly') custo = (ts.horas ?? 8) * rate.valor
        else if (rate.tipo === 'daily') custo = rate.valor  // 1 dia = valor diário
        else if (rate.tipo === 'monthly') custo = rate.valor / 22  // mensal → dia
    }

    // 3. Gerar lançamento de custo no Financeiro
    let costEntryId: string | undefined
    if (custo > 0) {
        const { data: cost, error: costErr } = await supabase
            .from('costs')
            .insert({
                obra_id: ts.obra_id,
                tenant_id: profile.tenant_id,
                description: `Mão de obra — ${ts.data}`,
                amount: custo,
                cost_date: ts.data,
                status: 'Aprovado',
                notes: `Apontamento aprovado por ${profile.name}`,
                created_by: profile.id,
            } as never)
            .select('id')
            .single()
        if (costErr) throw new Error(costErr.message)
        costEntryId = cost?.id
    }

    // 4. Atualizar timesheet
    const { error } = await supabase
        .from('timesheets')
        .update({
            estado: 'Aprovado',
            aprovado_por: profile.id,
            aprovado_em: new Date().toISOString(),
            custo_calculado: custo,
            cost_entry_id: costEntryId,
        } as never)
        .eq('id', id)
    if (error) throw new Error(error.message)
}

export async function rejectTimesheet(id: string, motivo: string): Promise<void> {
    const { error } = await supabase
        .from('timesheets')
        .update({ estado: 'Rejeitado', motivo_rejeicao: motivo } as never)
        .eq('id', id)
    if (error) throw new Error(error.message)
}

export async function updateTimesheet(id: string, payload: Partial<Pick<Timesheet, 'horas' | 'presenca' | 'observacao'>>): Promise<void> {
    const { error } = await supabase
        .from('timesheets')
        .update(payload as never)
        .eq('id', id)
        .eq('estado', 'Rascunho')
    if (error) throw new Error(error.message)
}

export async function deleteTimesheet(id: string): Promise<void> {
    const { error } = await supabase
        .from('timesheets')
        .delete()
        .eq('id', id)
        .neq('estado', 'Aprovado')
    if (error) throw new Error(error.message)
}
