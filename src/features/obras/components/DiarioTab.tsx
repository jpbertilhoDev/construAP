import { useState } from 'react'
import { Plus, Trash2, BookOpen, Loader2 } from 'lucide-react'
import { useForm as useHookForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDiarioEntries, useCreateDiarioEntry, useUpdateDiarioEntry, useDeleteDiarioEntry } from '../hooks/useDiario'
import { formatDate } from '@/lib/utils'
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
import { Edit2 } from 'lucide-react'
import type { DiarioEntry } from '@/services/diario'
import { useEffect } from 'react'

const diarioSchema = z.object({
    entry_date: z.string().min(10, 'Data obrigatória'),
    weather: z.string().optional(),
    resources_count: z.coerce.number().min(0, 'Deve ser >= 0').optional(),
    activities: z.string().optional(),
    notes: z.string().optional(),
})

type DiarioFormValues = z.infer<typeof diarioSchema>

export function DiarioTab({ obraId }: { obraId: string }) {
    const { data: entries = [], isLoading, isError } = useDiarioEntries(obraId)
    const createMutation = useCreateDiarioEntry()
    const updateMutation = useUpdateDiarioEntry(obraId)
    const deleteMutation = useDeleteDiarioEntry(obraId)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<DiarioEntry | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open)
        if (!open) setEditingEntry(null)
    }

    const handleEdit = (entry: DiarioEntry) => {
        setEditingEntry(entry)
        setIsDialogOpen(true)
    }

    const handleDelete = async () => {
        if (deleteId) {
            await deleteMutation.mutateAsync(deleteId)
            setDeleteId(null)
        }
    }

    if (isLoading) {
        return <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    }

    if (isError) {
        return <div className="py-8 text-center text-destructive">Erro ao carregar entradas do diário.</div>
    }

    return (
        <Card className="mt-4">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-lg">Diário de Obra</CardTitle>
                    <CardDescription>Registe os acontecimentos diários, clima, equipa e atividades.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setEditingEntry(null)}>
                            <Plus className="h-4 w-4" /> Nova Entrada
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingEntry ? 'Editar Entrada' : 'Registar no Diário'}</DialogTitle>
                            <DialogDescription>
                                {editingEntry ? 'Edite os dados desta entrada.' : 'Preencha os dados relevantes do dia de trabalho na obra.'}
                            </DialogDescription>
                        </DialogHeader>
                        <AddDiarioForm
                            obraId={obraId}
                            initialData={editingEntry || undefined}
                            onSuccess={() => handleOpenChange(false)}
                            onSubmit={(payload) => editingEntry
                                ? updateMutation.mutateAsync({ id: editingEntry.id, payload })
                                : createMutation.mutateAsync(payload)
                            }
                            isPending={createMutation.isPending || updateMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {entries.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center border rounded-md bg-muted/20 border-dashed">
                        <BookOpen className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="font-medium">O Diário de Obra está vazio.</p>
                        <p className="text-muted-foreground text-sm max-w-sm mt-1">
                            Adicione o primeiro registo diário para manter o histórico da execução.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[120px]">Data</TableHead>
                                    <TableHead className="w-[120px]">Clima</TableHead>
                                    <TableHead className="text-center w-[100px]">Efetivos</TableHead>
                                    <TableHead>Atividades Principais</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-medium">{formatDate(entry.entry_date)}</TableCell>
                                        <TableCell>{entry.weather || '-'}</TableCell>
                                        <TableCell className="text-center">{entry.resources_count}</TableCell>
                                        <TableCell className="max-w-[300px] truncate" title={entry.activities || ''}>
                                            {entry.activities || <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost" size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => handleEdit(entry)}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteId(entry.id)}
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
                            <AlertDialogTitle>Eliminar Entrada do Diário</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem a certeza que deseja eliminar esta entrada do Diário de Obra?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => void handleDelete()}
                            >
                                Eliminar Entrada
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    )
}

function AddDiarioForm({
    obraId,
    initialData,
    onSuccess,
    onSubmit,
    isPending,
}: {
    obraId: string;
    initialData?: DiarioEntry;
    onSuccess: () => void;
    onSubmit: (payload: any) => Promise<any>;
    isPending: boolean;
}) {
    const form = useHookForm<DiarioFormValues>({
        resolver: zodResolver(diarioSchema) as any,
        defaultValues: {
            entry_date: initialData ? new Date(initialData.entry_date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
            weather: initialData?.weather || 'Limpo',
            resources_count: initialData?.resources_count ?? 0,
            activities: initialData?.activities || '',
            notes: initialData?.notes || '',
        },
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                entry_date: new Date(initialData.entry_date).toISOString().substring(0, 10),
                weather: initialData.weather || 'Limpo',
                resources_count: initialData.resources_count ?? 0,
                activities: initialData.activities || '',
                notes: initialData.notes || '',
            })
        }
    }, [initialData, form])

    const handleSubmit = async (values: DiarioFormValues) => {
        try {
            await onSubmit({
                obra_id: obraId,
                entry_date: values.entry_date,
                weather: values.weather,
                resources_count: values.resources_count,
                activities: values.activities,
                notes: values.notes,
            })
            form.reset()
            onSuccess()
        } catch {
            // handle error
        }
    }

    return (
        <form onSubmit={(e) => void form.handleSubmit(handleSubmit as any)(e)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Data</label>
                    <Input type="date" {...form.register('entry_date')} />
                    {form.formState.errors.entry_date && (
                        <p className="text-xs text-destructive">{form.formState.errors.entry_date.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Clima</label>
                    <Select
                        onValueChange={(val: string) => form.setValue('weather', val)}
                        defaultValue={form.getValues('weather')}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Limpo">Limpo / Sol</SelectItem>
                            <SelectItem value="Nublado">Nublado</SelectItem>
                            <SelectItem value="Chuva Ligeira">Chuva Ligeira</SelectItem>
                            <SelectItem value="Chuva Forte">Chuva Forte</SelectItem>
                            <SelectItem value="Vento Forte">Vento Forte</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Nº Total de Trabalhadores (Efetivos)</label>
                <Input type="number" min="0" {...form.register('resources_count')} />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Atividades Executadas</label>
                <Textarea
                    {...form.register('activities')}
                    placeholder="Resumo das frentes de trabalho do dia..."
                    className="h-24"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Ocorrências / Notas Adicionais</label>
                <Textarea
                    {...form.register('notes')}
                    placeholder="Acidentes, atrasos de material, visitas de fiscalização..."
                    className="h-16"
                />
            </div>

            <Button type="submit" className="w-full mt-4" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : initialData ? 'Guardar Alterações' : 'Registar Dia'}
            </Button>
        </form>
    )
}
