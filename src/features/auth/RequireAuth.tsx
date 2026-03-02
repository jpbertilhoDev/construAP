import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { usePlan } from '@/hooks/usePlan'
import { SuspendedPage } from './SuspendedPage'

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { session, isLoading } = useAuth()
    const location = useLocation()
    const { isSuspended, isLoading: planLoading } = usePlan()

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">A carregar...</p>
                </div>
            </div>
        )
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Show suspended page once plan data is loaded
    if (!planLoading && isSuspended) {
        return <SuspendedPage />
    }

    return <>{children}</>
}
