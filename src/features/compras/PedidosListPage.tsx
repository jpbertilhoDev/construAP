import { useState } from 'react'
import { Plus, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from 'react-router-dom'
import { usePurchaseOrders, useCreatePurchaseOrder, useSuppliers, useMaterials } from './hooks/useCompras'
import { useForm } from 'react-hook-form'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { NewPOLine } from '@/services/materiais'
import { usePermissions } from '@/features/auth/usePermissions'

const estadoVariant: Record<string, any> = {
    Rascunho: 'secondary', Submetido: 'warning', Aprovado: 'default',
    'Em Curso': 'default', 'Parcialmente Recebido': 'warning', Recebido: 'success', Cancelado: 'destructive',
}

export function PedidosListPage() {
    const { hasPermission } = usePermissions()
    const [search, setSearch] = useState('')
    const [estadoFilter, setEstadoFilter] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [lines, setLines] = useState<NewPOLine[]>([{ material_id: '', quantidade: 1, preco_unitario: 0, iva_pct: 23 }])

    const { data: pos = [], isLoading } = usePurchaseOrders({
        estado: estadoFilter && estadoFilter !== 'todos' ? estadoFilter : undefined,
    })
    const { data: suppliers = [] } = useSuppliers()
    const { data: materials = [] } = useMaterials()
    const createMutation = useCreatePurchaseOrder()

    const form = useForm<{ supplier_id: string; obra_id: string; data_entrega_prevista?: string; notas?: string }>()

    const filtered = pos.filter(p =>
        p.numero.toLowerCase().includes(search.toLowerCase()) ||
        (p.suppliers?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.obras?.name ?? '').toLowerCase().includes(search.toLowerCase())
    )

    const addLine = () => setLines(l => [...l, { material_id: '', quantidade: 1, preco_unitario: 0, iva_pct: 23 }])
    const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i))
    const updateLine = (i: number, field: keyof NewPOLine, value: any) => setLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line))

    const totalSemIva = lines.reduce((s, l) => s + (l.quantidade ?? 0) * (l.preco_unitario ?? 0), 0)

    const onSubmit = async (values: any) => {
        const validLines = lines.filter(l => l.material_id && l.quantidade > 0)
        if (validLines.length === 0) return
        await createMutation.mutateAsync({ po: values, lines: validLines })
        form.reset()
        setLines([{ material_id: '', quantidade: 1, preco_unitario: 0, iva_pct: 23 }])
        setIsOpen(false)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pedidos de Compra</h1>
                    <p className="text-muted-foreground text-sm">{pos.length} pedidos no total</p>
                </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-44 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Pesquisar..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                    <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Todos os estados" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {['Rascunho', 'Submetido', 'Aprovado', 'Em Curso', 'Parcialmente Recebido', 'Recebido', 'Cancelado'].map(s =>
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        )}
                    </SelectContent>
                </Select>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    {hasPermission('compras.manage') && (
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-1.5 ml-auto"><Plus className="h-4 w-4" /> Novo PO</Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Novo Pedido de Compra</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Fornecedor *</label>
                                    <Select onValueChange={v => form.setValue('supplier_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">ID da Obra *</label>
                                    <Input placeholder="UUID" {...form.register('obra_id', { required: true })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Previsão de Entrega</label>
                                    <Input type="date" {...form.register('data_entrega_prevista')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Notas</label>
                                    <Input {...form.register('notas')} />
                                </div>
                            </div>

                            {/* Linhas */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold">Linhas *</label>
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Linha</Button>
                                </div>
                                {lines.map((line, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-4">
                                            <Select onValueChange={v => {
                                                const mat = materials.find(m => m.id === v)
                                                updateLine(i, 'material_id', v)
                                                if (mat) updateLine(i, 'iva_pct', mat.iva_pct)
                                            }}>
                                                <SelectTrigger className="h-8"><SelectValue placeholder="Material..." /></SelectTrigger>
                                                <SelectContent>
                                                    {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Input className="col-span-2 h-8 text-xs" type="number" min="0.001" step="any" placeholder="Qty"
                                            value={line.quantidade} onChange={e => updateLine(i, 'quantidade', Number(e.target.value))} />
                                        <Input className="col-span-2 h-8 text-xs" type="number" min="0" step="0.01" placeholder="€/unit"
                                            value={line.preco_unitario} onChange={e => updateLine(i, 'preco_unitario', Number(e.target.value))} />
                                        <div className="col-span-2 text-sm font-medium text-right">{formatCurrency(line.quantidade * line.preco_unitario)}</div>
                                        <Button type="button" variant="ghost" size="icon" className="col-span-1 h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeLine(i)} disabled={lines.length === 1}>×</Button>
                                    </div>
                                ))}
                                <div className="flex justify-end text-sm font-medium pt-1">
                                    Total s/ IVA: <span className="ml-2 text-primary">{formatCurrency(totalSemIva)}</span>
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Criar Pedido de Compra
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="border rounded-md bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº</TableHead>
                                <TableHead>Fornecedor</TableHead>
                                <TableHead>Obra</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Entrega</TableHead>
                                <TableHead className="text-right">Total s/ IVA</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum pedido encontrado.</TableCell></TableRow>
                            ) : filtered.map(po => (
                                <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50">
                                    <TableCell>
                                        <Link to={`/compras/pedidos/${po.id}`} className="font-mono font-medium hover:underline">{po.numero}</Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{po.suppliers?.name ?? '—'}</TableCell>
                                    <TableCell className="text-muted-foreground">{po.obras?.name ?? '—'}</TableCell>
                                    <TableCell className="text-sm">{formatDate(po.data_pedido)}</TableCell>
                                    <TableCell className="text-sm">{po.data_entrega_prevista ? formatDate(po.data_entrega_prevista) : '—'}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(po.total_sem_iva)}</TableCell>
                                    <TableCell><Badge variant={estadoVariant[po.estado]}>{po.estado}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
