import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    TrendingDown, TrendingUp, AlertTriangle, ArrowRight,
    Wallet, HandCoins, FileText, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell,
} from 'recharts'
import { format, parseISO, isPast, isWithinInterval, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { usePayables } from '@/features/finance/hooks/usePayables'
import { useReceivables } from '@/features/finance/hooks/useReceivables'
import { formatCurrency } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
    Pendente: '#f59e0b',
    Parcial: '#8b5cf6',
    Pago: '#10b981',
    Cancelado: '#94a3b8',
}

const MONTH_BAR_COLORS = { ap: '#ef4444', ar: '#10b981' }

export function DashboardFinance() {
    const { data: payables = [], isLoading: loadingAP } = usePayables()
    const { data: receivables = [], isLoading: loadingAR } = useReceivables()

    const today = startOfDay(new Date())
    const next30 = addDays(today, 30)

    // KPIs
    const pendingAP = useMemo(() =>
        payables.filter(p => p.status === 'Pendente' || p.status === 'Parcial')
    , [payables])

    const pendingAR = useMemo(() =>
        receivables.filter(r => r.status === 'Pendente' || r.status === 'Parcial')
    , [receivables])

    const totalPendingAP = pendingAP.reduce((s, p) => s + Number(p.amount), 0)
    const totalPendingAR = pendingAR.reduce((s, r) => s + Number(r.amount), 0)
    const netBalance = totalPendingAR - totalPendingAP

    const overdueAP = useMemo(() =>
        payables.filter(p => p.status === 'Pendente' && isPast(parseISO(p.due_date)))
    , [payables])

    // Monthly bar chart
    const monthlyData = useMemo(() => {
        const months: Record<string, { month: string; ap: number; ar: number }> = {}

        const add = (date: string, amount: number, key: 'ap' | 'ar') => {
            const monthKey = date.substring(0, 7)
            if (!months[monthKey]) {
                months[monthKey] = {
                    month: format(parseISO(monthKey + '-01'), 'MMM yy', { locale: ptBR }),
                    ap: 0,
                    ar: 0,
                }
            }
            months[monthKey][key] += Number(amount)
        }

        payables.filter(p => p.status !== 'Cancelado').forEach(p => add(p.due_date, p.amount, 'ap'))
        receivables.filter(r => r.status !== 'Cancelado').forEach(r => add(r.due_date, r.amount, 'ar'))

        return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
    }, [payables, receivables])

    // AP status pie
    const apStatusPie = useMemo(() => {
        const groups: Record<string, number> = {}
        payables.forEach(p => { groups[p.status] = (groups[p.status] || 0) + Number(p.amount) })
        return Object.entries(groups).map(([name, value]) => ({ name, value }))
    }, [payables])

    // AR status pie
    const arStatusPie = useMemo(() => {
        const groups: Record<string, number> = {}
        receivables.forEach(r => { groups[r.status] = (groups[r.status] || 0) + Number(r.amount) })
        return Object.entries(groups).map(([name, value]) => ({ name, value }))
    }, [receivables])

    // Upcoming 30 days
    const upcoming = useMemo(() => {
        const interval = { start: today, end: next30 }
        const apUpcoming = payables
            .filter(p => (p.status === 'Pendente' || p.status === 'Parcial') && isWithinInterval(parseISO(p.due_date), interval))
            .map(p => ({ type: 'AP' as const, ...p }))
        const arUpcoming = receivables
            .filter(r => (r.status === 'Pendente' || r.status === 'Parcial') && isWithinInterval(parseISO(r.due_date), interval))
            .map(r => ({ type: 'AR' as const, ...r }))
        return [...apUpcoming, ...arUpcoming].sort((a, b) => a.due_date.localeCompare(b.due_date))
    }, [payables, receivables, today, next30])

    const isLoading = loadingAP || loadingAR

    const stats = [
        {
            label: 'A Pagar (Pendente)',
            value: isLoading ? '...' : formatCurrency(totalPendingAP),
            icon: TrendingDown,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
        },
        {
            label: 'A Receber (Pendente)',
            value: isLoading ? '...' : formatCurrency(totalPendingAR),
            icon: TrendingUp,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
        },
        {
            label: 'Saldo Projetado',
            value: isLoading ? '...' : formatCurrency(netBalance),
            icon: Wallet,
            color: netBalance >= 0 ? 'text-emerald-500' : 'text-red-500',
            bg: netBalance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
        },
        {
            label: 'Vencidos (AP)',
            value: isLoading ? '...' : overdueAP.length.toString(),
            icon: AlertTriangle,
            color: overdueAP.length > 0 ? 'text-red-500' : 'text-emerald-500',
            bg: overdueAP.length > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
        },
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
                <p className="text-muted-foreground mt-1">
                    Gestao de tesouraria e contas
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
                {/* Bar Chart: AP vs AR por Mes */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                            Contas a Pagar vs. Receber por Mes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {monthlyData.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Sem dados financeiros registados
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" fontSize={12} />
                                    <YAxis
                                        fontSize={11}
                                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                        width={50}
                                    />
                                    <Tooltip
                                        formatter={(v) => [formatCurrency(Number(v)), '']}
                                        contentStyle={{ fontSize: 12 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                                    <Bar dataKey="ap" name="A Pagar" fill={MONTH_BAR_COLORS.ap} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="ar" name="A Receber" fill={MONTH_BAR_COLORS.ar} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Pie Chart: AP Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                            Estado - A Pagar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {apStatusPie.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Sem contas a pagar
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={apStatusPie}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={90}
                                        dataKey="value"
                                        nameKey="name"
                                        paddingAngle={3}
                                    >
                                        {apStatusPie.map((entry) => (
                                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#888'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), '']} />
                                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Pie Chart: AR Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            Estado - A Receber
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {arStatusPie.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Sem contas a receber
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={arStatusPie}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={90}
                                        dataKey="value"
                                        nameKey="name"
                                        paddingAngle={3}
                                    >
                                        {arStatusPie.map((entry) => (
                                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#888'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), '']} />
                                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Upcoming 30 Days */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Proximos 30 Dias
                        {upcoming.length > 0 && (
                            <Badge variant="outline" className="ml-1 text-xs">
                                {upcoming.length}
                            </Badge>
                        )}
                    </CardTitle>
                    <Link to="/finance">
                        <Button variant="ghost" size="sm" className="text-xs gap-1">
                            Ver tudo <ArrowRight className="h-3 w-3" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {upcoming.length === 0 ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                            Nenhuma conta com vencimento nos proximos 30 dias
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {upcoming.slice(0, 8).map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <Badge variant={item.type === 'AP' ? 'destructive' : 'success'} className="shrink-0 text-xs">
                                            {item.type === 'AP' ? 'Pagar' : 'Receber'}
                                        </Badge>
                                        <span className="truncate font-medium text-sm">{item.description}</span>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0 ml-4">
                                        <span className="text-muted-foreground text-xs">
                                            {format(parseISO(item.due_date), 'dd MMM yyyy', { locale: ptBR })}
                                        </span>
                                        <span className={`font-semibold text-sm ${item.type === 'AP' ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {formatCurrency(Number(item.amount))}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {upcoming.length > 8 && (
                                <p className="text-xs text-muted-foreground text-center pt-2">
                                    + {upcoming.length - 8} mais...
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Access */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Link to="/finance" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-red-500/10 p-3 rounded-lg">
                                <TrendingDown className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Contas a Pagar</p>
                                <p className="text-xs text-muted-foreground">{pendingAP.length} pendente{pendingAP.length !== 1 ? 's' : ''}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/finance" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-emerald-500/10 p-3 rounded-lg">
                                <HandCoins className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Contas a Receber</p>
                                <p className="text-xs text-muted-foreground">{pendingAR.length} pendente{pendingAR.length !== 1 ? 's' : ''}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/relatorios" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-violet-500/10 p-3 rounded-lg">
                                <FileText className="h-5 w-5 text-violet-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Relatorios</p>
                                <p className="text-xs text-muted-foreground">Analises e exportacao</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
