import { useState } from 'react'
import { Plus, Loader2, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConsumptions, useCreateConsumption, useMaterials } from './hooks/useCompras'
import { useForm } from 'react-hook-form'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/features/auth/usePermissions'

export function ConsumoPage() {
    const { hasPermission } = usePermissions()
    const [isOpen, setIsOpen] = useState(false)
    const obraFilter = ''

    const { data: consumptions = [], isLoading } = useConsumptions({ obra_id: obraFilter || undefined })
    const { data: materials = [] } = useMaterials()
    const createMutation = useCreateConsumption()

    const form = useForm<{ obra_id: string; material_id: string; quantidade: number; data: string; observacao?: string }>({
        defaultValues: { data: new Date().toISOString().substring(0, 10), quantidade: 1 },
    })

    const onSubmit = async (values: any) => {
        await createMutation.mutateAsync({ ...values, quantidade: Number(values.quantidade) })
        form.reset()
        setIsOpen(false)
    }

    const selectedMaterial = materials.find(m => m.id === form.watch('material_id'))

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Consumo de Materiais</h1>
                    <p className="text-muted-foreground text-sm">Registo de saída de stock por obra</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    {hasPermission('compras.manage') && (
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Registar Consumo</Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[420px]">
                        <DialogHeader><DialogTitle>Registar Consumo de Material</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-3 mt-2">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Material *</label>
                                <Select onValueChange={v => form.setValue('material_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Selecionar material..." /></SelectTrigger>
                                    <SelectContent>
                                        {materials.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.nome} <span className="text-muted-foreground ml-1">({m.estoque_atual} {m.unidade} em stock)</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedMaterial && (
                                    <p className="text-xs text-muted-foreground">
                                        Stock actual: {selectedMaterial.estoque_atual} {selectedMaterial.unidade} · Custo médio: {formatCurrency(selectedMaterial.custo_medio)}/{selectedMaterial.unidade}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">ID da Obra *</label>
                                <Input placeholder="UUID da obra" {...form.register('obra_id', { required: true })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Quantidade *</label>
                                    <Input type="number" step="any" min="0.001" {...form.register('quantidade', { required: true, valueAsNumber: true })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Data *</label>
                                    <Input type="date" {...form.register('data', { required: true })} />
                                </div>
                            </div>
                            {selectedMaterial && form.watch('quantidade') > 0 && (
                                <div className="bg-muted/50 rounded p-2 text-sm">
                                    Custo estimado: <span className="font-medium">{formatCurrency(form.watch('quantidade') * selectedMaterial.custo_medio)}</span>
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Observação</label>
                                <Input placeholder="Local, propósito..." {...form.register('observacao')} />
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Registar Consumo
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Histórico de Consumo</CardTitle>
                        <CardDescription>Cada consumo gera automaticamente um custo na obra correspondente</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {consumptions.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10 flex flex-col items-center gap-2">
                                <Package className="h-8 w-8" />
                                <p>Nenhum consumo registado.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Obra</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Custo Unit.</TableHead>
                                        <TableHead className="text-right">Custo Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {consumptions.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell>{formatDate(c.data)}</TableCell>
                                            <TableCell className="font-medium">{c.materials?.nome ?? '—'}</TableCell>
                                            <TableCell className="text-muted-foreground">{c.obras?.name ?? c.obra_id.substring(0, 8)}</TableCell>
                                            <TableCell className="text-right">{c.quantidade} {c.materials?.unidade}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{c.custo_unit ? formatCurrency(c.custo_unit) : '—'}</TableCell>
                                            <TableCell className="text-right font-medium">{c.custo_total ? formatCurrency(c.custo_total) : '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
