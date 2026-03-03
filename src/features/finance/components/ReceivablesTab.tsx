import { useState } from 'react'
import { Plus, Search, CheckCircle2, AlertCircle, Clock, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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


import { useReceivables, useReceivablesByObra, useCreateReceivable, useUpdateReceivableStatus, useDeleteReceivable } from '@/features/finance/hooks/useReceivables'
import { useObras } from '@/features/obras/hooks/useObras'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReceivableStatus } from '@/types/database.types'
import { usePermissions } from '@/features/auth/usePermissions'

const receivableSchema = z.object({
    description: z.string().min(3, 'Descrição muito curta'),
    amount: z.coerce.number().min(0.01, 'Valor deve ser superior a 0'),
    iva_pct: z.coerce.number().min(0).max(100),
    due_date: z.string().min(1, 'Data de vencimento é obrigatória'),
    obra_id: z.string().optional(),
    client_id: z.string().optional(),
    notes: z.string().optional(),
})


type ReceivableForm = z.infer<typeof receivableSchema>

export function ReceivablesTab({ obraId }: { obraId?: string }) {
    const { hasPermission } = usePermissions()
    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [deleteId, setDeleteId] = useState<string | null>(null)

    // Conditionally fetch based on context
    const allQuery = useReceivables()
    const obraQuery = useReceivablesByObra(obraId || '')

    const query = obraId ? obraQuery : allQuery
    const { data: receivables, isLoading } = query

    const { data: obras } = useObras()

    const createMutation = useCreateReceivable()
    const updateStatusMutation = useUpdateReceivableStatus()
    const deleteMutation = useDeleteReceivable()

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<ReceivableForm>({
        resolver: zodResolver(receivableSchema) as any,
        defaultValues: {
            description: '',
            amount: 0,
            iva_pct: 23,
            due_date: '',
            obra_id: obraId || '',
            notes: '',
            client_id: '',
        },
    })

    const watchedAmount = watch('amount')
    const watchedIva = watch('iva_pct') ?? 23
    const valorIva = Math.round(Number(watchedAmount) * Number(watchedIva) / 100 * 100) / 100
    const totalComIva = Number(watchedAmount) + valorIva


    const onSubmit = async (data: ReceivableForm) => {
        await createMutation.mutateAsync({
            ...data,
            obra_id: data.obra_id || null,
            client_id: null,
            status: 'Pendente',
        })
        setIsNewDialogOpen(false)
        reset()
    }

    const handleUpdateStatus = async (id: string, currentStatus: ReceivableStatus, newStatus: ReceivableStatus) => {
        if (currentStatus === newStatus) return
        await updateStatusMutation.mutateAsync({ id, status: newStatus })
    }

    const handleDelete = async () => {
        if (deleteId) {
            await deleteMutation.mutateAsync(deleteId)
            setDeleteId(null)
        }
    }

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Carregando contas a receber...</div>
    }

    const filteredReceivables = receivables?.filter(r =>
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.obras?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

    const statusConfig: Record<ReceivableStatus, { color: string, icon: any }> = {
        'Pendente': { color: 'bg-amber-500/20 text-amber-500', icon: Clock },
        'Parcial': { color: 'bg-blue-500/20 text-blue-500', icon: AlertCircle },
        'Pago': { color: 'bg-emerald-500/20 text-emerald-500', icon: CheckCircle2 },
        'Cancelado': { color: 'bg-muted text-muted-foreground', icon: Trash2 },
    }


    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar contas a receber..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
                    {hasPermission('finance.manage') && (
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Nova Receita
                            </Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle>Nova Conta a Receber</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => void handleSubmit(onSubmit as any)(e)} className="space-y-4 mt-4">
                            {!obraId && (

                                <div className="space-y-1">
                                    <Label htmlFor="obra_id">Obra / Projeto (Opcional)</Label>
                                    <select id="obra_id" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register('obra_id')}>
                                        <option value="">Selecione uma obra...</option>
                                        {obras?.map(o => (
                                            <option key={o.id} value={o.id}>{o.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label htmlFor="description">Descrição *</Label>
                                <Input id="description" placeholder="Ex: Adiantamento Contrato X" {...register('description')} />
                                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="amount">Valor base s/ IVA (€) *</Label>
                                    <Input id="amount" type="number" step="0.01" {...register('amount')} />
                                    {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="due_date">Data Vencimento *</Label>
                                    <Input id="due_date" type="date" {...register('due_date')} />
                                    {errors.due_date && <p className="text-xs text-destructive">{errors.due_date.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Taxa IVA (%)</Label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                        {...register('iva_pct')}
                                    >
                                        <option value="23">23% — Taxa Normal</option>
                                        <option value="13">13% — Taxa Intermedária</option>
                                        <option value="6">6% — Taxa Reduzida</option>
                                        <option value="0">0% — Isento</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Resumo IVA</Label>
                                    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">IVA ({watchedIva}%):</span>
                                            <span>{valorIva.toFixed(2)} €</span>
                                        </div>
                                        <div className="flex justify-between font-semibold border-t pt-1">
                                            <span>Total c/ IVA:</span>
                                            <span className="text-primary">{totalComIva.toFixed(2)} €</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="notes">Notas adicionais</Label>
                                <Textarea id="notes" rows={2} {...register('notes')} />
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsNewDialogOpen(false)} className="mr-2">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'A guardar...' : 'Guardar Receita'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            {!obraId && <TableHead>Obra</TableHead>}
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Base (€)</TableHead>
                            <TableHead className="text-right">IVA (€)</TableHead>
                            <TableHead className="text-right font-semibold">Total c/ IVA (€)</TableHead>
                            <TableHead>Estado</TableHead>
                            {hasPermission('finance.manage') && <TableHead className="w-[80px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredReceivables.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={obraId ? 5 : 6} className="text-center py-8 text-muted-foreground">
                                    Sem dados para apresentar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredReceivables.map((receivable) => {
                                return (
                                    <TableRow key={receivable.id}>

                                        <TableCell className="font-medium text-sm">
                                            {receivable.description}
                                            {receivable.notes && (
                                                <p className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">{receivable.notes}</p>
                                            )}
                                        </TableCell>
                                        {!obraId && (
                                            <TableCell className="text-sm text-muted-foreground">
                                                {receivable.obras?.name || '—'}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-sm">
                                            {formatDate(receivable.due_date)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">
                                            {formatCurrency(receivable.amount)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {formatCurrency((receivable as any).valor_iva ?? receivable.amount * 0.23)}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-sm">
                                            {formatCurrency((receivable as any).total ?? receivable.amount * 1.23)}
                                        </TableCell>
                                        <TableCell>
                                            {hasPermission('finance.manage') ? (
                                                <select
                                                    className={`text-xs font-semibold px-2 py-1 rounded-md border-0 focus:ring-1 focus:ring-ring cursor-pointer ${statusConfig[receivable.status].color}`}
                                                    value={receivable.status}
                                                    onChange={(e) => void handleUpdateStatus(receivable.id, receivable.status, e.target.value as ReceivableStatus)}
                                                >
                                                    {(Object.keys(statusConfig) as ReceivableStatus[]).map(status => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${statusConfig[receivable.status].color}`}>
                                                    {receivable.status}
                                                </span>
                                            )}
                                        </TableCell>

                                        {hasPermission('finance.manage') && (
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteId(receivable.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Conta a Receber</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem a certeza ABSOLUTA que deseja eliminar este registo de conta a receber?
                            Esta ação é irreversível.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void handleDelete()}
                        >
                            Sim, Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
