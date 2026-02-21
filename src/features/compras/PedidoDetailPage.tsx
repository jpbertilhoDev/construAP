import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePurchaseOrder, useUpdatePOStatus, useGoodsReceipts, useCreateGoodsReceipt } from './hooks/useCompras'
import { useForm } from 'react-hook-form'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { NewGRNLine } from '@/services/materiais'

const estadoVariant: Record<string, any> = {
    Rascunho: 'secondary', Submetido: 'warning', Aprovado: 'default',
    'Em Curso': 'default', 'Parcialmente Recebido': 'warning', Recebido: 'success', Cancelado: 'destructive',
}

export function PedidoDetailPage() {
    const { id } = useParams<{ id: string }>()
    const { data: po, isLoading } = usePurchaseOrder(id!)
    const { data: grns = [] } = useGoodsReceipts(id!)
    const updateStatusMutation = useUpdatePOStatus()
    const createGRNMutation = useCreateGoodsReceipt(id!)

    const [grnOpen, setGrnOpen] = useState(false)
    const grnForm = useForm<{ data_recepcao: string; notas?: string }>({
        defaultValues: { data_recepcao: new Date().toISOString().substring(0, 10) },
    })

    const [grnLines, setGrnLines] = useState<NewGRNLine[]>([])

    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    if (!po) return <div className="py-8 text-center text-muted-foreground">Pedido não encontrado.</div>

    const canApprove = po.estado === 'Rascunho' || po.estado === 'Submetido'
    const canReceive = ['Aprovado', 'Em Curso', 'Parcialmente Recebido'].includes(po.estado)
    const canCancel = !['Recebido', 'Cancelado'].includes(po.estado)

    const openGRN = () => {
        // Pre-populate GRN lines from PO lines that are not fully received
        const unreceivedLines = (po.lines ?? []).filter(l => l.qtd_recebida < l.quantidade).map(l => ({
            po_line_id: l.id,
            material_id: l.material_id,
            qtd_recebida: l.quantidade - l.qtd_recebida,
            divergencia: false,
        }))
        setGrnLines(unreceivedLines)
        setGrnOpen(true)
    }

    const onGRNSubmit = async (values: any) => {
        const validLines = grnLines.filter(l => l.qtd_recebida > 0)
        await createGRNMutation.mutateAsync({ obraId: po.obra_id, dataRecepcao: values.data_recepcao, lines: validLines, notas: values.notas })
        grnForm.reset()
        setGrnOpen(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
                    <Link to="/compras/pedidos"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">{po.numero}</h1>
                    <p className="text-muted-foreground text-sm">{po.suppliers?.name} · {po.obras?.name} · {formatDate(po.data_pedido)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge variant={estadoVariant[po.estado]} className="text-sm">{po.estado}</Badge>
                    {canApprove && (
                        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => void updateStatusMutation.mutateAsync({ id: po.id, estado: 'Aprovado' })}>
                            <CheckCircle2 className="h-4 w-4" /> Aprovar
                        </Button>
                    )}
                    {canReceive && (
                        <Button size="sm" className="gap-1.5" onClick={openGRN}>
                            <Truck className="h-4 w-4" /> Receção
                        </Button>
                    )}
                    {canCancel && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive gap-1.5"
                            onClick={() => {
                                if (confirm('Cancelar pedido?')) {
                                    void updateStatusMutation.mutateAsync({ id: po.id, estado: 'Cancelado' })
                                }
                            }}>
                            <XCircle className="h-4 w-4" /> Cancelar
                        </Button>
                    )}
                </div>
            </div>

            {/* Totais */}
            <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xl font-bold">{formatCurrency(po.total_sem_iva)}</p>
                    <p className="text-xs text-muted-foreground">Total s/ IVA</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xl font-bold">{formatCurrency(po.total_com_iva)}</p>
                    <p className="text-xs text-muted-foreground">Total c/ IVA</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xl font-bold">{(po.lines ?? []).length}</p>
                    <p className="text-xs text-muted-foreground">Linhas</p>
                </CardContent></Card>
            </div>

            <Tabs defaultValue="linhas">
                <TabsList>
                    <TabsTrigger value="linhas">Linhas</TabsTrigger>
                    <TabsTrigger value="recepcoes">Receções ({grns.length})</TabsTrigger>
                    <TabsTrigger value="info">Informações</TabsTrigger>
                </TabsList>

                {/* Linhas */}
                <TabsContent value="linhas" className="mt-4">
                    <Card><CardContent className="pt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Material</TableHead>
                                    <TableHead>Descr.</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">€/unit</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Recebido</TableHead>
                                    <TableHead>IVA</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(po.lines ?? []).map(l => (
                                    <TableRow key={l.id}>
                                        <TableCell className="font-medium">{l.materials?.nome ?? '—'}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{l.descricao ?? '—'}</TableCell>
                                        <TableCell className="text-right">{l.quantidade} {l.materials?.unidade}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(l.preco_unitario)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(l.total_sem_iva)}</TableCell>
                                        <TableCell className="text-right">
                                            <span className={l.qtd_recebida >= l.quantidade ? 'text-emerald-600 font-medium' : l.qtd_recebida > 0 ? 'text-amber-600' : ''}>
                                                {l.qtd_recebida}/{l.quantidade}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{l.iva_pct}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent></Card>
                </TabsContent>

                {/* Receções */}
                <TabsContent value="recepcoes" className="mt-4">
                    <Card><CardContent className="pt-4">
                        {grns.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8 text-sm">Nenhuma receção registada.</div>
                        ) : (
                            <div className="divide-y">
                                {grns.map(grn => (
                                    <div key={grn.id} className="py-3 flex items-center justify-between text-sm">
                                        <div>
                                            <p className="font-medium">{formatDate(grn.data_recepcao)}</p>
                                            <p className="text-muted-foreground text-xs">{grn.notas ?? ''}</p>
                                        </div>
                                        {grn.tem_divergencia && <Badge variant="warning">Divergência</Badge>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent></Card>
                </TabsContent>

                {/* Info */}
                <TabsContent value="info" className="mt-4">
                    <Card><CardContent className="pt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        {[
                            ['Número', po.numero],
                            ['Estado', po.estado],
                            ['Fornecedor', po.suppliers?.name],
                            ['Obra', po.obras?.name],
                            ['Data Pedido', formatDate(po.data_pedido)],
                            ['Previsão Entrega', po.data_entrega_prevista ? formatDate(po.data_entrega_prevista) : '—'],
                            ['Notas', po.notas],
                        ].filter(([, v]) => v).map(([label, val]) => (
                            <div key={label as string}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">{val}</p></div>
                        ))}
                    </CardContent></Card>
                </TabsContent>
            </Tabs>

            {/* GRN Dialog */}
            <Dialog open={grnOpen} onOpenChange={setGrnOpen}>
                <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Registar Receção de Materiais</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => void grnForm.handleSubmit(onGRNSubmit)(e)} className="space-y-4 mt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Data *</label>
                                <Input type="date" {...grnForm.register('data_recepcao', { required: true })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Notas</label>
                                <Input {...grnForm.register('notas')} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Quantidades recebidas</label>
                            {grnLines.map((line, i) => {
                                const poLine = (po.lines ?? []).find(l => l.id === line.po_line_id)
                                const mat = poLine?.materials
                                return (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <div className="flex-1">
                                            <p className="font-medium">{mat?.nome ?? line.material_id.substring(0, 8)}</p>
                                            <p className="text-xs text-muted-foreground">Encomendado: {poLine?.quantidade} {mat?.unidade}</p>
                                        </div>
                                        <Input
                                            className="w-28 h-8"
                                            type="number"
                                            step="any"
                                            min="0"
                                            max={poLine ? poLine.quantidade - poLine.qtd_recebida : undefined}
                                            value={line.qtd_recebida}
                                            onChange={e => setGrnLines(ls => ls.map((l, idx) => idx === i ? { ...l, qtd_recebida: Number(e.target.value) } : l))}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                        <Button type="submit" className="w-full" disabled={createGRNMutation.isPending}>
                            {createGRNMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                            Confirmar Receção
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
