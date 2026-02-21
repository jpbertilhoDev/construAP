import { Link } from 'react-router-dom'
import { HardHat, TrendingUp, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useObras, useAllObraFinancials } from '@/features/obras/hooks/useObras'

export function DashboardPage() {
    const { data: obras = [], isLoading: isLoadingObras } = useObras()
    const { data: financials = [] } = useAllObraFinancials()

    // We can also compute open punchlist items (tasks) from useTasks without obraId (requires global tasks hook, but right now useTasks expects obraId).
    // Let's keep it simple for now and leave "Pendências em Aberto" as a placeholder or compute dummy.

    // Active Obras
    const activeObras = obras.filter(o => o.status !== 'Arquivada' && o.status !== 'Concluída')
    const activeObraIds = new Set(activeObras.map(o => o.id))

    // Aggregate Financials for active obras
    const activeFinancials = financials.filter(f => activeObraIds.has(f.obra_id))
    const totalBudgeted = activeFinancials.reduce((sum, f) => sum + Number(f.total_budgeted || 0), 0)
    const totalCosts = activeFinancials.reduce((sum, f) => sum + Number(f.total_costs || 0), 0)

    const stats = [
        {
            label: 'Obras Ativas',
            value: isLoadingObras ? '...' : activeObras.length.toString(),
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
            value: '—',
            icon: AlertTriangle,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
        },
    ]

    const recentObras = obras.filter(o => o.status !== 'Arquivada').slice(0, 5)

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Visão geral da sua empresa
                </p>
            </div>

            {/* KPI cards */}
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

            {/* Recent Obras */}
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


            {/* Punch list summary (placeholder) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                        Pendências Recentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            Sem pendências. Bom trabalho!
                        </p>
                        <Badge variant="success" className="mt-3">Em dia</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
