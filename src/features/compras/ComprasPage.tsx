import { Link } from 'react-router-dom'
import { ShoppingCart, Package, Truck, AlertTriangle, Plus, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePurchaseOrders } from './hooks/useCompras'
import { useMaterials } from './hooks/useCompras'
import { formatCurrency, formatDate } from '@/lib/utils'
import { usePermissions } from '@/features/auth/usePermissions'

const estadoVariant: Record<string, any> = {
    Rascunho: 'secondary',
    Submetido: 'warning',
    Aprovado: 'default',
    'Em Curso': 'default',
    'Parcialmente Recebido': 'warning',
    Recebido: 'success',
    Cancelado: 'destructive',
}

export function ComprasPage() {
    const { hasPermission } = usePermissions()
    const { data: pos = [] } = usePurchaseOrders()
    const { data: materials = [] } = useMaterials()

    const ativos = pos.filter(p => !['Recebido', 'Cancelado'].includes(p.estado))
    const atrasados = pos.filter(p => p.data_entrega_prevista && p.data_entrega_prevista < new Date().toISOString().substring(0, 10) && !['Recebido', 'Cancelado'].includes(p.estado))
    const stockBaixo = materials.filter(m => m.estoque_atual <= m.estoque_minimo && m.estoque_minimo > 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Compras & Materiais</h1>
                    <p className="text-muted-foreground text-sm">Fornecedores, pedidos, receção e consumo por obra</p>
                </div>
                {hasPermission('compras.manage') && (
                    <Button asChild size="sm" className="gap-1.5">
                        <Link to="/compras/pedidos/novo"><Plus className="h-4 w-4" /> Novo Pedido</Link>
                    </Button>
                )}
            </div>

            {/* KPIs */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'POs Ativos', value: ativos.length, icon: ShoppingCart, color: 'text-blue-600', href: '/compras/pedidos' },
                    { label: 'POs Atrasados', value: atrasados.length, icon: AlertTriangle, color: atrasados.length > 0 ? 'text-amber-600' : 'text-muted-foreground', href: '/compras/pedidos' },
                    { label: 'Materiais com stock baixo', value: stockBaixo.length, icon: Package, color: stockBaixo.length > 0 ? 'text-red-600' : 'text-muted-foreground', href: '/compras/materiais' },
                    { label: 'Total POs', value: pos.length, icon: Truck, color: 'text-slate-500', href: '/compras/pedidos' },
                ].map(k => (
                    <Link key={k.label} to={k.href}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="pt-4 pb-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">{k.label}</p>
                                    <k.icon className={`h-4 w-4 ${k.color}`} />
                                </div>
                                <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Alertas */}
            {(atrasados.length > 0 || stockBaixo.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {atrasados.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                                    <AlertTriangle className="h-4 w-4" /> POs com entrega atrasada
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y">
                                    {atrasados.slice(0, 5).map(po => (
                                        <Link key={po.id} to={`/compras/pedidos/${po.id}`} className="flex items-center justify-between py-2.5 text-sm hover:opacity-75">
                                            <div>
                                                <p className="font-medium">{po.numero}</p>
                                                <p className="text-muted-foreground text-xs">{po.suppliers?.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-destructive">{formatDate(po.data_entrega_prevista!)}</span>
                                                <Badge variant={estadoVariant[po.estado]}>{po.estado}</Badge>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {stockBaixo.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                                    <Package className="h-4 w-4" /> Stock abaixo do mínimo
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y">
                                    {stockBaixo.slice(0, 5).map(m => (
                                        <div key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                                            <p className="font-medium">{m.nome}</p>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-red-600">{m.estoque_atual} {m.unidade}</span>
                                                <span className="text-muted-foreground">/ mín {m.estoque_minimo}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Últimos POs */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Últimos Pedidos de Compra</CardTitle>
                        <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                            <Link to="/compras/pedidos">Ver todos <ArrowRight className="h-3 w-3" /></Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {pos.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">Nenhum pedido de compra.</div>
                    ) : (
                        <div className="divide-y">
                            {pos.slice(0, 6).map(po => (
                                <Link key={po.id} to={`/compras/pedidos/${po.id}`} className="flex items-center justify-between py-3 text-sm hover:opacity-75">
                                    <div>
                                        <p className="font-medium">{po.numero}</p>
                                        <p className="text-muted-foreground text-xs">{po.suppliers?.name} · {po.obras?.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{formatCurrency(po.total_sem_iva)}</span>
                                        <Badge variant={estadoVariant[po.estado]}>{po.estado}</Badge>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Acesso rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { title: 'Fornecedores', href: '/compras/fornecedores', icon: Truck },
                    { title: 'Catálogo', href: '/compras/materiais', icon: Package },
                    { title: 'Pedidos', href: '/compras/pedidos', icon: ShoppingCart },
                    { title: 'Consumo', href: '/compras/consumo', icon: AlertTriangle },
                ].map(item => (
                    <Link key={item.href} to={item.href}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardHeader className="pb-2 pt-4">
                                <item.icon className="h-5 w-5 text-primary" />
                                <CardTitle className="text-sm mt-1">{item.title}</CardTitle>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
