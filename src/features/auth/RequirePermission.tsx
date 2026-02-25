// @ts-nocheck
import { Navigate, useLocation } from 'react-router-dom'
import { usePermissions, type PermissionKey } from './usePermissions'
import { Loader2 } from 'lucide-react'

interface RequirePermissionProps {
    permission: PermissionKey
    /** Where to redirect if access denied. Defaults to '/' */
    redirectTo?: string
    children: React.ReactNode
}

export function RequirePermission({
    permission,
    redirectTo = '/',
    children,
}: RequirePermissionProps) {
    const { hasPermission, isLoading } = usePermissions()
    const location = useLocation()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!hasPermission(permission)) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />
    }

    return <>{children}</>
}
