import { useState } from 'react'
import { Plus, Trash2, FileText, Loader2, Edit2, FolderPlus, FolderOpen } from 'lucide-react'
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
import {
    useBudget,
    useCreateBudget,
    useAddBudgetItem,
    useUpdateBudgetItem,
    useDeleteBudgetItem,
    useCreateBudgetChapter,
    useUpdateBudgetChapter,
    useDeleteBudgetChapter
} from '../hooks/useBudgets'
import { formatCurrency } from '@/lib/utils'
import type { BudgetItem, BudgetChapter } from '@/services/budgets'
import { usePermissions } from '@/features/auth/usePermissions'
import { useForm as useHookForm } from 'react-hook-form'
import { useEffect } from 'react'

const budgetItemSchema = z.object({
    description: z.string().min(2, 'Descrição obrigatória'),
    chapter_id: z.string().optional(),
    unit: z.string().min(1, 'Unidade obrigatória'),
    qty: z.coerce.number().min(0.01, 'Quantidade deve ser > 0'),
    unit_price: z.coerce.number().min(0.01, 'Preço deve ser > 0'),
})

type BudgetItemFormValues = z.infer<typeof budgetItemSchema>

const chapterSchema = z.object({
    name: z.string().min(2, 'Nome obrigatório')
})

export function BudgetTab({ obraId }: { obraId: string }) {
    const { hasPermission } = usePermissions()
    const { data: budget, isLoading, isError } = useBudget(obraId)
    const createBudgetMutation = useCreateBudget()
    const addItemMutation = useAddBudgetItem()
    const updateItemMutation = useUpdateBudgetItem()
    const deleteItemMutation = useDeleteBudgetItem()

    const createChapterMutation = useCreateBudgetChapter()
    const updateChapterMutation = useUpdateBudgetChapter()
    const deleteChapterMutation = useDeleteBudgetChapter()

    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
    const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false)

    const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
    const [editingChapter, setEditingChapter] = useState<BudgetChapter | null>(null)

    const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
    const [deleteChapterId, setDeleteChapterId] = useState<string | null>(null)

    // Used to pre-select a chapter when clicking '+ Rubrica' inside a chapter's table
    const [prefilledChapterId, setPrefilledChapterId] = useState<string | undefined>(undefined)

    // Modals reset handlers
    const handleItemOpenChange = (open: boolean) => {
        setIsItemDialogOpen(open)
        if (!open) {
            setEditingItem(null)
            setPrefilledChapterId(undefined)
        }
    }

    const handleChapterOpenChange = (open: boolean) => {
        setIsChapterDialogOpen(open)
        if (!open) setEditingChapter(null)
    }

    // Edit Triggers
    const handleEditItem = (item: BudgetItem) => {
        setEditingItem(item)
        setIsItemDialogOpen(true)
    }

    const handleEditChapter = (chapter: BudgetChapter) => {
        setEditingChapter(chapter)
        setIsChapterDialogOpen(true)
    }

    // Delete Handlers
    const handleDeleteItemConfirm = async () => {
        if (deleteItemId) {
            await deleteItemMutation.mutateAsync(deleteItemId)
            setDeleteItemId(null)
        }
    }

    const handleDeleteChapterConfirm = async () => {
        if (deleteChapterId) {
            await deleteChapterMutation.mutateAsync(deleteChapterId)
            setDeleteChapterId(null)
        }
    }

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
                        {hasPermission('obras.manage') && (
                            <Button
                                onClick={() => void createBudgetMutation.mutateAsync(obraId)}
                                disabled={createBudgetMutation.isPending}
                            >
                                {createBudgetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Criar Orçamento (v1)
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Calcular totais
    const grandTotal =
        budget.chapters.reduce((sum, ch) => sum + ch.items.reduce((s, i) => s + (i.total || 0), 0), 0) +
        budget.uncategorizedItems.reduce((s, i) => s + (i.total || 0), 0)

    const canEdit = hasPermission('obras.manage')

    return (
        <Card className="mt-4">
            <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">Orçamento da Obra</CardTitle>
                        <Badge variant="outline">v{budget.version}</Badge>
                        <Badge variant={budget.status === 'Rascunho' ? 'warning' : 'success'}>{budget.status}</Badge>
                    </div>
                    <CardDescription>Estrutura de custos orçamentados detalhada por capítulos.</CardDescription>
                </div>

                {canEdit && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Novo Capítulo */}
                        <Dialog open={isChapterDialogOpen} onOpenChange={handleChapterOpenChange}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => setEditingChapter(null)}>
                                    <FolderPlus className="h-4 w-4 mr-2" /> Novo Capítulo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>{editingChapter ? 'Editar Capítulo' : 'Novo Capítulo'}</DialogTitle>
                                    <DialogDescription>
                                        Os capítulos (ex: "Alvenarias") agrupam diferentes rubricas para melhor análise de custos.
                                    </DialogDescription>
                                </DialogHeader>
                                <AddChapterForm
                                    budgetId={budget.id}
                                    initialData={editingChapter || undefined}
                                    onSuccess={() => handleChapterOpenChange(false)}
                                    onSubmit={(payload) => editingChapter
                                        ? updateChapterMutation.mutateAsync({ id: editingChapter.id, name: payload.name })
                                        : createChapterMutation.mutateAsync({ budgetId: budget.id, name: payload.name })
                                    }
                                    isPending={createChapterMutation.isPending || updateChapterMutation.isPending}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {/* Caso o orçamento esteja totalmente vazio */}
                {budget.chapters.length === 0 && budget.uncategorizedItems.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center border rounded-md bg-muted/20 border-dashed">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <FolderOpen className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Construa o seu orçamento</h2>
                        <p className="text-muted-foreground text-center max-w-sm mb-8">
                            Para começar a orçamentar esta obra de forma estruturada, crie o seu primeiro Capítulo (ex: "Trabalhos Preparatórios").
                        </p>
                        {canEdit && (
                            <Button size="lg" onClick={() => { setEditingChapter(null); setIsChapterDialogOpen(true) }}>
                                <FolderPlus className="h-5 w-5 mr-2" /> Criar Primeiro Capítulo
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* Iterar sobre os Capítulos */}
                        {budget.chapters.map((chapter) => {
                            const subtotal = chapter.items.reduce((s, i) => s + (i.total || 0), 0)

                            return (
                                <div key={chapter.id} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
                                        <div className="flex items-center gap-2">
                                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="font-semibold text-sm">{chapter.name}</h3>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-medium">{formatCurrency(subtotal)}</span>
                                            {canEdit && (
                                                <div className="flex items-center">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditChapter(chapter)}>
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteChapterId(chapter.id)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {chapter.items.length === 0 ? (
                                        <div className="px-4 py-8 flex items-center justify-center text-sm">
                                            {canEdit ? (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="text-muted-foreground"
                                                    onClick={() => {
                                                        setEditingItem(null)
                                                        setPrefilledChapterId(chapter.id)
                                                        setIsItemDialogOpen(true)
                                                    }}
                                                >
                                                    <Plus className="h-4 w-4 mr-2" /> Adicionar a primeira rubrica a este capítulo
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground py-2">Capítulo vazio.</span>
                                            )}
                                        </div>
                                    ) : (
                                        <Table className="text-sm">
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="py-2 h-9">Descrição</TableHead>
                                                    <TableHead className="py-2 h-9 text-center w-[80px]">Unid.</TableHead>
                                                    <TableHead className="py-2 h-9 text-right w-[100px]">Qtd</TableHead>
                                                    <TableHead className="py-2 h-9 text-right w-[120px]">P.U. (€)</TableHead>
                                                    <TableHead className="py-2 h-9 text-right w-[120px]">Total (€)</TableHead>
                                                    {canEdit && <TableHead className="w-[60px]"></TableHead>}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {chapter.items.map((item) => (
                                                    <TableRow key={item.id} className="border-b-0 border-t">
                                                        <TableCell className="font-medium py-2">{item.description}</TableCell>
                                                        <TableCell className="text-center py-2">{item.unit}</TableCell>
                                                        <TableCell className="text-right py-2">{item.qty}</TableCell>
                                                        <TableCell className="text-right py-2">{formatCurrency(item.unit_price)}</TableCell>
                                                        <TableCell className="text-right font-medium py-2">{formatCurrency(item.total)}</TableCell>
                                                        {canEdit && (
                                                            <TableCell className="py-1">
                                                                <div className="flex justify-end gap-1">
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditItem(item)}>
                                                                        <Edit2 className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteItemId(item.id)}>
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}

                                    {/* Adicionar Rubrica Contextual */}
                                    {canEdit && chapter.items.length > 0 && (
                                        <div className="px-4 py-3 bg-muted/5 border-t flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-primary hover:text-primary hover:bg-primary/10 h-8 text-xs font-semibold"
                                                onClick={() => {
                                                    setEditingItem(null)
                                                    setPrefilledChapterId(chapter.id)
                                                    setIsItemDialogOpen(true)
                                                }}
                                            >
                                                <Plus className="h-3.5 w-3.5 mr-1" /> Nova Rubrica
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Rubricas Sem Capítulo */}
                        {budget.uncategorizedItems.length > 0 && (
                            <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 bg-muted/10 border-b">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <FileText className="h-4 w-4" />
                                        <h3 className="font-semibold text-sm">Rubricas Soltas (Sem Capítulo)</h3>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {formatCurrency(budget.uncategorizedItems.reduce((s, i) => s + (i.total || 0), 0))}
                                    </span>
                                </div>
                                <Table className="text-sm">
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="py-2 h-9">Descrição</TableHead>
                                            <TableHead className="py-2 h-9 text-center w-[80px]">Unid.</TableHead>
                                            <TableHead className="py-2 h-9 text-right w-[100px]">Qtd</TableHead>
                                            <TableHead className="py-2 h-9 text-right w-[120px]">P.U. (€)</TableHead>
                                            <TableHead className="py-2 h-9 text-right w-[120px]">Total (€)</TableHead>
                                            {canEdit && <TableHead className="w-[60px]"></TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {budget.uncategorizedItems.map((item) => (
                                            <TableRow key={item.id} className="border-b-0 border-t">
                                                <TableCell className="font-medium py-2">{item.description}</TableCell>
                                                <TableCell className="text-center py-2">{item.unit}</TableCell>
                                                <TableCell className="text-right py-2">{item.qty}</TableCell>
                                                <TableCell className="text-right py-2">{formatCurrency(item.unit_price)}</TableCell>
                                                <TableCell className="text-right font-medium py-2">{formatCurrency(item.total)}</TableCell>
                                                {canEdit && (
                                                    <TableCell className="py-1">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditItem(item)}>
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteItemId(item.id)}>
                                                                <Trash2 className="h-3 w-3" />
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
                    </div>
                )}

                {/* Unified Item Modal used by all chapters */}
                <Dialog open={isItemDialogOpen} onOpenChange={handleItemOpenChange}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Editar Rubrica' : 'Adicionar Rubrica'}</DialogTitle>
                            <DialogDescription>Adicione um novo item de custo ao orçamento.</DialogDescription>
                        </DialogHeader>
                        <AddItemForm
                            budgetId={budget.id}
                            chapters={budget.chapters}
                            prefilledChapterId={prefilledChapterId}
                            initialData={editingItem || undefined}
                            onSuccess={() => handleItemOpenChange(false)}
                            onSubmit={(payload) => editingItem
                                ? updateItemMutation.mutateAsync({ id: editingItem.id, payload })
                                : addItemMutation.mutateAsync(payload)
                            }
                            isPending={addItemMutation.isPending || updateItemMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>

                {/* Confirm Delete Modals */}
                <AlertDialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remover Rubrica</AlertDialogTitle>
                            <AlertDialogDescription>Tem a certeza que deseja eliminar esta rubrica? O valor total será recalculado.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void handleDeleteItemConfirm()}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={!!deleteChapterId} onOpenChange={(open) => !open && setDeleteChapterId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Apagar Capítulo</AlertDialogTitle>
                            <AlertDialogDescription>De certeza que deseja apagar este Capítulo? <br /><strong>Aviso:</strong> Todas as rubricas lá dentro serão apagadas também.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void handleDeleteChapterConfirm()}>Apagar Tudo</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Grand Total Footer */}
                {(budget.chapters.length > 0 || budget.uncategorizedItems.length > 0) && (
                    <div className="mt-6 flex justify-end">
                        <div className="rounded-lg bg-primary/5 border border-primary/20 px-8 py-4 flex items-center gap-6">
                            <span className="text-sm font-semibold text-primary/80 uppercase tracking-wider">Total Orçado</span>
                            <span className="text-3xl font-bold tracking-tight text-primary">{formatCurrency(grandTotal)}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card >
    )
}

// ─── Forms ──────────────────────────────────────────────────

function AddChapterForm({
    initialData,
    onSuccess,
    onSubmit,
    isPending,
}: {
    budgetId: string;
    initialData?: BudgetChapter;
    onSuccess: () => void;
    onSubmit: (payload: { name: string }) => Promise<any>;
    isPending: boolean;
}) {
    const form = useHookForm<{ name: string }>({
        resolver: zodResolver(chapterSchema),
        defaultValues: { name: initialData?.name || '' },
    })

    const handleSubmit = async (values: { name: string }) => {
        try {
            await onSubmit(values)
            form.reset()
            onSuccess()
        } catch { }
    }

    return (
        <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4 pt-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Capítulo</label>
                <Input {...form.register('name')} placeholder="Ex: Trabalhos Preparatórios" autoFocus />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : initialData ? 'Guardar' : 'Adicionar'}
            </Button>
        </form>
    )
}

function AddItemForm({
    budgetId,
    chapters,
    prefilledChapterId,
    initialData,
    onSuccess,
    onSubmit,
    isPending,
}: {
    budgetId: string;
    chapters: BudgetChapter[];
    prefilledChapterId?: string;
    initialData?: BudgetItem;
    onSuccess: () => void;
    onSubmit: (payload: any) => Promise<any>;
    isPending: boolean;
}) {
    const form = useHookForm<any>({
        resolver: zodResolver(budgetItemSchema),
        defaultValues: {
            description: initialData?.description || '',
            chapter_id: initialData?.chapter_id || prefilledChapterId || 'unassigned',
            unit: initialData?.unit || 'vg',
            qty: initialData?.qty || 1,
            unit_price: initialData?.unit_price || 0,
        },
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                description: initialData.description,
                chapter_id: initialData.chapter_id || 'unassigned',
                unit: initialData.unit,
                qty: initialData.qty,
                unit_price: initialData.unit_price,
            })
        } else if (prefilledChapterId) {
            form.setValue('chapter_id', prefilledChapterId)
        }
    }, [initialData, prefilledChapterId, form])

    const handleSubmit = async (values: BudgetItemFormValues) => {
        try {
            await onSubmit({
                budget_id: budgetId,
                chapter_id: values.chapter_id === 'unassigned' ? null : values.chapter_id,
                description: values.description,
                unit: values.unit,
                qty: values.qty,
                unit_price: values.unit_price,
            })
            form.reset()
            onSuccess()
        } catch { }
    }

    return (
        <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4 pt-4">

            <div className="space-y-2">
                <label className="text-sm font-medium">Capítulo</label>
                <Select
                    onValueChange={(val) => form.setValue('chapter_id', val)}
                    value={form.watch('chapter_id')}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um capítulo..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned">Nenhum Capítulo (Rubrica Solta)</SelectItem>
                        {chapters.map(ch => (
                            <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input {...form.register('description')} placeholder="Ex: Betão Armado" />
                {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message as string}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Unidade</label>
                    <Input {...form.register('unit')} placeholder="m2, un, vg..." />
                    {form.formState.errors.unit && <p className="text-xs text-destructive">{form.formState.errors.unit.message as string}</p>}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Quantidade</label>
                    <Input type="number" step="0.01" {...form.register('qty')} />
                    {form.formState.errors.qty && <p className="text-xs text-destructive">{form.formState.errors.qty.message as string}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Preço Unitário (€)</label>
                <Input type="number" step="0.01" {...form.register('unit_price')} />
                {form.formState.errors.unit_price && <p className="text-xs text-destructive">{form.formState.errors.unit_price.message as string}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : initialData ? 'Guardar Alterações' : 'Adicionar'}
            </Button>
        </form>
    )
}
