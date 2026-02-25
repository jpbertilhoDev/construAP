import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    ShoppingCart, Package, Truck, AlertTriangle, ArrowRight,
    BarChart3, ClipboardList,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts'
import { usePurchaseOrders, useMaterials } from '@/features/compras/hooks/useCompras'
import { formatCurrency, formatDate } from '@/lib/utils'

const PIE_COLORS = ['#94a3b8', '#f59e0b', '#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#ef4444']

const ESTADO_VARIANT: Record<string, string> = {
    Rascunho: 'secondary',
    Submetido: 'warning',
    Aprovado: 'default',
    'Em Curso': 'default',
    'Parcialmente Recebido': 'warning',
    Recebido: 'success',
    Cancelado: 'destructive',
}

export function DashboardCompras() {
    const { data: pos = [], isLoading: loadingPOs } = usePurchaseOrders()
    const { data: materials = [], isLoading: loadingMat } = useMaterials()

    const isLoading = loadingPOs || loadingMat
    const todayStr = new Date().toISOString().substring(0, 10)

    const ativos = useMemo(() =>
        pos.filter(p => !['Recebido', 'Cancelado'].includes(p.estado))
    , [pos])

    const atrasados = useMemo(() =>
        pos.filter(p =>
            p.data_entrega_prevista &&
            p.data_entrega_prevista < todayStr &&
            !['Recebido', 'Cancelado'].includes(p.estado)
        )
    , [pos, todayStr])

    const stockBaixo = useMemo(() =>
        materials.filter(m => m.estoque_atual <= m.estoque_minimo && m.estoque_minimo > 0)
    , [materials])

    const totalValueAtivos = ativos.reduce((sum, p) => sum + Number(p.total_sem_iva || 0), 0)

    // Bar chart: POs value by obra
    const posByObra = useMemo(() => {
        const map: Record<string, { name: string; valor: number }> = {}
        ativos.forEach(po => {
            const obraName = po.obras?.name ?? 'Sem obra'
            if (!map[obraName]) map[obraName] = { name: obraName, valor: 0 }
            map[obraName].valor += Number(po.total_sem_iva || 0)
        })
        return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 8)
    }, [ativos])

    // Pie chart: POs by estado
    const posByEstado = useMemo(() => {
        const groups: Record<string, number> = {}
        pos.forEach(p => { groups[p.estado] = (groups[p.estado] || 0) + 1 })
        return Object.entries(groups).map(([name, value]) => ({ name, value }))
    }, [pos])

    const stats = [
        {
            label: 'POs Ativos',
            value: isLoading ? '...' : ativos.length.toString(),
            icon: ShoppingCart,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'POs Atrasados',
            value: isLoading ? '...' : atrasados.length.toString(),
            icon: AlertTriangle,
            color: atrasados.length > 0 ? 'text-amber-500' : 'text-emerald-500',
            bg: atrasados.length > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
        },
        {
            label: 'Stock Baixo',
            value: isLoading ? '...' : stockBaixo.length.toString(),
            icon: Package,
            color: stockBaixo.length > 0 ? 'text-red-500' : 'text-emerald-500',
            bg: stockBaixo.length > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
        },
        {
            label: 'Valor POs Ativos',
            value: isLoading ? '...' : formatCurrency(totalValueAtivos),
            icon: ClipboardList,
            color: 'text-violet-500',
            bg: 'bg-violet-500/10',
        },
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Compras & Materiais</h1>
                <p className="text-muted-foreground mt-1">
                    Gestao de pedidos, fornecedores e stock
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
                {/* Bar Chart: POs by Obra */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            POs Ativos por Obra
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {posByObra.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Sem pedidos de compra ativos
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={posByObra} layout="vertical" margin={{ left: 10, right: 20 }}>
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
                                        formatter={(v) => [formatCurrency(Number(v)), 'Valor']}
                                        contentStyle={{ fontSize: 12 }}
                                    />
                                    <Bar dataKey="valor" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Pie Chart: POs by Estado */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            Pedidos por Estado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {posByEstado.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Sem pedidos registados
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={posByEstado}
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
                                        {posByEstado.map((_entry, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => [v, 'Pedidos']} />
                                    <Legend fontSize={11} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Alerts */}
            {(atrasados.length > 0 || stockBaixo.length > 0) && (
                <div className="grid gap-4 lg:grid-cols-2">
                    {atrasados.length > 0 && (
                        <Card className="border-amber-500/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                                    <AlertTriangle className="h-4 w-4" /> POs com entrega atrasada
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {atrasados.slice(0, 5).map(po => (
                                        <Link key={po.id} to={`/compras/pedidos/${po.id}`} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm">{po.numero}</p>
                                                <p className="text-xs text-muted-foreground">{po.suppliers?.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                <span className="text-xs text-destructive">{formatDate(po.data_entrega_prevista!)}</span>
                                                <Badge variant={ESTADO_VARIANT[po.estado] as any}>{po.estado}</Badge>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {stockBaixo.length > 0 && (
                        <Card className="border-red-500/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                                    <Package className="h-4 w-4" /> Stock abaixo do minimo
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {stockBaixo.slice(0, 5).map(m => (
                                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                                            <p className="font-medium text-sm">{m.nome}</p>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-red-600 font-medium">{m.estoque_atual} {m.unidade}</span>
                                                <span className="text-muted-foreground">/ min {m.estoque_minimo}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Recent POs */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        Ultimos Pedidos de Compra
                    </CardTitle>
                    <Link to="/compras/pedidos">
                        <Button variant="ghost" size="sm" className="text-xs gap-1">
                            Ver todos <ArrowRight className="h-3 w-3" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {pos.length === 0 ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                            Nenhum pedido de compra
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pos.slice(0, 6).map(po => (
                                <Link key={po.id} to={`/compras/pedidos/${po.id}`} className="block group">
                                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm group-hover:text-primary transition-colors">{po.numero}</p>
                                            <p className="text-xs text-muted-foreground">{po.suppliers?.name} · {po.obras?.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            <span className="font-medium text-sm">{formatCurrency(po.total_sem_iva)}</span>
                                            <Badge variant={ESTADO_VARIANT[po.estado] as any}>{po.estado}</Badge>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Access */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link to="/compras/fornecedores" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-blue-500/10 p-3 rounded-lg">
                                <Truck className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Fornecedores</p>
                                <p className="text-xs text-muted-foreground">Gerir fornecedores</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/compras/materiais" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-emerald-500/10 p-3 rounded-lg">
                                <Package className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Catalogo</p>
                                <p className="text-xs text-muted-foreground">Materiais e stock</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/compras/pedidos" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-amber-500/10 p-3 rounded-lg">
                                <ShoppingCart className="h-5 w-5 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Pedidos</p>
                                <p className="text-xs text-muted-foreground">{ativos.length} ativo{ativos.length !== 1 ? 's' : ''}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/compras/consumo" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-violet-500/10 p-3 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-violet-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Consumo</p>
                                <p className="text-xs text-muted-foreground">Consumo por obra</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
