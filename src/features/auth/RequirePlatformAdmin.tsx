import { Navigate, useLocation } from 'react-router-dom'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { Loader2 } from 'lucide-react'

interface RequirePlatformAdminProps {
  children: React.ReactNode
}

export function RequirePlatformAdmin({ children }: RequirePlatformAdminProps) {
  const { isPlatformAdmin, isLoading } = usePlatformAdmin()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <>{children}</>
}
