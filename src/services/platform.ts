import { supabase } from '@/lib/supabase'

// ── Types ───────────────────────────────────────────────────────────────────

export interface PlatformTenant {
  id: string
  name: string
  nif: string | null
  email: string | null
  status: 'active' | 'suspended' | 'archived'
  plan: string | null
  created_at: string
  subscription: {
    plan_id: string
    status: string
    trial_ends_at: string | null
    current_period_end: string | null
  } | null
  usage: {
    user_count: number
    obra_count: number
    employee_count: number
    storage_bytes: number
  }
}

export interface PlatformStats {
  total_tenants: number
  total_users: number
  tenants_by_status: Record<string, number>
  subscriptions_by_plan: Record<string, number>
  subscriptions_by_status: Record<string, number>
}

// ── Functions ───────────────────────────────────────────────────────────────

export async function fetchAllTenants(): Promise<PlatformTenant[]> {
  const { data, error } = await supabase.functions.invoke('platform-admin', {
    body: { action: 'list-tenants' },
  })

  if (error) throw new Error(error.message)
  return data as PlatformTenant[]
}

export async function updateTenant(
  tenantId: string,
  payload: {
    status?: 'active' | 'suspended' | 'archived'
    planId?: string
    suspensionReason?: string
  },
): Promise<void> {
  const { error } = await supabase.functions.invoke('platform-admin', {
    body: {
      action: 'update-tenant',
      tenantId,
      ...payload,
    },
  })

  if (error) throw new Error(error.message)
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.functions.invoke('platform-admin', {
    body: { action: 'stats' },
  })

  if (error) throw new Error(error.message)
  return data as PlatformStats
}
