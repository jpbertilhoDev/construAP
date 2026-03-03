import { useState } from 'react'
import { Plus, Trash2, FileText, Loader2 } from 'lucide-react'
import { useForm as useHookForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCosts, useCreateCost, useUpdateCost, useDeleteCost } from '../hooks/useCosts'
import { useSuppliers } from '../hooks/useSuppliers'
import { Edit2 } from 'lucide-react'
import type { Cost } from '@/services/costs'
import { useBudget } from '../hooks/useBudgets'
import { formatCurrency, formatDate } from '@/lib/utils'
import { usePermissions } from '@/features/auth/usePermissions'

const statusMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning" | "success"> = {
    'Rascunho': 'secondary',
    'Pendente Aprovação': 'warning',
    'Aprovado': 'success',
    'Anulado': 'destructive',
}

const costSchema = z.object({
    description: z.string().min(2, 'Descrição obrigatória'),
    amount: z.coerce.number().min(0.01, 'Valor deve ser > 0'),
    iva_pct: z.coerce.number().min(0).max(100),
    cost_date: z.string().min(10, 'Data obrigatória'),
    status: z.enum(['Rascunho', 'Pendente Aprovação', 'Aprovado', 'Anulado']),
    notes: z.string().optional(),
    supplier_id: z.string().optional(),
    budget_item_id: z.string().optional(),
    file: z.any().optional(),
})


type CostFormValues = z.infer<typeof costSchema>

