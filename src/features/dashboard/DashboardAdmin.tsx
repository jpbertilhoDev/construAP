import { Link } from 'react-router-dom'
import {
    HardHat,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Building2,
    Clock,
    ShoppingCart,
    Wallet,
    Receipt,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useObras, useAllObraFinancials } from '@/features/obras/hooks/useObras'
import { useTimesheets } from '@/features/rh/hooks/useEmployees'
import { usePurchaseOrders } from '@/features/compras/hooks/useCompras'
import { usePayables } from '@/features/finance/hooks/usePayables'
import { useReceivables } from '@/features/finance/hooks/useReceivables'
import { useQuery } from '@tanstack/react-query'
import { fetchCashflow } from '@/services/cashflow'
import { DashboardCharts } from './components/DashboardCharts'

// ── Helpers ─────────────────────────────────────────────────

type PendingItem = {
    id: string
    label: string
    detail: string
    link: string
    icon: React.ElementType
    color: string
}

function isPast(dateStr: string): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(dateStr) < today
}

// ── Component ───────────────────────────────────────────────

export function DashboardAdmin() {
    const { data: obras = [], isLoading: isLoadingObras } = useObras()
    const { data: financials = [] } = useAllObraFinancials()
    const { data: cashflowTx = [] } = useQuery({ queryKey: ['cashflow'], queryFn: fetchCashflow, staleTime: 60_000 })

    // Pending data sources
    const { data: pendingTimesheets = [] } = useTimesheets({ estado: 'Submetido' })
    const { data: pendingPOs = [] } = usePurchaseOrders({ estado: 'Submetido' })
    const { data: allPayables = [] } = usePayables()
    const { data: allReceivables = [] } = useReceivables()

    // ── Financials ──────────────────────────────────────────
    const activeObras = obras.filter(o => o.status !== 'Arquivada' && o.status !== 'Concluída')
    const activeObraIds = new Set(activeObras.map(o => o.id))

    const activeFinancials = financials.filter(f => activeObraIds.has(f.obra_id))
    const totalBudgeted = activeFinancials.reduce((sum, f) => sum + (f.total_budgeted || 0), 0)
    const totalCosts = activeFinancials.reduce((sum, f) => sum + (f.total_costs || 0), 0)


    // ── Pending items ───────────────────────────────────────
    const overduePayables = allPayables.filter(
        p => (p.status === 'Pendente' || p.status === 'Parcial') && isPast(p.due_date),
    )
    const overdueReceivables = allReceivables.filter(
        r => (r.status === 'Pendente' || r.status === 'Parcial') && isPast(r.due_date),
    )

    const totalPending =
        pendingTimesheets.length +
        pendingPOs.length +
        overduePayables.length +
        overdueReceivables.length

    // Build unified list for the "Pendências Recentes" card
    const pendingItems: PendingItem[] = []

    for (const ts of pendingTimesheets.slice(0, 3)) {
        const empName = (ts as unknown as { employees?: { nome: string } }).employees?.nome ?? 'Funcionário'
        pendingItems.push({
            id: `ts-${ts.id}`,
            label: `Apontamento de ${empName}`,
            detail: formatDate(ts.data),
            link: '/rh/aprovacoes',
            icon: Clock,
            color: 'text-blue-500',
        })
    }

    for (const po of pendingPOs.slice(0, 3)) {
        pendingItems.push({
            id: `po-${po.id}`,
            label: `Pedido ${po.numero}`,
            detail: po.suppliers?.name ?? 'Fornecedor',
            link: `/compras/pedidos/${po.id}`,
            icon: ShoppingCart,
            color: 'text-purple-500',
        })
    }

    for (const ap of overduePayables.slice(0, 3)) {
        pendingItems.push({
            id: `ap-${ap.id}`,
            label: ap.description,
            detail: `Vencido ${formatDate(ap.due_date)} • ${formatCurrency(ap.amount)}`,
            link: '/finance',
            icon: Wallet,
            color: 'text-red-500',
        })
    }

    for (const ar of overdueReceivables.slice(0, 3)) {
        pendingItems.push({
            id: `ar-${ar.id}`,
            label: ar.description,
            detail: `Vencido ${formatDate(ar.due_date)} • ${formatCurrency(ar.amount)}`,
            link: '/finance',
            icon: Receipt,
            color: 'text-orange-500',
        })
    }

    // ── Stats ───────────────────────────────────────────────
    const stats = [
        {
            label: 'Obras Ativas',
            value: isLoadingObras ? '...' : String(activeObras.length),
            icon: HardHat,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Total Orçado',
            value: formatCurrency(totalBudgeted),
            icon: TrendingUp,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
        },
        {
            label: 'Total Realizado',
            value: formatCurrency(totalCosts),
            icon: TrendingUp,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
        },
        {
            label: 'Pendências em Aberto',
            value: String(totalPending),
            icon: AlertTriangle,
            color: totalPending > 0 ? 'text-red-500' : 'text-emerald-500',
            bg: totalPending > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
        },
    ]

    const recentObras = obras.filter(o => o.status !== 'Arquivada').slice(0, 5)

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Visão geral da sua empresa
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <div className={`${stat.bg} p-2 rounded-lg`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Obras Recentes ──────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardHat className="h-5 w-5 text-muted-foreground" />
                        Obras Recentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingObras ? (
                        <div className="animate-pulse space-y-4 pt-2">
                            <div className="h-12 bg-muted rounded w-full" />
                            <div className="h-12 bg-muted rounded w-full" />
                        </div>
                    ) : recentObras.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <Building2 className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="font-medium">Nenhuma obra ativa</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Crie a sua primeira obra para começar a acompanhar o progresso.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            {recentObras.map(obra => (
                                <Link key={obra.id} to={`/obras/${obra.id}`} className="block group">
                                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border">
                                        <div>
                                            <p className="font-medium group-hover:text-primary transition-colors">{obra.name}</p>
                                            <div className="flex gap-2 items-center text-xs text-muted-foreground mt-1">
                                                {obra.ref && <span>{obra.ref}</span>}
                                                {obra.start_date && <span>• Início: {formatDate(obra.start_date)}</span>}
                                            </div>
                                        </div>
                                        <Badge variant={obra.status === 'Em execução' ? 'success' : 'outline'}>
                                            {obra.status}
                                        </Badge>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Pendências Recentes ──────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {totalPending > 0 ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        )}
                        Pendências Recentes
                        {totalPending > 0 && (
                            <Badge variant="destructive" className="ml-1 text-[10px]">
                                {String(totalPending)}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {pendingItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                Sem pendências. Bom trabalho!
                            </p>
                            <Badge variant="success" className="mt-3">Em dia</Badge>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Summary badges */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {pendingTimesheets.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {String(pendingTimesheets.length)} apontamento{pendingTimesheets.length !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                                {pendingPOs.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                        <ShoppingCart className="h-3 w-3 mr-1" />
                                        {String(pendingPOs.length)} pedido{pendingPOs.length !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                                {overduePayables.length > 0 && (
                                    <Badge variant="outline" className="text-xs text-red-600">
                                        <Wallet className="h-3 w-3 mr-1" />
                                        {String(overduePayables.length)} a pagar vencido{overduePayables.length !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                                {overdueReceivables.length > 0 && (
                                    <Badge variant="outline" className="text-xs text-orange-600">
                                        <Receipt className="h-3 w-3 mr-1" />
                                        {String(overdueReceivables.length)} a receber vencido{overdueReceivables.length !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                            </div>

                            {/* Items list */}
                            {pendingItems.slice(0, 8).map((item) => (
                                <Link key={item.id} to={item.link} className="block group">
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors border">
                                        <div className="shrink-0">
                                            <item.icon className={`h-4 w-4 ${item.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                {item.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {item.detail}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {totalPending > 8 && (
                                <p className="text-xs text-muted-foreground text-center pt-2">
                                    +{String(totalPending - 8)} pendência{totalPending - 8 !== 1 ? 's' : ''} adicionai{totalPending - 8 !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Charts Section ────────────────────────────── */}
            <DashboardCharts
                obras={obras}
                financials={financials}
                transactions={cashflowTx}
            />
        </div>
    )
}
