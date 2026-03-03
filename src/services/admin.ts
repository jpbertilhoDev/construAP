// @ts-nocheck
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

// ── Types ───────────────────────────────────────────────────────────────────

export interface Role {
    id: string
    tenant_id: string
    name: string
    description?: string
    is_system_default: boolean
    created_at: string
    updated_at: string
    permission_count?: number
}

export interface Permission {
    id: string
    key: string
    module: string
    description?: string
    created_at: string
}

export interface RolePermission {
    role_id: string
    permission_id: string
    created_at: string
}

export type UserStatus = 'active' | 'pending' | 'orphan'

export interface UserWithRoles {
    id: string
    email?: string
    name?: string
    avatar_url?: string
    tenant_id?: string
    created_at?: string
    last_sign_in_at?: string | null
    status: UserStatus
    inCurrentTenant: boolean
    roles: {
        id: string
        name: string
        obra_id?: string
        custom_role_id?: string
    }[]
}

export interface TenantSettings {
    id: string
    name: string
    plan?: string
    created_at?: string
    updated_at?: string
    logo_url?: string
    address?: string
    nif?: string
    phone?: string
    email?: string
}

// ── Roles ───────────────────────────────────────────────────────────────────

export async function fetchRoles(): Promise<Role[]> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []) as Role[]
}

export async function createRole(payload: Pick<Role, 'name' | 'description'>): Promise<Role> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('roles')
        .insert({
            name: payload.name,
            description: payload.description,
            tenant_id: profile.tenant_id,
            is_system_default: false,
        })
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as Role
}

export async function updateRole(id: string, payload: Pick<Role, 'name' | 'description'>): Promise<Role> {
    const { data, error } = await supabase
        .from('roles')
        .update({ name: payload.name, description: payload.description })
        .eq('id', id)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as Role
}

export async function deleteRole(id: string): Promise<void> {
    const { error } = await supabase.from('roles').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ── Permissions ─────────────────────────────────────────────────────────────

export async function fetchPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module')
    if (error) throw new Error(error.message)
    return (data ?? []) as Permission[]
}

// ── Role Permissions ─────────────────────────────────────────────────────────

export async function fetchRolePermissions(roleId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId)
    if (error) throw new Error(error.message)
    return (data ?? []).map((rp) => rp.permission_id)
}

export async function saveRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    // Delete all existing and re-insert
    const { error: delErr } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
    if (delErr) throw new Error(delErr.message)

    if (permissionIds.length === 0) return

    const rows = permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid }))
    const { error: insErr } = await supabase.from('role_permissions').insert(rows)
    if (insErr) throw new Error(insErr.message)
}

// ── Users / Profiles ─────────────────────────────────────────────────────────

export async function fetchUsersWithRoles(): Promise<UserWithRoles[]> {
    const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
    })

    if (error) throw new Error(error.message)

    // Edge Function may return error in the body
    if (data?.error) throw new Error(data.error)

    return (data ?? []) as UserWithRoles[]
}

export async function createManagedUser(
    params: {
        email: string
        name: string
        roleId: string
    },
): Promise<{ id: string }> {
    const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
            action: 'invite',
            email: params.email,
            name: params.name,
            roleId: params.roleId,
        },
    })

    if (error) throw new Error(error.message)

    // Handle plan limit errors
    if (data?.error) {
        throw new Error(data.error)
    }

    if (!data?.id) throw new Error('Utilizador não foi criado.')

    return { id: data.id }
}

export async function deleteUser(userId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', userId },
    })

    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
}

export async function assignRoleToUser(profileId: string, roleId: string): Promise<void> {
    const profile = await getProfile()
    const { error } = await supabase.from('user_roles').insert({
        profile_id: profileId,
        tenant_id: profile.tenant_id,
        role: 'custom',
        custom_role_id: roleId,
    } as never)
    if (error) throw new Error(error.message)
}

export async function removeUserRole(userRoleId: string): Promise<void> {
    const { error } = await supabase.from('user_roles').delete().eq('id', userRoleId)
    if (error) throw new Error(error.message)
}

// ── Tenant Settings ──────────────────────────────────────────────────────────

export async function fetchTenantSettings(): Promise<TenantSettings | null> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .maybeSingle()
    if (error) throw new Error(error.message)
    return data as TenantSettings | null
}

export async function updateTenantSettings(
    id: string,
    payload: Partial<Pick<TenantSettings, 'name' | 'address' | 'nif' | 'phone' | 'email'>>,
): Promise<void> {
    const { error } = await supabase.from('tenants').update(payload as never).eq('id', id)
    if (error) throw new Error(error.message)
}

// ── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLog {
    id: string
    tenant_id: string
    user_id: string | null
    user_email: string | null
    user_name: string | null
    action: string
    entity_type: string
    entity_id: string | null
    entity_name: string | null
    meta: Record<string, any>
    created_at: string
}

export async function fetchAuditLogs(opts?: {
    entity_type?: string
    user_id?: string
    limit?: number
}): Promise<AuditLog[]> {
    let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(opts?.limit ?? 200)
    if (opts?.entity_type) query = query.eq('entity_type', opts.entity_type)
    if (opts?.user_id) query = query.eq('user_id', opts.user_id)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as AuditLog[]
}

export async function logAuditEvent(
    action: string,
    entity_type: string,
    opts?: { entity_id?: string; entity_name?: string; meta?: Record<string, any> }
): Promise<void> {
    const { error } = await supabase.rpc('log_audit_event', {
        p_action: action,
        p_entity_type: entity_type,
        p_entity_id: opts?.entity_id ?? null,
        p_entity_name: opts?.entity_name ?? null,
        p_meta: opts?.meta ?? {},
    })
    if (error) console.warn('[audit]', error.message)
}

// ── Data Export (GDPR) ────────────────────────────────────────────────────────

export async function exportTenantDataCSV(): Promise<void> {
    const profile = await getProfile()
    const tid = profile.tenant_id
    const [obras, costs, payables, receivables] = await Promise.all([
        supabase.from('obras').select('id,name,status,start_date,end_date,created_at').eq('tenant_id', tid),
        supabase.from('costs').select('id,description,amount,iva_pct,cost_date,status,created_at').eq('tenant_id', tid),
        supabase.from('accounts_payable').select('id,description,amount,iva_pct,due_date,status,created_at').eq('tenant_id', tid),
        supabase.from('accounts_receivable').select('id,description,amount,iva_pct,due_date,status,created_at').eq('tenant_id', tid),
    ])

    const sections: string[] = []

    // Using any for the generic rows to satisfy the quick CSV generation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toCsv = (rows: any[], label: string) => {
        if (!rows?.length) return
        const headers = Object.keys(rows[0]).join(',')
        const lines = rows.map((r) =>
            Object.values(r).map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
        )
        sections.push(`\n=== ${label} ===\n${headers}\n${lines.join('\n')}`)
    }

    toCsv(obras.data ?? [], 'Obras')
    toCsv(costs.data ?? [], 'Custos')
    toCsv(payables.data ?? [], 'Contas a Pagar')
    toCsv(receivables.data ?? [], 'Contas a Receber')

    const content = `ConstruAP — Exportação de Dados\nData: ${new Date().toLocaleDateString('pt-PT')}\n${sections.join('\n')}`

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `construap-dados-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    await logAuditEvent('data.export', 'tenant', { entity_name: 'Exportação GDPR' })
}
