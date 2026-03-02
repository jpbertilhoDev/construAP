import { usePlan } from '@/hooks/usePlan'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

const planVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  free: 'outline',
  starter: 'secondary',
  professional: 'default',
  enterprise: 'default',
}

export function PlanBadge() {
  const { plan, isTrialing, trialDaysRemaining, isSuspended, isLoading } = usePlan()

  if (isLoading || !plan) return null

  if (isSuspended) {
    return (
      <Badge variant="destructive" className="text-xs">
        Suspensa
      </Badge>
    )
  }

  if (isTrialing) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="text-xs">
          {plan.name}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {trialDaysRemaining}d
        </span>
      </div>
    )
  }

  return (
    <Badge variant={planVariants[plan.id] ?? 'outline'} className="text-xs">
      {plan.name}
    </Badge>
  )
}
