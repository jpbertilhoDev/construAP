import { usePlan } from '@/hooks/usePlan'
import { Loader2 } from 'lucide-react'
import { UpgradeBanner } from '@/components/UpgradeBanner'

interface RequireFeatureProps {
  feature: string
  children: React.ReactNode
  /** Custom fallback component. Defaults to UpgradeBanner */
  fallback?: React.ReactNode
}

export function RequireFeature({ feature, children, fallback }: RequireFeatureProps) {
  const { hasFeature, plan, isLoading } = usePlan()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasFeature(feature)) {
    return (
      <>
        {fallback ?? (
          <UpgradeBanner
            feature={feature}
            currentPlan={plan?.name ?? 'Gratuito'}
          />
        )}
      </>
    )
  }

  return <>{children}</>
}
