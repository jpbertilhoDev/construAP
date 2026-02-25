import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    HardHat, TrendingUp, ArrowRight, AlertTriangle,
    Building2, Plus, ShoppingCart, BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell,
} from 'recharts'
import { useObras, useAllObraFinancials } from '@/features/obras/hooks/useObras'
import { formatCurrency, formatDate } from '@/lib/utils'
import { usePermissions } from '@/features/auth/usePermissions'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#94a3b8']
const BAR_COLORS = { orcado: '#3b82f6', realizado: '#f59e0b' }

export function DashboardObras() {
    const { hasPermission } = usePermissions()
    const { data: obras = [], isLoading: isLoadingObras } = useObras()
    const { data: financials = [] } = useAllObraFinancials()

    const activeObras = useMemo(() =>
        obras.filter(o => o.status !== 'Arquivada' && o.status !== 'Concluida')
    , [obras])

    const activeObraIds = useMemo(() => new Set(activeObras.map(o => o.id)), [activeObras])

    const activeFinancials = useMemo(() =>
        financials.filter(f => activeObraIds.has(f.obra_id))
    , [financials, activeObraIds])

    const totalBudgeted = activeFinancials.reduce((sum, f) => sum + Number(f.total_budgeted || 0), 0)
    const totalCosts = activeFinancials.reduce((sum, f) => sum + Number(f.total_costs || 0), 0)

    const avgDeviation = useMemo(() => {
        const withBudget = activeFinancials.filter(f => Number(f.total_budgeted || 0) > 0)
        if (withBudget.length === 0) return 0
        const totalDev = withBudget.reduce((sum, f) => sum + Number(f.deviation_pct || 0), 0)
        return totalDev / withBudget.length
    }, [activeFinancials])

    // Bar chart: budget vs actual per obra
    const budgetVsActual = useMemo(() =>
        activeFinancials
            .filter(f => Number(f.total_budgeted || 0) > 0 || Number(f.total_costs || 0) > 0)
            .map(f => ({
                name: f.obra_name ?? 'Sem nome',
                orcado: Number(f.total_budgeted || 0),
                realizado: Number(f.total_costs || 0),
            }))
            .slice(0, 8)
    , [activeFinancials])

    // Pie chart: obras by status
    const statusPie = useMemo(() => {
        const groups: Record<string, number> = {}
        obras.filter(o => o.status !== 'Arquivada').forEach(o => {
            groups[o.status] = (groups[o.status] || 0) + 1
        })
        return Object.entries(groups).map(([name, value]) => ({ name, value }))
    }, [obras])

    const recentObras = obras.filter(o => o.status !== 'Arquivada').slice(0, 5)

    const stats = [
        {
            label: 'Obras Ativas',
            value: isLoadingObras ? '...' : activeObras.length.toString(),
            icon: HardHat,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Total Orcado',
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
            label: 'Desvio Medio',
            value: isLoadingObras ? '...' : `${avgDeviation >= 0 ? '+' : ''}${avgDeviation.toFixed(1)}%`,
            icon: AlertTriangle,
            color: avgDeviation > 10 ? 'text-red-500' : avgDeviation > 0 ? 'text-amber-500' : 'text-emerald-500',
            bg: avgDeviation > 10 ? 'bg-red-500/10' : avgDeviation > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
        },
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Obras</h1>
                <p className="text-muted-foreground mt-1">
                    Visao geral dos projetos em execucao
                </p>
            </div>

            {/* KPI Cards */}
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

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Bar Chart: Budget vs Actual */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            Orcado vs Realizado por Obra
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {budgetVsActual.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Sem dados financeiros de obras
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={budgetVsActual} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        fontSize={11}
                                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={120}
                                        fontSize={11}
                                        tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + '\u2026' : v}
                                    />
                                    <Tooltip
                                        formatter={(v) => [formatCurrency(Number(v)), '']}
                                        contentStyle={{ fontSize: 12 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                                    <Bar dataKey="orcado" name="Orcado" fill={BAR_COLORS.orcado} radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="realizado" name="Realizado" fill={BAR_COLORS.realizado} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Pie Chart: Obras by Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            Obras por Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {statusPie.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Sem obras registadas
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={statusPie}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={90}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, value }) => `${name ?? ''} (${value ?? 0})`}
                                        labelLine={false}
                                        fontSize={11}
                                    >
                                        {statusPie.map((_entry, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => [v, 'Obras']} />
                                    <Legend fontSize={11} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Obras Ativas List */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <HardHat className="h-4 w-4 text-muted-foreground" />
                            Obras Recentes
                        </CardTitle>
                        <Link to="/obras">
                            <Button variant="ghost" size="sm" className="text-xs gap-1">
                                Ver todas <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {isLoadingObras ? (
                            <div className="animate-pulse space-y-3 pt-2">
                                <div className="h-12 bg-muted rounded w-full" />
                                <div className="h-12 bg-muted rounded w-full" />
                            </div>
                        ) : recentObras.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Nenhuma obra ativa</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentObras.map(obra => (
                                    <Link key={obra.id} to={`/obras/${obra.id}`} className="block group">
                                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">{obra.name}</p>
                                                <div className="flex gap-2 items-center text-xs text-muted-foreground mt-0.5">
                                                    {obra.ref && <span>{obra.ref}</span>}
                                                    {obra.start_date && <span>Inicio: {formatDate(obra.start_date)}</span>}
                                                </div>
                                            </div>
                                            <Badge variant={obra.status === 'Em execucao' ? 'success' : 'outline'} className="shrink-0 ml-2">
                                                {obra.status}
                                            </Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Access */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Link to="/obras" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-blue-500/10 p-3 rounded-lg">
                                <HardHat className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Todas as Obras</p>
                                <p className="text-xs text-muted-foreground">{activeObras.length} ativa{activeObras.length !== 1 ? 's' : ''}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                {hasPermission('obras.manage') && (
                    <Link to="/obras/new" className="block group">
                        <Card className="hover:border-primary/40 transition-colors h-full">
                            <CardContent className="flex items-center gap-4 py-6">
                                <div className="bg-emerald-500/10 p-3 rounded-lg">
                                    <Plus className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium group-hover:text-primary transition-colors">Nova Obra</p>
                                    <p className="text-xs text-muted-foreground">Criar projeto</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </CardContent>
                        </Card>
                    </Link>
                )}
                <Link to="/compras" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-violet-500/10 p-3 rounded-lg">
                                <ShoppingCart className="h-5 w-5 text-violet-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Compras</p>
                                <p className="text-xs text-muted-foreground">Pedidos e materiais</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
