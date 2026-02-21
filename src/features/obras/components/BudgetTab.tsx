import { useState } from 'react'
import { Plus, Trash2, FileText, Loader2 } from 'lucide-react'
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
import { useBudget, useCreateBudget, useAddBudgetItem, useUpdateBudgetItem, useDeleteBudgetItem } from '../hooks/useBudgets'
import { formatCurrency } from '@/lib/utils'
import { Edit2 } from 'lucide-react'
import type { BudgetItem } from '@/services/budgets'

const budgetItemSchema = z.object({
    description: z.string().min(2, 'Descrição obrigatória'),
    unit: z.string().min(1, 'Unidade obrigatória'),
    qty: z.coerce.number().min(0.01, 'Quantidade deve ser > 0'),
    unit_price: z.coerce.number().min(0.01, 'Preço deve ser > 0'),
})

type BudgetItemFormValues = z.infer<typeof budgetItemSchema>

export function BudgetTab({ obraId }: { obraId: string }) {
    const { data: budget, isLoading, isError } = useBudget(obraId)
    const createBudgetMutation = useCreateBudget()
    const addItemMutation = useAddBudgetItem()
    const updateItemMutation = useUpdateBudgetItem()
    const deleteItemMutation = useDeleteBudgetItem()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open)
        if (!open) setEditingItem(null)
    }

    const handleEdit = (item: BudgetItem) => {
        setEditingItem(item)
        setIsDialogOpen(true)
    }

    const handleDelete = async () => {
        if (deleteId) {
            await deleteItemMutation.mutateAsync(deleteId)
            setDeleteId(null)
        }
    }

    // O React Hook Form está comentado mal aqui pq não importamos corretamente. 
    // O correto seria: react-hook-form
    // Mas vamos corrigir no import

    if (isLoading) {
        return <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    }

    if (isError) {
        return <div className="py-8 text-center text-destructive">Erro ao carregar orçamento.</div>
    }

    if (!budget) {
        return (
            <Card className="mt-4">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="font-semibold text-lg">Nenhum orçamento definido</p>
                        <p className="text-muted-foreground text-sm mt-1 max-w-xs mb-6">
                            Esta obra ainda não tem um orçamento base. Crie o primeiro rascunho.
                        </p>
                        <Button
                            onClick={() => void createBudgetMutation.mutateAsync(obraId)}
                            disabled={createBudgetMutation.isPending}
                        >
                            {createBudgetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Criar Orçamento (v1)
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const sortedItems = [...budget.items].sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    const total = sortedItems.reduce((acc, item) => acc + (item.total || 0), 0)

    return (
        <Card className="mt-4">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">Orçamento da Obra</CardTitle>
                        <Badge variant="outline">v{budget.version}</Badge>
                        <Badge variant={budget.status === 'Rascunho' ? 'warning' : 'success'}>{budget.status}</Badge>
                    </div>
                    <CardDescription>Gerencie as rubricas e os valores orçamentados.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setEditingItem(null)}>
                            <Plus className="h-4 w-4" /> Nova Rubrica
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Editar Rubrica' : 'Adicionar Rubrica'}</DialogTitle>
                            <DialogDescription>
                                {editingItem ? 'Altere os valores desta rubrica.' : 'Adicione um novo item ao orçamento. O total será calculado automaticamente.'}
                            </DialogDescription>
                        </DialogHeader>
                        <AddItemForm
                            budgetId={budget.id}
                            initialData={editingItem || undefined}
                            onSuccess={() => handleOpenChange(false)}
                            onSubmit={(payload) => editingItem
                                ? updateItemMutation.mutateAsync({ id: editingItem.id, payload })
                                : addItemMutation.mutateAsync(payload)
                            }
                            isPending={addItemMutation.isPending || updateItemMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {sortedItems.length === 0 ? (
                    <div className="py-12 text-center border rounded-md bg-muted/20 border-dashed">
                        <p className="text-muted-foreground text-sm">Orçamento vazio. Adicione a primeira rubrica.</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-center w-[100px]">Unid.</TableHead>
                                    <TableHead className="text-right w-[120px]">Qtd</TableHead>
                                    <TableHead className="text-right w-[140px]">P.U. (€)</TableHead>
                                    <TableHead className="text-right w-[140px]">Total (€)</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.description}</TableCell>
                                        <TableCell className="text-center">{item.unit}</TableCell>
                                        <TableCell className="text-right">{item.qty}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => handleEdit(item)}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteId(item.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remover Rubrica</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem a certeza que deseja eliminar esta rubrica do orçamento? O valor total será recalculado.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => void handleDelete()}
                            >
                                Remover Rubrica
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {sortedItems.length > 0 && (
                    <div className="mt-6 flex justify-end">
                        <div className="rounded-lg bg-muted px-6 py-4 flex items-center gap-6">
                            <span className="text-sm font-medium text-muted-foreground">Total Orçado</span>
                            <span className="text-2xl font-bold tracking-tight">{formatCurrency(total)}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card >
    )
}

// Separate component for the form to use `useForm` cleanly
import { useForm as useHookForm } from 'react-hook-form'
import { useEffect } from 'react'

function AddItemForm({
    budgetId,
    initialData,
    onSuccess,
    onSubmit,
    isPending,
}: {
    budgetId: string;
    initialData?: BudgetItem;
    onSuccess: () => void;
    onSubmit: (payload: any) => Promise<any>;
    isPending: boolean;
}) {
    const form = useHookForm<BudgetItemFormValues>({
        resolver: zodResolver(budgetItemSchema) as any,

        defaultValues: {
            description: initialData?.description || '',
            unit: initialData?.unit || 'vg',
            qty: initialData?.qty || 1,
            unit_price: initialData?.unit_price || 0,
        },
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                description: initialData.description,
                unit: initialData.unit,
                qty: initialData.qty,
                unit_price: initialData.unit_price,
            })
        }
    }, [initialData, form])

    const handleSubmit = async (values: BudgetItemFormValues) => {
        try {
            await onSubmit({
                budget_id: budgetId,
                description: values.description,
                unit: values.unit,
                qty: values.qty,
                unit_price: values.unit_price,
            })
            form.reset()
            onSuccess()
        } catch {
            // Error is handled by mutation globally or can be set here
        }
    }

    return (
        <form onSubmit={(e) => void form.handleSubmit(handleSubmit as any)(e)} className="space-y-4 pt-4">

            <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input {...form.register('description')} placeholder="Ex: Betão Armado" />
                {form.formState.errors.description && (
                    <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Unidade</label>
                    <Input {...form.register('unit')} placeholder="m2, un, vg..." />
                    {form.formState.errors.unit && (
                        <p className="text-xs text-destructive">{form.formState.errors.unit.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Quantidade</label>
                    <Input type="number" step="0.01" {...form.register('qty')} />
                    {form.formState.errors.qty && (
                        <p className="text-xs text-destructive">{form.formState.errors.qty.message}</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Preço Unitário (€)</label>
                <Input type="number" step="0.01" {...form.register('unit_price')} />
                {form.formState.errors.unit_price && (
                    <p className="text-xs text-destructive">{form.formState.errors.unit_price.message}</p>
                )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : initialData ? 'Guardar Alterações' : 'Adicionar'}
            </Button>
        </form>
    )
}
