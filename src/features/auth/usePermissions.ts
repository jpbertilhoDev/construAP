// @ts-nocheck
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ── Types ───────────────────────────────────────────────────────────────────

export type PermissionKey =
    | 'dashboard.view'
    | 'obras.view' | 'obras.manage'
    | 'finance.view' | 'finance.manage'
    | 'rh.view' | 'rh.manage'
    | 'compras.view' | 'compras.manage'
    | 'relatorios.view'
    | 'admin.view' | 'admin.manage'

interface UsePermissionsResult {
    /** All permission keys the current user has */
    permissions: Set<PermissionKey>
    /** true if the user has this specific permission */
    hasPermission: (key: PermissionKey) => boolean
    /** true if the user has AT LEAST ONE of these permissions */
    hasAnyPermission: (keys: PermissionKey[]) => boolean
    /** Shortcut: user has admin.manage */
    isAdmin: boolean
    isLoading: boolean
    error: Error | null
}

// ── Fetcher ─────────────────────────────────────────────────────────────────

async function fetchMyPermissions(): Promise<Set<PermissionKey>> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Set()

    // 1. Get profile to know tenant_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', user.id)
        .single()
    if (!profile) return new Set()

    // 2. Get all user_roles for this user
    const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, custom_role_id')
        .eq('profile_id', profile.id)
        .eq('tenant_id', profile.tenant_id)
    if (!userRoles || userRoles.length === 0) {
        // No explicit roles assigned – if the user is an 'admin' by the system role field
        // (legacy), grant all permissions
        const isLegacyAdmin = userRoles?.some((r) => r.role === 'admin')
        if (isLegacyAdmin) return new Set<PermissionKey>([
            'dashboard.view', 'obras.view', 'obras.manage',
            'finance.view', 'finance.manage',
            'rh.view', 'rh.manage',
            'compras.view', 'compras.manage',
            'relatorios.view', 'admin.view', 'admin.manage',
        ])
        return new Set()
    }

    // 3. Separate role='admin' (old fast-track) from custom roles
    const hasAdminRole = userRoles.some((r) => r.role === 'admin')
    if (hasAdminRole) {
        // Admin gets everything
        return new Set<PermissionKey>([
            'dashboard.view', 'obras.view', 'obras.manage',
            'finance.view', 'finance.manage',
            'rh.view', 'rh.manage',
            'compras.view', 'compras.manage',
            'relatorios.view', 'admin.view', 'admin.manage',
        ])
    }

    // 4. For custom roles, resolve permissions via role_permissions → permissions
    const customRoleIds = userRoles
        .filter((r) => r.custom_role_id)
        .map((r) => r.custom_role_id as string)

    if (customRoleIds.length === 0) return new Set()

    const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permissions(key)')
        .in('role_id', customRoleIds)

    const keys = new Set<PermissionKey>()
    for (const rp of rolePerms ?? []) {
        const key = (rp as any).permissions?.key as PermissionKey | undefined
        if (key) keys.add(key)
    }

    // Always add dashboard.view if the user has any role
    if (keys.size > 0) keys.add('dashboard.view')

    return keys
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions(): UsePermissionsResult {
    const { data: permissions = new Set<PermissionKey>(), isLoading, error } = useQuery({
        queryKey: ['my-permissions'],
        queryFn: fetchMyPermissions,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
    })

    const hasPermission = (key: PermissionKey) => permissions.has(key)
    const hasAnyPermission = (keys: PermissionKey[]) => keys.some((k) => permissions.has(k))
    const isAdmin = permissions.has('admin.manage')

    return { permissions, hasPermission, hasAnyPermission, isAdmin, isLoading, error: error as Error | null }
}
