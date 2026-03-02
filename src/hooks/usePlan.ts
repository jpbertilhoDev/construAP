import { useQuery } from '@tanstack/react-query'
import {
  fetchCurrentSubscription,
  fetchUsage,
  type Plan,
  type SubscriptionWithPlan,
  type TenantUsage,
} from '@/services/subscription'

// ── Types ───────────────────────────────────────────────────────────────────

type Resource = 'users' | 'obras' | 'employees'

interface UsePlanResult {
  /** Current plan details (null while loading or if no subscription) */
  plan: Plan | null
  /** Full subscription object */
  subscription: SubscriptionWithPlan | null
  /** Current usage counters */
  usage: TenantUsage | null
  /** Check if the tenant can create another resource of this type */
  canCreate: (resource: Resource) => boolean
  /** Check if the tenant's plan includes a specific feature */
  hasFeature: (feature: string) => boolean
  /** True if subscription is in trialing status */
  isTrialing: boolean
  /** True if subscription is suspended */
  isSuspended: boolean
  /** Days remaining in trial (0 if not trialing) */
  trialDaysRemaining: number
  /** True while data is loading */
  isLoading: boolean
  /** Error if any */
  error: Error | null
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function usePlan(): UsePlanResult {
  const {
    data: subscription = null,
    isLoading: subLoading,
    error: subError,
  } = useQuery({
    queryKey: ['subscription'],
    queryFn: fetchCurrentSubscription,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  const {
    data: usage = null,
    isLoading: usageLoading,
    error: usageError,
  } = useQuery({
    queryKey: ['tenant-usage'],
    queryFn: fetchUsage,
    staleTime: 1000 * 60 * 2, // 2 minutes (usage changes more often)
    retry: 1,
  })

  const plan = subscription?.plan ?? null
  const isLoading = subLoading || usageLoading
  const error = (subError ?? usageError) as Error | null

  const canCreate = (resource: Resource): boolean => {
    if (!plan || !usage) return true // allow while loading (graceful)

    // Suspended/canceled tenants cannot create
    if (subscription?.status === 'suspended' || subscription?.status === 'canceled') {
      return false
    }

    const limitMap: Record<Resource, { max: number | null; current: number }> = {
      users: { max: plan.max_users, current: usage.user_count },
      obras: { max: plan.max_obras, current: usage.obra_count },
      employees: { max: plan.max_employees, current: usage.employee_count },
    }

    const { max, current } = limitMap[resource]

    // null = unlimited
    if (max === null) return true

    return current < max
  }

  const hasFeature = (feature: string): boolean => {
    if (!plan) return true // allow while loading
    return plan.features[feature] === true
  }

  const isTrialing = subscription?.status === 'trialing'
  const isSuspended = subscription?.status === 'suspended'

  let trialDaysRemaining = 0
  if (isTrialing && subscription?.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at)
    const now = new Date()
    trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  return {
    plan,
    subscription,
    usage,
    canCreate,
    hasFeature,
    isTrialing,
    isSuspended,
    trialDaysRemaining,
    isLoading,
    error,
  }
}