export function CostsTab({ obraId }: { obraId: string }) {
    const { hasPermission } = usePermissions()
    const { data: costs = [], isLoading, isError } = useCosts(obraId)
    const createCostMutation = useCreateCost()
    const updateCostMutation = useUpdateCost(obraId)
    const deleteCostMutation = useDeleteCost(obraId)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCost, setEditingCost] = useState<Cost | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open)
        if (!open) setEditingCost(null)
    }

    const handleEdit = (cost: Cost) => {
        setEditingCost(cost)
        setIsDialogOpen(true)
    }

    const handleDelete = async () => {
        if (deleteId) {
            await deleteCostMutation.mutateAsync(deleteId)
            setDeleteId(null)
        }
    }

    if (isLoading) {
        return <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    }

    if (isError) {
        return <div className="py-8 text-center text-destructive">Erro ao carregar custos reais.</div>
    }

    const totalCostsBase = costs.reduce((acc, cost) => cost.status !== 'Anulado' ? acc + cost.amount : acc, 0)
    const totalCostsIva = costs.reduce((acc, cost) => cost.status !== 'Anulado' ? acc + ((cost as any).valor_iva ?? cost.amount * 0.23) : acc, 0)
    const totalComIva = totalCostsBase + totalCostsIva

    return (
        <Card className="mt-4">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-lg">Custos Reais</CardTitle>
                    <CardDescription>Registe despesas, faturas e outros custos associados à obra.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    {hasPermission('obras.manage') && (
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setEditingCost(null)}>
                                <Plus className="h-4 w-4" /> Lançar Custo
                            </Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingCost ? 'Editar Custo' : 'Lançar Custo Real'}</DialogTitle>
                            <DialogDescription>
                                {editingCost ? 'Edite os valores deste registo.' : 'Registe um novo custo. Ficheiros e aprovações complexas na v2.'}
                            </DialogDescription>
                        </DialogHeader>
                        <AddCostForm
                            obraId={obraId}
                            initialData={editingCost || undefined}
                            onSuccess={() => handleOpenChange(false)}
                            onSubmit={(payload) => editingCost
                                ? updateCostMutation.mutateAsync({ id: editingCost.id, payload })
                                : createCostMutation.mutateAsync(payload)
                            }
                            isPending={createCostMutation.isPending || updateCostMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {costs.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center border rounded-md bg-muted/20 border-dashed">
                        <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="font-medium">Nenhum custo registado.</p>
                        <p className="text-muted-foreground text-sm max-w-sm mt-1">
                            Comece a adicionar custos para acompanhar o progresso financeiro face ao orçamento.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[100px]">Data</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Fornecedor</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Anexo</TableHead>
                                    <TableHead className="text-right">Base (€)</TableHead>
                                    <TableHead className="text-right">IVA (€)</TableHead>
                                    <TableHead className="text-right font-semibold">Total c/ IVA (€)</TableHead>
                                    {hasPermission('obras.manage') && <TableHead className="w-[60px]"></TableHead>}
                                </TableRow>

                            </TableHeader>
                            <TableBody>
                                {costs.map((cost) => (
                                    <TableRow key={cost.id} className={cost.status === 'Anulado' ? 'opacity-50' : ''}>
                                        <TableCell>{formatDate(cost.cost_date)}</TableCell>
                                        <TableCell className="font-medium">{cost.description}</TableCell>
                                        <TableCell className="text-muted-foreground">{cost.suppliers?.name || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusMap[cost.status] || 'default'}>{cost.status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {cost.doc_url ? (
                                                <a href={cost.doc_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                    <FileText className="h-3 w-3" /> Ver
                                                </a>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">{formatCurrency(cost.amount)}</TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency((cost as any).valor_iva ?? cost.amount * 0.23)}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency((cost as any).total ?? cost.amount * 1.23)}</TableCell>

                                        {hasPermission('obras.manage') && (
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => handleEdit(cost)}
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setDeleteId(cost.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar Registo de Custo</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem a certeza que deseja eliminar este registo de custo? O valor gasto total será recalculado.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => void handleDelete()}
                            >
                                Eliminar Custo
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {costs.length > 0 && (
                    <div className="mt-6 flex justify-end">
                        <div className="rounded-lg bg-muted px-6 py-4 flex items-center gap-8">
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Base s/ IVA</p>
                                <p className="text-lg font-semibold">{formatCurrency(totalCostsBase)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">IVA</p>
                                <p className="text-lg font-semibold text-amber-600">{formatCurrency(totalCostsIva)}</p>
                            </div>
                            <div className="text-center border-l pl-8">
                                <p className="text-xs text-muted-foreground font-medium">Total c/ IVA</p>
                                <p className="text-2xl font-bold tracking-tight text-primary">{formatCurrency(totalComIva)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function AddCostForm({
    obraId,
    initialData,
    onSuccess,
    onSubmit,
    isPending,
}: {
    obraId: string;
    initialData?: Cost;
    onSuccess: () => void;
    onSubmit: (payload: any) => Promise<any>;
    isPending: boolean;
}) {
    const form = useHookForm<CostFormValues>({
        resolver: zodResolver(costSchema) as any,
        defaultValues: {
            description: initialData?.description || '',
            amount: initialData?.amount || 0,
            iva_pct: (initialData as any)?.iva_pct ?? 23,
            cost_date: initialData ? new Date(initialData.cost_date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
            status: initialData?.status || 'Pendente Aprovação',
            notes: initialData?.notes || '',
            supplier_id: initialData?.supplier_id || '',
            budget_item_id: initialData?.budget_item_id || '',
        },
    })

    const watchedAmount = form.watch('amount')
    const watchedIva = form.watch('iva_pct') ?? 23
    const valorIva = Math.round(Number(watchedAmount) * Number(watchedIva) / 100 * 100) / 100
    const totalComIva = Number(watchedAmount) + valorIva

    const { data: suppliers } = useSuppliers()
    const { data: budget } = useBudget(obraId)
    const budgetItems = budget?.items || []



    const handleSubmit = async (values: CostFormValues) => {
        try {
            await onSubmit({
                obra_id: obraId,
                description: values.description,
                amount: values.amount,
                iva_pct: values.iva_pct ?? 23,
                cost_date: values.cost_date,
                status: values.status,
                notes: values.notes,
                supplier_id: values.supplier_id || null,
                budget_item_id: values.budget_item_id || null,
                file: values.file?.[0] || null,
            })

            form.reset()
            onSuccess()
        } catch {
            // handle errors broadly for now
        }
    }

    return (
        <form onSubmit={(e) => void form.handleSubmit(handleSubmit as any)(e)} className="space-y-4 pt-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Data do Custo</label>
                <Input type="date" {...form.register('cost_date')} />
                {form.formState.errors.cost_date && (
                    <p className="text-xs text-destructive">{form.formState.errors.cost_date.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input {...form.register('description')} placeholder="Ex: Fatura Betão Pronto #124" />
                {form.formState.errors.description && (
                    <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Valor Base s/ IVA (€)</label>
                    <Input type="number" step="0.01" {...form.register('amount')} />
                    {form.formState.errors.amount && (
                        <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Taxa IVA (%)</label>
                    <Select
                        onValueChange={(val) => form.setValue('iva_pct', Number(val))}
                        defaultValue={String(form.getValues('iva_pct') ?? 23)}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="23">23% — Taxa Normal</SelectItem>
                            <SelectItem value="13">13% — Taxa Intermedária</SelectItem>
                            <SelectItem value="6">6% — Taxa Reduzida</SelectItem>
                            <SelectItem value="0">0% — Isento</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-md border bg-muted/40 px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">IVA ({watchedIva}%):</span>
                <span>{valorIva.toFixed(2)} €</span>
                <span className="font-semibold border-l ml-4 pl-4">Total c/ IVA: <span className="text-primary">{totalComIva.toFixed(2)} €</span></span>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select
                    onValueChange={(val: string) => form.setValue('status', val as any)}
                    defaultValue={form.getValues('status')}
                >

                    <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Rascunho">Rascunho</SelectItem>
                        <SelectItem value="Pendente Aprovação">Pendente Aprovação</SelectItem>
                        <SelectItem value="Aprovado">Aprovado</SelectItem>
                    </SelectContent>
                </Select>
            </div>


            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Fornecedor</label>
                    <Select
                        onValueChange={(val: string) => form.setValue('supplier_id', val === '__none__' ? '' : val)}
                        defaultValue={form.getValues('supplier_id') || '__none__'}
                    >
                        <SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">-- Nenhum --</SelectItem>
                            {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Rubrica (Orçamento)</label>
                    <Select
                        onValueChange={(val: string) => form.setValue('budget_item_id', val === '__none__' ? '' : val)}
                        defaultValue={form.getValues('budget_item_id') || '__none__'}
                    >
                        <SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">-- Nenhuma --</SelectItem>
                            {budgetItems.map(item => <SelectItem key={item.id} value={item.id}>{item.description}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Anexo de Fatura / Recibo (PDF, Imagem)</label>
                <Input type="file" accept=".pdf,image/*" {...form.register('file')} />
                <p className="text-xs text-muted-foreground">Opcional. Até 10MB.</p>
            </div>


            <Button type="submit" className="w-full mt-4" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : initialData ? 'Guardar Alterações' : 'Criar Custo'}
            </Button>
        </form>
    )
}
