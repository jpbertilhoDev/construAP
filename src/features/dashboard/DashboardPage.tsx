import { Loader2 } from 'lucide-react'
import { usePermissions } from '@/features/auth/usePermissions'
import { DashboardAdmin } from './DashboardAdmin'
import { DashboardRH } from './DashboardRH'
import { DashboardFinance } from './DashboardFinance'
import { DashboardObras } from './DashboardObras'
import { DashboardCompras } from './DashboardCompras'

export function DashboardPage() {
    const { hasPermission, isAdmin, isLoading } = usePermissions()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Admin or users with admin.view → general dashboard
    if (isAdmin || hasPermission('admin.view')) {
        return <DashboardAdmin />
    }

    // HR role → HR-specific dashboard
    if (hasPermission('rh.view')) {
        return <DashboardRH />
    }

    // Finance role → Finance dashboard
    if (hasPermission('finance.view')) {
        return <DashboardFinance />
    }

    // Obras role → Obras dashboard
    if (hasPermission('obras.view')) {
        return <DashboardObras />
    }

    // Compras role → Compras dashboard
    if (hasPermission('compras.view')) {
        return <DashboardCompras />
    }

    // Fallback: general dashboard
    return <DashboardAdmin />
}
