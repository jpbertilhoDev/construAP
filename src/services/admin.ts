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
    const profile = await getProfile()
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')

    // 1. Fetch ALL auth users (primary source — shows everyone in the database)
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
    })
    const authUsers = authData?.users ?? []

    // 2. Fetch ALL profiles (service role bypasses RLS)
    const { data: allProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, name, avatar_url, tenant_id, created_at')
    const profileMap = new Map(
        (allProfiles ?? []).map((p) => [p.id, p]),
    )

    // 3. Fetch user_roles for the current tenant
    const { data: userRoles } = await supabase
        .from('user_roles')
        .select('id, profile_id, role, obra_id, custom_role_id')
        .eq('tenant_id', profile.tenant_id)

    // 4. Fetch custom roles for names
    const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .eq('tenant_id', profile.tenant_id)
    const rolesMap = Object.fromEntries((roles ?? []).map((r) => [r.id, r.name]))

    // 5. Build combined list: auth users enriched with profile + role data
    const result: UserWithRoles[] = authUsers.map((au) => {
        const prof = profileMap.get(au.id)
        const inCurrentTenant = prof?.tenant_id === profile.tenant_id

        const pRoles = inCurrentTenant
            ? (userRoles ?? [])
                .filter((ur) => ur.profile_id === au.id)
                .map((ur) => ({
                    id: ur.id,
                    name: ur.custom_role_id ? rolesMap[ur.custom_role_id] ?? ur.role : ur.role,
                    obra_id: ur.obra_id,
                    custom_role_id: ur.custom_role_id,
                }))
            : []

        const hasLoggedIn = !!au.last_sign_in_at
        let status: UserStatus
        if (!prof) {
            status = 'orphan' // auth user without profile
        } else if (hasLoggedIn) {
            status = 'active'
        } else {
            status = 'pending'
        }

        return {
            id: au.id,
            email: au.email ?? prof?.email,
            name: prof?.name ?? (au.user_metadata as Record<string, string>)?.name,
            avatar_url: prof?.avatar_url,
            tenant_id: prof?.tenant_id,
            created_at: au.created_at,
            last_sign_in_at: au.last_sign_in_at ?? null,
            status,
            inCurrentTenant,
            roles: pRoles,
        }
    })

    // Sort: current tenant first, then by name/email
    result.sort((a, b) => {
        if (a.inCurrentTenant !== b.inCurrentTenant) return a.inCurrentTenant ? -1 : 1
        const nameA = (a.name ?? a.email ?? '').toLowerCase()
        const nameB = (b.name ?? b.email ?? '').toLowerCase()
        return nameA.localeCompare(nameB)
    })

    return result
}

export async function createManagedUser(
    params: {
        email: string
        name: string
        roleId: string
    },
): Promise<{ id: string }> {
    const profile = await getProfile()

    // Import the admin client lazily to avoid issues if key isn't set yet
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')

    const origin = window.location.origin

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        params.email,
        {
            data: {
                name: params.name,
                tenant_id: profile.tenant_id,
                role_id: params.roleId,
            },
            redirectTo: `${origin}/reset-password`,
        },
    )

    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Utilizador não foi criado.')

    return { id: data.user.id }
}

export async function deleteUser(userId: string): Promise<void> {
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')

    // Step 1: Delete profile first (cascades to user_roles, notifications, etc.)
    // GoTrue fails if the CASCADE delete from auth.users → profiles runs internally.
    const { error: profErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
    if (profErr) throw new Error(profErr.message)

    // Step 2: Delete auth user (profile already gone, no FK cascade issues)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw new Error(error.message)
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
