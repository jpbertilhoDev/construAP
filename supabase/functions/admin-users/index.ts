// supabase/functions/admin-users/index.ts
// Replaces src/lib/supabaseAdmin.ts — handles user management securely on the server side.
// Actions: list, invite, delete
// Auth: Validates caller JWT + admin.manage permission + tenant is active

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://construap.pt',
  'https://www.construap.pt',
  'http://localhost:5173',
  'http://localhost:4173',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function jsonResponse(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

interface RequestBody {
  action: 'list' | 'invite' | 'delete'
  email?: string
  name?: string
  roleId?: string
  userId?: string
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // Create anon client (respects RLS) to validate the caller
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse(req, { error: 'Missing authorization header' }, 401)
    }

    // Create client with caller's JWT to check permissions
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Verify the caller's identity
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return jsonResponse(req, { error: 'Invalid token' }, 401)
    }

    // Get caller's profile (for tenant_id)
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('id, tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return jsonResponse(req, { error: 'Profile not found' }, 403)
    }

    // Create admin client (service role, bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Check caller has admin.manage permission
    const { data: hasPermResult } = await supabaseAdmin.rpc('has_permission_for_user', {
      p_user_id: user.id,
      p_permission_key: 'admin.manage',
    })

    // Fallback: check via direct query if RPC doesn't exist
    if (hasPermResult === null || hasPermResult === undefined) {
      const { data: roleCheck } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('profile_id', user.id)
        .eq('tenant_id', profile.tenant_id)

      const isAdmin = roleCheck?.some((r: { role: string }) => r.role === 'admin')
      if (!isAdmin) {
        // Check custom roles for admin.manage
        const { data: customRoleCheck } = await supabaseAdmin
          .from('user_roles')
          .select('custom_role_id')
          .eq('profile_id', user.id)
          .eq('tenant_id', profile.tenant_id)
          .not('custom_role_id', 'is', null)

        const roleIds = customRoleCheck?.map((r: { custom_role_id: string }) => r.custom_role_id) ?? []
        if (roleIds.length > 0) {
          const { data: permCheck } = await supabaseAdmin
            .from('role_permissions')
            .select('permissions(key)')
            .in('role_id', roleIds)

          const hasAdminManage = permCheck?.some(
            (rp: { permissions: { key: string } | null }) => rp.permissions?.key === 'admin.manage'
          )
          if (!hasAdminManage) {
            return jsonResponse(req, { error: 'Insufficient permissions' }, 403)
          }
        } else {
          return jsonResponse(req, { error: 'Insufficient permissions' }, 403)
        }
      }
    } else if (hasPermResult === false) {
      return jsonResponse(req, { error: 'Insufficient permissions' }, 403)
    }

    // Check tenant is active
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, status')
      .eq('id', profile.tenant_id)
      .single()

    if (!tenant || tenant.status !== 'active') {
      return jsonResponse(req, { error: 'Tenant is not active' }, 403)
    }

    // Parse request body
    const body: RequestBody = await req.json()

    switch (body.action) {
      case 'list':
        return await handleList(req, supabaseAdmin, profile.tenant_id)
      case 'invite':
        return await handleInvite(req, supabaseAdmin, profile.tenant_id, body)
      case 'delete':
        return await handleDelete(req, supabaseAdmin, body)
      default:
        return jsonResponse(req, { error: 'Invalid action' }, 400)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('admin-users error:', message)
    return jsonResponse(req, { error: message }, 500)
  }
})

