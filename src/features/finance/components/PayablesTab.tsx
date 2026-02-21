import { useState } from 'react'
import { Plus, Trash2, Loader2, CheckCircle, XCircle, Search } from 'lucide-react'
import { useForm as useHookForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePayables, useCreatePayable, useUpdatePayableStatus, useDeletePayable } from '../hooks/usePayables'
import { useSuppliers } from '@/features/obras/hooks/useSuppliers'
import { useObras } from '@/features/obras/hooks/useObras'
import { formatCurrency, formatDate } from '@/lib/utils'

const statusMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning" | "success"> = {
    'Pendente': 'warning',
    'Parcial': 'secondary',
    'Pago': 'success',
    'Cancelado': 'destructive',
}

const payableSchema = z.object({
    description: z.string().min(3, 'Descrição muito curta'),
    amount: z.coerce.number().min(0.01, 'Valor deve ser maior que 0'),
    due_date: z.string().min(10, 'Data obrigatória'),
    status: z.enum(['Pendente', 'Parcial', 'Pago', 'Cancelado']),
    notes: z.string().optional(),
    supplier_id: z.string().optional(),
    obra_id: z.string().optional(),
})

type PayableFormValues = z.infer<typeof payableSchema>

export function PayablesTab() {
    const { data: payables = [], isLoading, isError } = usePayables()
    const deleteMutation = useDeletePayable()
    const { mutateAsync: updateStatus } = useUpdatePayableStatus()

    const [isAddOpen, setIsAddOpen] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const handleDelete = async () => {
        if (!deleteId) return
        setDeleteError(null)
        try {
            await deleteMutation.mutateAsync(deleteId)
            setDeleteId(null)
        } catch (err: any) {
            setDeleteError(err?.message || 'Erro ao eliminar. Verifique as suas permissões.')
        }
    }

    const filtered = payables.filter(ap =>
        ap.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ap.suppliers?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ap.obras?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> A carregar contas a pagar...</div>
    }

    if (isError) {
        return <div className="p-8 text-center text-destructive">Erro ao carregar contas a pagar. Verifique a sua ligação ou permissões.</div>
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
                <h3 className="text-lg font-medium shrink-0">Contas a Pagar (AP)</h3>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar..."
                        className="pl-9 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1 shrink-0">
                            <Plus className="h-4 w-4" /> Nova Conta a Pagar
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Registar Conta a Pagar</DialogTitle>
                        </DialogHeader>
                        <AddPayableForm onSuccess={() => setIsAddOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>

            {deleteError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {deleteError}
                </div>
            )}

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Vencimento</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Obra</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right w-[140px]">Valor (€)</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    {payables.length === 0 ? 'Nenhuma conta a pagar registada.' : 'Nenhum resultado para a pesquisa.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((ap) => (
                                <TableRow key={ap.id}>
                                    <TableCell className="whitespace-nowrap">{formatDate(ap.due_date)}</TableCell>
                                    <TableCell className="font-medium">{ap.description}</TableCell>
                                    <TableCell className="text-muted-foreground">{ap.suppliers?.name || '-'}</TableCell>
                                    <TableCell className="text-muted-foreground">{ap.obras?.name || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusMap[ap.status] || 'default'}>{ap.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(ap.amount)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            {ap.status !== 'Pago' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Marcar como Pago"
                                                    onClick={() => void updateStatus({ id: ap.id, status: 'Pago' })}
                                                >
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                </Button>
                                            )}
                                            {ap.status === 'Pago' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Marcar Pendente"
                                                    onClick={() => void updateStatus({ id: ap.id, status: 'Pendente' })}
                                                >
                                                    <XCircle className="h-4 w-4 text-amber-600" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                title="Eliminar conta"
                                                onClick={() => {
                                                    setDeleteError(null)
                                                    setDeleteId(ap.id)
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Conta a Pagar</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem a certeza que deseja eliminar esta conta? Esta acção não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void handleDelete()}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                            Eliminar Conta
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function AddPayableForm({ onSuccess }: { onSuccess: () => void }) {
    const { mutateAsync: createPayable, isPending } = useCreatePayable()
    const { data: suppliers } = useSuppliers()
    const { data: obras } = useObras()

    const form = useHookForm<PayableFormValues>({
        resolver: zodResolver(payableSchema) as any,
        defaultValues: {
            description: '',
            amount: 0,
            due_date: new Date().toISOString().substring(0, 10),
            status: 'Pendente',
            notes: '',
            supplier_id: '',
            obra_id: '',
        },
    })

    const handleSubmit = async (values: PayableFormValues) => {
        try {
            await createPayable({
                description: values.description,
                amount: values.amount,
                due_date: values.due_date,
                status: values.status,
                notes: values.notes,
                supplier_id: values.supplier_id || null,
                obra_id: values.obra_id || null,
            })
            form.reset()
            onSuccess()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <form onSubmit={(e) => void form.handleSubmit(handleSubmit as any)(e)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Vencimento</label>
                    <Input type="date" {...form.register('due_date')} />
                    {form.formState.errors.due_date && (
                        <p className="text-xs text-destructive">{form.formState.errors.due_date.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Valor Total (€)</label>
                    <Input type="number" step="0.01" {...form.register('amount')} />
                    {form.formState.errors.amount && (
                        <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (Fatura / Despesa)</label>
                <Input {...form.register('description')} placeholder="Ex: Fatura EDP Janeiro" />
                {form.formState.errors.description && (
                    <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                )}
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
                    <label className="text-sm font-medium">Centro Custo (Obra)</label>
                    <Select
                        onValueChange={(val: string) => form.setValue('obra_id', val === '__none__' ? '' : val)}
                        defaultValue={form.getValues('obra_id') || '__none__'}
                    >
                        <SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">-- Nenhuma --</SelectItem>
                            {obras?.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button type="submit" className="w-full mt-4" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Registar Dívida'}
            </Button>
        </form>
    )
}
