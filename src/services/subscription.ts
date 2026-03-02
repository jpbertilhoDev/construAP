import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

// ── Types ───────────────────────────────────────────────────────────────────

export interface Plan {
  id: string
  name: string
  price_eur: number
  interval: 'month' | 'year'
  max_users: number | null
  max_obras: number | null
  max_storage_mb: number | null
  max_employees: number | null
  features: Record<string, boolean>
  sort_order: number
  is_active: boolean
}

export interface Subscription {
  id: string
  tenant_id: string
  plan_id: string
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended'
  trial_ends_at: string | null
  current_period_start: string
  current_period_end: string | null
  canceled_at: string | null
  created_at: string
}

export interface TenantUsage {
  tenant_id: string
  user_count: number
  obra_count: number
  employee_count: number
  storage_bytes: number
  updated_at: string
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan
}

// ── Fetchers ────────────────────────────────────────────────────────────────

export async function fetchAllPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(error.message)
  return (data ?? []) as Plan[]
}

export async function fetchCurrentSubscription(): Promise<SubscriptionWithPlan | null> {
  const profile = await getProfile()

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select('*, plan:plans(*)')
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  // Reshape the joined data
  const { plan, ...subscription } = data as Record<string, unknown>
  return {
    ...(subscription as unknown as Subscription),
    plan: plan as Plan,
  }
}

export async function fetchUsage(): Promise<TenantUsage | null> {
  const profile = await getProfile()

  const { data, error } = await supabase
    .from('tenant_usage')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as TenantUsage | null
}
