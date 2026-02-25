import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Loader2, Calendar } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks'
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
import type { Task } from '@/services/tasks'
import { usePermissions } from '@/features/auth/usePermissions'
import { useEffect } from 'react'

const statusColorMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning" | "success"> = {
    'Aberta': 'secondary',
    'Em Curso': 'warning',
    'Concluída': 'success',
    'Cancelada': 'destructive',
}

const priorityColorMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning" | "success"> = {
    'Baixa': 'outline',
    'Média': 'secondary',
    'Alta': 'warning',
    'Crítica': 'destructive',
}

const taskSchema = z.object({
    title: z.string().min(2, 'Título obrigatório'),
    description: z.string().optional(),
    due_date: z.string().optional(),
    status: z.enum(['Aberta', 'Em Curso', 'Concluída', 'Cancelada']),
    priority: z.enum(['Baixa', 'Média', 'Alta', 'Crítica']),
})

type TaskFormValues = z.infer<typeof taskSchema>

export function TasksTab({ obraId }: { obraId: string }) {
    const { hasPermission } = usePermissions()
    const { data: tasks = [], isLoading, isError } = useTasks(obraId)
    const createMutation = useCreateTask()
    const updateMutation = useUpdateTask(obraId)
    const deleteMutation = useDeleteTask(obraId)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open)
        if (!open) setEditingTask(null)
    }

    const handleEdit = (task: Task) => {
        setEditingTask(task)
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
        return <div className="py-8 text-center text-destructive">Erro ao carregar tarefas.</div>
    }

    return (
        <Card className="mt-4">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-lg">Tarefas e Punch List</CardTitle>
                    <CardDescription>Acompanhe ações pendentes, patologias ou trabalhos a corrigir.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    {hasPermission('obras.manage') && (
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setEditingTask(null)}>
                                <Plus className="h-4 w-4" /> Nova Tarefa
                            </Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Adicionar Tarefa'}</DialogTitle>
                            <DialogDescription>
                                {editingTask ? 'Edite os detalhes desta tarefa.' : 'Crie uma nova tarefa para a equipa da obra.'}
                            </DialogDescription>
                        </DialogHeader>
                        <AddTaskForm
                            obraId={obraId}
                            initialData={editingTask || undefined}
                            onSuccess={() => handleOpenChange(false)}
                            onSubmit={(payload) => editingTask
                                ? updateMutation.mutateAsync({ id: editingTask.id, payload })
                                : createMutation.mutateAsync(payload)
                            }
                            isPending={createMutation.isPending || updateMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {tasks.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center border rounded-md bg-muted/20 border-dashed">
                        <CheckCircle2 className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="font-medium">Nenhuma tarefa registada.</p>
                        <p className="text-muted-foreground text-sm max-w-sm mt-1">
                            Adicione trabalhos pendentes ou correções (punch list) para acompanhamento.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Título</TableHead>
                                    <TableHead className="w-[120px]">Data Limite</TableHead>
                                    <TableHead className="w-[100px]">Prioridade</TableHead>
                                    <TableHead className="w-[120px]">Estado</TableHead>
                                    {hasPermission('obras.manage') && <TableHead className="w-[60px]"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.map((task) => (
                                    <TableRow key={task.id} className={task.status === 'Concluída' ? 'opacity-60 bg-muted/30' : ''}>
                                        <TableCell>
                                            <p className="font-medium">{task.title}</p>
                                            {task.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 truncate block max-w-[250px]">{task.description}</p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {task.due_date ? (
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(task.due_date)}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={priorityColorMap[task.priority] || 'outline'}>{task.priority}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusColorMap[task.status] || 'default'}>{task.status}</Badge>
                                        </TableCell>
                                        {hasPermission('obras.manage') && (
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => handleEdit(task)}
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setDeleteId(task.id)}
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
                            <AlertDialogTitle>Eliminar Tarefa</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem a certeza que deseja eliminar esta tarefa? Esta ação é irreversível.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => void handleDelete()}
                            >
                                Eliminar Tarefa
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    )
}

function AddTaskForm({
    obraId,
    initialData,
    onSuccess,
    onSubmit,
    isPending,
}: {
    obraId: string;
    initialData?: Task;
    onSuccess: () => void;
    onSubmit: (payload: any) => Promise<any>;
    isPending: boolean;
}) {
    const form = useHookForm<TaskFormValues>({
        resolver: zodResolver(taskSchema) as any,
        defaultValues: {
            title: initialData?.title || '',
            description: initialData?.description || '',
            due_date: initialData?.due_date || '',
            status: initialData?.status || 'Aberta',
            priority: initialData?.priority || 'Média',
        },
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                title: initialData.title,
                description: initialData.description || '',
                due_date: initialData.due_date || '',
                status: initialData.status,
                priority: initialData.priority,
            })
        }
    }, [initialData, form])

    const handleSubmit = async (values: TaskFormValues) => {
        try {
            await onSubmit({
                obra_id: obraId,
                title: values.title,
                description: values.description || null,
                due_date: values.due_date || null,
                status: values.status,
                priority: values.priority,
            })
            form.reset()
            onSuccess()
        } catch {
            // silent catch
        }
    }

    return (
        <form onSubmit={(e) => void form.handleSubmit(handleSubmit as any)(e)} className="space-y-4 pt-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Título da Tarefa</label>
                <Input {...form.register('title')} placeholder="Ex: Reparar fissura parede sul" />
                {form.formState.errors.title && (
                    <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Descrição Detalhada</label>
                <Textarea
                    {...form.register('description')}
                    placeholder="Informações adicionais..."
                    className="h-20"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Data Limite</label>
                    <Input type="date" {...form.register('due_date')} />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridade</label>
                    <Select
                        onValueChange={(val: string) => form.setValue('priority', val as any)}
                        defaultValue={form.getValues('priority')}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Baixa">Baixa</SelectItem>
                            <SelectItem value="Média">Média</SelectItem>
                            <SelectItem value="Alta">Alta</SelectItem>
                            <SelectItem value="Crítica">Crítica</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Estado Inicial</label>
                <Select
                    onValueChange={(val: string) => form.setValue('status', val as any)}
                    defaultValue={form.getValues('status')}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Aberta">Aberta</SelectItem>
                        <SelectItem value="Em Curso">Em Curso</SelectItem>
                        <SelectItem value="Concluída">Concluída</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button type="submit" className="w-full mt-4" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : initialData ? 'Guardar Alterações' : 'Criar Tarefa'}
            </Button>
        </form>
    )
}