async function handleList(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
  tenantId: string,
) {
  // Fetch profiles only for this tenant (Service role bypasses RLS, so explicitly filter)
  const { data: tenantProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, avatar_url, tenant_id, created_at')
    .eq('tenant_id', tenantId)

  const profileMap = new Map(
    (tenantProfiles ?? []).map((p: Record<string, unknown>) => [p.id, p]),
  )

  // Fast return if no profiles found to avoid loading all auth users
  if (profileMap.size === 0) {
    return jsonResponse(req, [])
  }

  // Fetch all auth users (auth.users doesn't have RLS, we must filter manually)
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  const authUsers = authData?.users ?? []

  // Fetch user_roles for the current tenant
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select('id, profile_id, role, obra_id, custom_role_id')
    .eq('tenant_id', tenantId)

  // Fetch custom roles for names
  const { data: roles } = await supabaseAdmin
    .from('roles')
    .select('id, name')
    .eq('tenant_id', tenantId)

  const rolesMap = Object.fromEntries(
    (roles ?? []).map((r: { id: string; name: string }) => [r.id, r.name]),
  )

  // Build combined list filtered strictly to this tenant
  const result = []

  for (const au of authUsers) {
    const prof = profileMap.get(au.id) as Record<string, unknown> | undefined

    // STRICT TENANT BOUNDARY: Only include users who exist in this tenant's profiles
    if (!prof) continue

    const pRoles = (userRoles ?? [])
      .filter((ur: Record<string, unknown>) => ur.profile_id === au.id)
      .map((ur: Record<string, unknown>) => ({
        id: ur.id,
        name: ur.custom_role_id
          ? rolesMap[ur.custom_role_id as string] ?? ur.role
          : ur.role,
        obra_id: ur.obra_id,
        custom_role_id: ur.custom_role_id,
      }))

    const hasLoggedIn = !!au.last_sign_in_at
    const status = hasLoggedIn ? 'active' : 'pending'

    result.push({
      id: au.id,
      email: au.email ?? prof?.email,
      name: prof?.name ?? (au.user_metadata as Record<string, string>)?.name,
      avatar_url: prof?.avatar_url,
      tenant_id: prof?.tenant_id,
      created_at: au.created_at,
      last_sign_in_at: au.last_sign_in_at ?? null,
      status,
      inCurrentTenant: true,
      roles: pRoles,
    })
  }

  // Sort by name/email
  result.sort((a, b) => {
    const nameA = ((a.name ?? a.email) as string ?? '').toLowerCase()
    const nameB = ((b.name ?? b.email) as string ?? '').toLowerCase()
    return nameA.localeCompare(nameB)
  })

  return jsonResponse(req, result)
}

async function handleInvite(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
  tenantId: string,
  body: RequestBody,
) {
  if (!body.email || !body.name || !body.roleId) {
    return jsonResponse(req, { error: 'Missing required fields: email, name, roleId' }, 400)
  }

  // Check user plan limit before inviting
  const { data: canCreate } = await supabaseAdmin.rpc('check_plan_limit', {
    p_tenant_id: tenantId,
    p_resource: 'users',
  })

  if (canCreate === false) {
    return jsonResponse(req, {
      error: 'Limite de utilizadores atingido para o seu plano. Atualize o plano para convidar mais utilizadores.',
      code: 'PLAN_LIMIT_REACHED',
    }, 403)
  }

  const origin = req.headers.get('origin') ?? 'https://construap.pt'

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    body.email,
    {
      data: {
        name: body.name,
        tenant_id: tenantId,
        role_id: body.roleId,
      },
      redirectTo: `${origin}/reset-password`,
    },
  )

  if (error) {
    return jsonResponse(req, { error: error.message }, 400)
  }

  if (!data.user) {
    return jsonResponse(req, { error: 'Utilizador não foi criado.' }, 500)
  }

  return jsonResponse(req, { id: data.user.id })
}

async function handleDelete(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
  body: RequestBody,
) {
  if (!body.userId) {
    return jsonResponse(req, { error: 'Missing required field: userId' }, 400)
  }

  // Delete profile first (cascades to user_roles, notifications, etc.)
  const { error: profErr } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', body.userId)

  if (profErr) {
    return jsonResponse(req, { error: profErr.message }, 500)
  }

  // Delete auth user
  const { error } = await supabaseAdmin.auth.admin.deleteUser(body.userId)
  if (error) {
    return jsonResponse(req, { error: error.message }, 500)
  }

  return jsonResponse(req, { success: true })
}
