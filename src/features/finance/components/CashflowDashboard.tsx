import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts'
import { ptBR } from 'date-fns/locale/pt-BR'
import { format, parseISO, isPast, isWithinInterval, addDays, startOfDay } from 'date-fns'
import { usePayables } from '@/features/finance/hooks/usePayables'
import { useReceivables } from '@/features/finance/hooks/useReceivables'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, TrendingDown, TrendingUp, Clock } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
    'Pendente': 'hsl(var(--chart-3))',
    'Parcial': 'hsl(var(--chart-4))',
    'Pago': '#10b981',
    'Cancelado': 'hsl(var(--muted-foreground))',
}

const MONTH_BAR_COLORS = { ap: '#ef4444', ar: '#10b981' }

function EmptyState({ message }: { message: string }) {
    return (
        <div className="h-48 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Clock className="h-10 w-10 opacity-30" />
            <p className="text-sm">{message}</p>
        </div>
    )
}

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                <p className="font-semibold mb-2">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <p key={i} style={{ color: entry.color }} className="flex justify-between gap-6">
                        <span>{entry.name}:</span>
                        <span className="font-semibold">{formatCurrency(entry.value)}</span>
                    </p>
                ))}
            </div>
        )
    }
    return null
}

export function CashflowDashboard() {
    const { data: payables = [], isLoading: loadingAP } = usePayables()
    const { data: receivables = [], isLoading: loadingAR } = useReceivables()

    const isLoading = loadingAP || loadingAR
    const today = startOfDay(new Date())
    const next30 = addDays(today, 30)

    // ─── KPI calculations ───────────────────────────────────────────────────
    const overdueAP = useMemo(() =>
        payables.filter(p => p.status === 'Pendente' && isPast(parseISO(p.due_date)) && !format(parseISO(p.due_date), 'yyyy-MM-dd').includes(format(today, 'yyyy-MM-dd')))
        , [payables, today])

    const overdueAR = useMemo(() =>
        receivables.filter(r => r.status === 'Pendente' && isPast(parseISO(r.due_date)))
        , [receivables])

    const pendingAP = useMemo(() =>
        payables.filter(p => p.status === 'Pendente' || p.status === 'Parcial')
        , [payables])

    const pendingAR = useMemo(() =>
        receivables.filter(r => r.status === 'Pendente' || r.status === 'Parcial')
        , [receivables])

    const totalPendingAP = pendingAP.reduce((s, p) => s + Number(p.amount), 0)
    const totalPendingAR = pendingAR.reduce((s, r) => s + Number(r.amount), 0)
    const netBalance = totalPendingAR - totalPendingAP

    // ─── Monthly bar chart: AP vs AR by due_date month ──────────────────────
    const monthlyData = useMemo(() => {
        const months: Record<string, { month: string; ap: number; ar: number }> = {}

        const add = (date: string, amount: number, key: 'ap' | 'ar') => {
            const monthKey = date.substring(0, 7)
            if (!months[monthKey]) {
                months[monthKey] = {
                    month: format(parseISO(date), 'MMM yy', { locale: ptBR }),
                    ap: 0,
                    ar: 0,
                }
            }
            months[monthKey][key] += Number(amount)
        }

        payables
            .filter(p => p.status !== 'Cancelado')
            .forEach(p => add(p.due_date.substring(0, 7) + '-01', p.amount, 'ap'))

        receivables
            .filter(r => r.status !== 'Cancelado')
            .forEach(r => add(r.due_date.substring(0, 7) + '-01', r.amount, 'ar'))

        return Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => v)
    }, [payables, receivables])

    // ─── AP status pie ───────────────────────────────────────────────────────
    const apStatusPie = useMemo(() => {
        const groups: Record<string, number> = {}
        payables.forEach(p => { groups[p.status] = (groups[p.status] || 0) + Number(p.amount) })
        return Object.entries(groups).map(([name, value]) => ({ name, value }))
    }, [payables])

    // ─── AR status pie ───────────────────────────────────────────────────────
    const arStatusPie = useMemo(() => {
        const groups: Record<string, number> = {}
        receivables.forEach(r => { groups[r.status] = (groups[r.status] || 0) + Number(r.amount) })
        return Object.entries(groups).map(([name, value]) => ({ name, value }))
    }, [receivables])

    // ─── Upcoming obligations (next 30 days) ────────────────────────────────
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

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">A carregar dados financeiros...</div>
    }

    const hasAnyData = payables.length > 0 || receivables.length > 0

    return (
        <div className="space-y-6">

            {/* ── KPI Cards ── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">A Pagar (Pendente)</p>
                                <p className="text-2xl font-bold text-destructive mt-1">{formatCurrency(totalPendingAP)}</p>
                                <p className="text-xs text-muted-foreground mt-1">{pendingAP.length} conta{pendingAP.length !== 1 ? 's' : ''}</p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-destructive/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">A Receber (Pendente)</p>
                                <p className="text-2xl font-bold text-emerald-500 mt-1">{formatCurrency(totalPendingAR)}</p>
                                <p className="text-xs text-muted-foreground mt-1">{pendingAR.length} conta{pendingAR.length !== 1 ? 's' : ''}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-emerald-500/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Saldo Projetado</p>
                                <p className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                                    {formatCurrency(netBalance)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">AR − AP pendentes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className={overdueAP.length > 0 ? 'border-destructive/40' : ''}>
                    <CardContent className="pt-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Vencidos (AP)</p>
                                <p className={`text-2xl font-bold mt-1 ${overdueAP.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
                                    {overdueAP.length}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {overdueAP.length > 0
                                        ? formatCurrency(overdueAP.reduce((s, p) => s + Number(p.amount), 0))
                                        : 'Sem atrasos'}
                                </p>
                            </div>
                            <AlertTriangle className={`h-8 w-8 ${overdueAP.length > 0 ? 'text-destructive/50' : 'text-muted-foreground/20'}`} />
                        </div>
                    </CardContent>
                </Card>
                <Card className={overdueAR.length > 0 ? 'border-amber-500/40' : ''}>
                    <CardContent className="pt-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Vencidos (AR)</p>
                                <p className={`text-2xl font-bold mt-1 ${overdueAR.length > 0 ? 'text-amber-500' : 'text-foreground'}`}>
                                    {overdueAR.length}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {overdueAR.length > 0
                                        ? formatCurrency(overdueAR.reduce((s, r) => s + Number(r.amount), 0))
                                        : 'Sem atrasos'}
                                </p>
                            </div>
                            <AlertTriangle className={`h-8 w-8 ${overdueAR.length > 0 ? 'text-amber-500/50' : 'text-muted-foreground/20'}`} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {!hasAnyData ? (
                <Card>
                    <CardContent className="pt-6">
                        <EmptyState message="Ainda não há contas a pagar ou a receber registadas. Comece por adicionar nas abas acima." />
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 lg:grid-cols-4">

                    {/* ── Monthly Bar Chart (spans 2 cols) ── */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">Contas a Pagar vs. Receber por Mês</CardTitle>
                            <CardDescription>Valor total por mês de vencimento (excluindo cancelados)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {monthlyData.length === 0 ? (
                                <EmptyState message="Sem dados para apresentar." />
                            ) : (
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={4}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.15)" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={8} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} width={50} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                                            <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                                            <Bar dataKey="ap" name="A Pagar" fill={MONTH_BAR_COLORS.ap} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            <Bar dataKey="ar" name="A Receber" fill={MONTH_BAR_COLORS.ar} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── AP Status Pie ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Estado — A Pagar</CardTitle>
                            <CardDescription>Distribuição por estado (valor €)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {apStatusPie.length === 0 ? (
                                <EmptyState message="Sem dados." />
                            ) : (
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={apStatusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                                                {apStatusPie.map((entry) => (
                                                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#888'} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v: any) => formatCurrency(v)} />
                                            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} formatter={(value) => value} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── AR Status Pie ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Estado — A Receber</CardTitle>
                            <CardDescription>Distribuição por estado (valor €)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {arStatusPie.length === 0 ? (
                                <EmptyState message="Sem dados." />
                            ) : (
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={arStatusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                                                {arStatusPie.map((entry) => (
                                                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#888'} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v: any) => formatCurrency(v)} />
                                            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} formatter={(value) => value} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Upcoming 30 days ── */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="text-base">Próximos 30 Dias</CardTitle>
                            <CardDescription>Contas pendentes com vencimento nos próximos 30 dias</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {upcoming.length === 0 ? (
                                <EmptyState message="Nenhuma conta com vencimento nos próximos 30 dias." />
                            ) : (
                                <div className="divide-y">
                                    {upcoming.slice(0, 8).map((item) => (
                                        <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <Badge variant={item.type === 'AP' ? 'destructive' : 'success'} className="shrink-0 text-xs">
                                                    {item.type === 'AP' ? 'Pagar' : 'Receber'}
                                                </Badge>
                                                <span className="truncate font-medium">{item.description}</span>
                                            </div>
                                            <div className="flex items-center gap-6 shrink-0 ml-4">
                                                <span className="text-muted-foreground text-xs">
                                                    {format(parseISO(item.due_date), 'dd MMM yyyy', { locale: ptBR })}
                                                </span>
                                                <span className={`font-semibold ${item.type === 'AP' ? 'text-destructive' : 'text-emerald-500'}`}>
                                                    {formatCurrency(Number(item.amount))}
                                                </span>
                                                <Badge variant="outline" className="text-xs">{item.status}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {upcoming.length > 8 && (
                                        <p className="text-xs text-muted-foreground pt-3 text-center">
                                            + {upcoming.length - 8} mais...
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
