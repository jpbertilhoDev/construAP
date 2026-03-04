// @ts-nocheck
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    TrendingUp,
    PieChartIcon,
    BarChart2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type ObraFinancial = {
    obra_id: string
    obra_name?: string
    total_budgeted: number
    total_costs: number
    budget_variance?: number
    budget_variance_pct?: number
}

type Obra = {
    id: string
    name: string
    status: string
}

type CashflowTx = {
    transaction_date: string
    inflow: number
    outflow: number
}

// ── Currency formatter ───────────────────────────────────────────────────────

function fmtEur(val: number) {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(val)
}

function fmtEurShort(val: number) {
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M€`
    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}k€`
    return `${val.toFixed(0)}€`
}

// ── Status Pie Chart ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    'Em execução': '#3b82f6',
    'Em preparação': '#f59e0b',
    'Concluída': '#22c55e',
    'Suspensa': '#f97316',
    'Arquivada': '#94a3b8',
}

function ObrasStatusChart({ obras }: { obras: Obra[] }) {
    const counts: Record<string, number> = {}
    for (const o of obras) {
        counts[o.status] = (counts[o.status] ?? 0) + 1
    }
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }))

    if (data.length === 0) return (
        <p className="text-sm text-muted-foreground text-center py-8">Sem dados de obras</p>
    )

    return (
        <ResponsiveContainer width="100%" height={240}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                >
                    {data.map((entry) => (
                        <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[entry.name] ?? '#6366f1'}
                        />
                    ))}
                </Pie>
                <Tooltip formatter={(val: number) => [`${val} obra${val !== 1 ? 's' : ''}`, 'Quantidade']} />
            </PieChart>
        </ResponsiveContainer>
    )
}

// ── Budget Variance Bar Chart ────────────────────────────────────────────────

function BudgetVarianceChart({ financials }: { financials: ObraFinancial[] }) {
    // Pick the 5 with the largest absolute cost deviation
    const data = financials
        .filter(f => f.total_budgeted > 0)
        .map(f => ({
            name: f.obra_name ?? f.obra_id.slice(0, 8),
            orçado: Math.round(f.total_budgeted),
            realizado: Math.round(f.total_costs),
            desvio: Math.round(f.total_costs - f.total_budgeted),
        }))
        .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))
        .slice(0, 5)

    if (data.length === 0) return (
        <p className="text-sm text-muted-foreground text-center py-8">Sem dados de orçamento</p>
    )

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null
        return (
            <div className="rounded-lg border bg-background p-3 shadow-lg text-sm space-y-1">
                <p className="font-semibold truncate max-w-[200px]">{label}</p>
                <p className="text-emerald-600">Orçado: {fmtEur(payload[0]?.value ?? 0)}</p>
                <p className="text-amber-600">Realizado: {fmtEur(payload[1]?.value ?? 0)}</p>
                <p className={payload[0]?.payload?.desvio > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    Desvio: {fmtEur(payload[0]?.payload?.desvio)}
                </p>
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tickFormatter={(v) => v.length > 12 ? `${v.slice(0, 11)}…` : v}
                />
                <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmtEurShort}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    formatter={(val) => val === 'orçado' ? 'Orçado' : 'Realizado'}
                    wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="orçado" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="realizado" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
        </ResponsiveContainer>
    )
}

// ── Cashflow Area Chart ──────────────────────────────────────────────────────

function CashflowChart({ transactions }: { transactions: CashflowTx[] }) {
    // Aggregate by month (last 6 months)
    const monthMap: Record<string, { entradas: number; saídas: number }> = {}

    for (const tx of transactions) {
        const d = new Date(tx.transaction_date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!monthMap[key]) monthMap[key] = { entradas: 0, saídas: 0 }
        monthMap[key].entradas += tx.inflow ?? 0
        monthMap[key].saídas += tx.outflow ?? 0
    }

    const data = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([key, v]) => {
            const [year, month] = key.split('-')
            const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('pt-PT', {
                month: 'short',
                year: '2-digit',
            })
            return { mes: label, ...v }
        })

    if (data.length === 0) return (
        <p className="text-sm text-muted-foreground text-center py-8">Sem dados de cashflow</p>
    )

    return (
        <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={fmtEurShort} />
                <Tooltip
                    formatter={(val: number, name: string) => [fmtEur(val), name === 'entradas' ? 'Entradas' : 'Saídas']}
                />
                <Legend formatter={(val) => val === 'entradas' ? 'Entradas' : 'Saídas'} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="entradas" stroke="#22c55e" strokeWidth={2} fill="url(#colorEntradas)" />
                <Area type="monotone" dataKey="saídas" stroke="#f97316" strokeWidth={2} fill="url(#colorSaidas)" />
            </AreaChart>
        </ResponsiveContainer>
    )
}

// ── Main Export ──────────────────────────────────────────────────────────────

export function DashboardCharts({
    obras,
    financials,
    transactions,
}: {
    obras: Obra[]
    financials: ObraFinancial[]
    transactions: CashflowTx[]
}) {
    return (
        <div className="grid gap-4 lg:grid-cols-3">
            {/* Cashflow */}
            <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        Cashflow Mensal (últimos 6 meses)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CashflowChart transactions={transactions} />
                </CardContent>
            </Card>

            {/* Obras por Estado */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <PieChartIcon className="h-4 w-4" />
                        Obras por Estado
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ObrasStatusChart obras={obras} />
                </CardContent>
            </Card>

            {/* Budget Variance */}
            <Card className="lg:col-span-3">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <BarChart2 className="h-4 w-4" />
                        Orçado vs Realizado — Top 5 Obras com Maior Desvio
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <BudgetVarianceChart financials={financials} />
                </CardContent>
            </Card>
        </div>
    )
}
