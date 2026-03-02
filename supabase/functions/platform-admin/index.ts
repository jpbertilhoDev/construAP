// supabase/functions/platform-admin/index.ts
// Super-admin operations for platform management.
// Actions: list-tenants, update-tenant, stats
// Auth: Validates caller is in platform_admins table

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
  action: 'list-tenants' | 'update-tenant' | 'stats'
  tenantId?: string
  status?: string
  planId?: string
  suspensionReason?: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Extract and validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse(req, { error: 'Missing authorization header' }, 401)
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return jsonResponse(req, { error: 'Invalid token' }, 401)
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller is platform admin
    const { data: platformAdmin } = await supabaseAdmin
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!platformAdmin) {
      return jsonResponse(req, { error: 'Not a platform admin' }, 403)
    }

    const body: RequestBody = await req.json()

    switch (body.action) {
      case 'list-tenants':
        return await handleListTenants(req, supabaseAdmin)
      case 'update-tenant':
        return await handleUpdateTenant(req, supabaseAdmin, body)
      case 'stats':
        return await handleStats(req, supabaseAdmin)
      default:
        return jsonResponse(req, { error: 'Invalid action' }, 400)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('platform-admin error:', message)
    return jsonResponse(req, { error: message }, 500)
  }
})

async function handleListTenants(req: Request, supabaseAdmin: ReturnType<typeof createClient>) {
  // Fetch all tenants with their subscription and usage data
  const { data: tenants, error: tenantsErr } = await supabaseAdmin
    .from('tenants')
    .select('id, name, nif, email, status, plan, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (tenantsErr) {
    return jsonResponse(req, { error: tenantsErr.message }, 500)
  }

  // Fetch all subscriptions
  const { data: subscriptions } = await supabaseAdmin
    .from('tenant_subscriptions')
    .select('tenant_id, plan_id, status, trial_ends_at, current_period_end')

  const subMap = new Map(
    (subscriptions ?? []).map((s: Record<string, unknown>) => [s.tenant_id, s]),
  )

  // Fetch all usage
  const { data: usages } = await supabaseAdmin
    .from('tenant_usage')
    .select('tenant_id, user_count, obra_count, employee_count, storage_bytes')

  const usageMap = new Map(
    (usages ?? []).map((u: Record<string, unknown>) => [u.tenant_id, u]),
  )

  // Combine data
  const result = (tenants ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    subscription: subMap.get(t.id) ?? null,
    usage: usageMap.get(t.id) ?? { user_count: 0, obra_count: 0, employee_count: 0, storage_bytes: 0 },
  }))

  return jsonResponse(req, result)
}

async function handleUpdateTenant(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
  body: RequestBody,
) {
  if (!body.tenantId) {
    return jsonResponse(req, { error: 'Missing tenantId' }, 400)
  }

  const updates: Record<string, unknown> = {}

  // Update tenant status
  if (body.status) {
    if (!['active', 'suspended', 'archived'].includes(body.status)) {
      return jsonResponse(req, { error: 'Invalid status' }, 400)
    }
    updates.status = body.status
    if (body.status === 'suspended') {
      updates.suspended_at = new Date().toISOString()
      updates.suspension_reason = body.suspensionReason ?? null
    } else if (body.status === 'active') {
      updates.suspended_at = null
      updates.suspension_reason = null
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .update(updates)
      .eq('id', body.tenantId)

    if (tenantErr) {
      return jsonResponse(req, { error: tenantErr.message }, 500)
    }

    // Also update subscription status if tenant is suspended
    if (body.status === 'suspended') {
      await supabaseAdmin
        .from('tenant_subscriptions')
        .update({ status: 'suspended' })
        .eq('tenant_id', body.tenantId)
    } else if (body.status === 'active') {
      await supabaseAdmin
        .from('tenant_subscriptions')
        .update({ status: 'active' })
        .eq('tenant_id', body.tenantId)
        .eq('status', 'suspended')
    }
  }

  // Update plan
  if (body.planId) {
    const { error: planErr } = await supabaseAdmin
      .from('tenant_subscriptions')
      .update({ plan_id: body.planId })
      .eq('tenant_id', body.tenantId)

    if (planErr) {
      return jsonResponse(req, { error: planErr.message }, 500)
    }
  }

  return jsonResponse(req, { success: true })
}

async function handleStats(req: Request, supabaseAdmin: ReturnType<typeof createClient>) {
  // Total tenants
  const { count: totalTenants } = await supabaseAdmin
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  // Tenants by status
  const { data: byStatus } = await supabaseAdmin
    .from('tenants')
    .select('status')

  const statusCounts: Record<string, number> = {}
  for (const t of byStatus ?? []) {
    const s = (t as Record<string, string>).status ?? 'active'
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  }

  // Subscriptions by plan
  const { data: byPlan } = await supabaseAdmin
    .from('tenant_subscriptions')
    .select('plan_id, status')

  const planCounts: Record<string, number> = {}
  const subStatusCounts: Record<string, number> = {}
  for (const s of byPlan ?? []) {
    const record = s as Record<string, string>
    planCounts[record.plan_id] = (planCounts[record.plan_id] ?? 0) + 1
    subStatusCounts[record.status] = (subStatusCounts[record.status] ?? 0) + 1
  }

  // Total users across all tenants
  const { count: totalUsers } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  return jsonResponse(req, {
    total_tenants: totalTenants ?? 0,
    total_users: totalUsers ?? 0,
    tenants_by_status: statusCounts,
    subscriptions_by_plan: planCounts,
    subscriptions_by_status: subStatusCounts,
  })
}
