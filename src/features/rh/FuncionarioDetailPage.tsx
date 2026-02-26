import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Plus, Trash2, Upload, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    useEmployee, useUpdateEmployee, useDeleteEmployee,
    useEmployeeRates, useCreateEmployeeRate,
    useAllocations, useCreateAllocation, useDeleteAllocation,
    useTimesheets, useUploadAvatar, useEmployeeRoles,
} from './hooks/useEmployees'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { EmployeeRate } from '@/services/employees'
import { useObras } from '@/features/obras/hooks/useObras'
import { EmployeePayrollFields } from '@/features/payroll/EmployeePayrollFields'
import { usePermissions } from '@/features/auth/usePermissions'
import { toast } from 'sonner'

const estadoVariant: Record<string, 'success' | 'secondary' | 'warning'> = { Ativo: 'success', Inativo: 'secondary', Suspenso: 'warning' }
const tsVariant: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = { Rascunho: 'secondary', Submetido: 'warning', Aprovado: 'success', Rejeitado: 'destructive' }

type EditFormValues = {
    nome: string
    nif: string
    email: string
    telefone: string
    morada: string
    data_nascimento: string
    data_admissao: string
    role_id: string
    estado: 'Ativo' | 'Inativo' | 'Suspenso'
    notas: string
}

export function FuncionarioDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { hasPermission } = usePermissions()
    const canManage = hasPermission('rh.manage')

    const { data: employee, isLoading } = useEmployee(id ?? '')
    const { data: rates = [] } = useEmployeeRates(id ?? '')
    const { data: allocations = [] } = useAllocations({ employee_id: id })
    const { data: timesheets = [] } = useTimesheets({ employee_id: id })
    const { data: obras = [] } = useObras()
    const { data: roles = [] } = useEmployeeRoles()

    const updateMutation = useUpdateEmployee()
    const deleteMutation = useDeleteEmployee()
    const createRateMutation = useCreateEmployeeRate(id ?? '')
    const createAllocMutation = useCreateAllocation()
    const deleteAllocMutation = useDeleteAllocation()
    const uploadMutation = useUploadAvatar()

    const [rateOpen, setRateOpen] = useState(false)
    const [allocOpen, setAllocOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    const rateForm = useForm<Omit<EmployeeRate, 'id' | 'tenant_id' | 'created_at'>>({
        defaultValues: { employee_id: id ?? '', tipo: 'daily', valor: 0 },
    })
    const allocForm = useForm<{ obra_id: string; data_inicio: string; data_fim?: string }>()
    const editForm = useForm<EditFormValues>()

    useEffect(() => {
        if (employee && editOpen) {
            editForm.reset({
                nome: employee.nome,
                nif: employee.nif ?? '',
                email: employee.email ?? '',
                telefone: employee.telefone ?? '',
                morada: employee.morada ?? '',
                data_nascimento: employee.data_nascimento ?? '',
                data_admissao: employee.data_admissao ?? '',
                role_id: employee.role_id ?? '',
                estado: employee.estado,
                notas: employee.notas ?? '',
            })
        }
    }, [employee, editOpen, editForm])

    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    if (!employee) return <div className="py-8 text-center text-muted-foreground">Funcionário não encontrado.</div>

    const activeRate = rates[0] as EmployeeRate | undefined

    const handleEditSubmit = async (values: EditFormValues) => {
        const payload: Record<string, unknown> = { id: employee.id }
        payload.nome = values.nome
        payload.estado = values.estado
        if (values.nif) payload.nif = values.nif
        else payload.nif = null
        if (values.email) payload.email = values.email
        else payload.email = null
        if (values.telefone) payload.telefone = values.telefone
        else payload.telefone = null
        if (values.morada) payload.morada = values.morada
        else payload.morada = null
        if (values.data_nascimento) payload.data_nascimento = values.data_nascimento
        else payload.data_nascimento = null
        if (values.data_admissao) payload.data_admissao = values.data_admissao
        else payload.data_admissao = null
        if (values.role_id) payload.role_id = values.role_id
        else payload.role_id = null
        if (values.notas) payload.notas = values.notas
        else payload.notas = null

        try {
            await updateMutation.mutateAsync(payload as Parameters<typeof updateMutation.mutateAsync>[0])
            toast.success('Funcionário atualizado')
            setEditOpen(false)
        } catch {
            toast.error('Erro ao atualizar funcionário')
        }
    }

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(employee.id)
            toast.success('Funcionário excluído')
            void navigate('/rh/funcionarios')
        } catch {
            toast.error('Erro ao excluir funcionário. Verifique se não possui dados associados.')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
                    <Link to="/rh/funcionarios"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-5 flex-1">
                    <div className="relative group rounded-full">
                        <Avatar className="h-16 w-16 border bg-background shadow-sm">
                            <AvatarImage src={employee.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary uppercase text-xl">
                                {employee.nome.substring(0, 2)}
                            </AvatarFallback>
                        </Avatar>
                        <Label
                            htmlFor="avatar-upload"
                            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                        >
                            {uploadMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                        </Label>
                        <input
                            type="file"
                            id="avatar-upload"
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) uploadMutation.mutate({ employeeId: employee.id, file })
                            }}
                            disabled={uploadMutation.isPending}
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{employee.nome}</h1>
                        <p className="text-muted-foreground text-sm">
                            {[employee.employee_roles?.nome, employee.nif ? `NIF: ${employee.nif}` : null, employee.email].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={estadoVariant[employee.estado]}>{employee.estado}</Badge>
                    {canManage && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setEditOpen(true) }}
                            >
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Excluir
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tem certeza que deseja excluir <strong>{employee.nome}</strong>?
                                            Esta ação é irreversível e só funcionará se o funcionário não
                                            tiver apontamentos, alocações ou outros dados associados.
                                            Considere <strong>inativar</strong> em vez de excluir.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive hover:bg-destructive/90"
                                            onClick={() => { void handleDelete() }}
                                        >
                                            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                            Excluir Permanentemente
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Funcionário</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => void editForm.handleSubmit(handleEditSubmit)(e)}
                        className="space-y-3 mt-2"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 space-y-1">
                                <Label className="text-sm">Nome completo *</Label>
                                <Input {...editForm.register('nome', { required: true })} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm">NIF</Label>
                                <Input placeholder="123456789" {...editForm.register('nif')} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm">Telefone</Label>
                                <Input placeholder="912 345 678" {...editForm.register('telefone')} />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-sm">Email</Label>
                                <Input type="email" {...editForm.register('email')} />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-sm">Morada</Label>
                                <Input placeholder="Rua, nº, localidade" {...editForm.register('morada')} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm">Data Nascimento</Label>
                                <Input type="date" {...editForm.register('data_nascimento')} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm">Data Admissão</Label>
                                <Input type="date" {...editForm.register('data_admissao')} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm">Função</Label>
                                <Select
                                    value={editForm.watch('role_id') || ''}
                                    onValueChange={(v) => { editForm.setValue('role_id', v) }}
                                >
                                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                                    <SelectContent>
                                        {roles.map((r) => (
                                            <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm">Estado</Label>
                                <Select
                                    value={editForm.watch('estado')}
                                    onValueChange={(v) => { editForm.setValue('estado', v as EditFormValues['estado']) }}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Ativo">Ativo</SelectItem>
                                        <SelectItem value="Inativo">Inativo</SelectItem>
                                        <SelectItem value="Suspenso">Suspenso</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-sm">Notas</Label>
                                <Input placeholder="Observações..." {...editForm.register('notas')} />
                            </div>
                        </div>
                        <Button type="submit" className="w-full mt-4" disabled={updateMutation.isPending}>
                            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                            Guardar Alterações
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* KPI rápidos */}
            <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="pt-4 pb-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{activeRate ? formatCurrency(activeRate.valor) : '—'}</p>
                    <p className="text-xs text-muted-foreground">{activeRate?.tipo === 'hourly' ? '/hora' : activeRate?.tipo === 'daily' ? '/dia' : '/mês'}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{allocations.filter(a => !a.data_fim || a.data_fim >= new Date().toISOString().substring(0, 10)).length}</p>
                    <p className="text-xs text-muted-foreground">Obras Alocadas</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3 text-center">
                    <p className="text-2xl font-bold">{timesheets.filter(t => t.estado === 'Aprovado').length}</p>
                    <p className="text-xs text-muted-foreground">Apontamentos Aprovados</p>
                </CardContent></Card>
            </div>

            <Tabs defaultValue="info">
                <TabsList>
                    <TabsTrigger value="info">Informações</TabsTrigger>
                    <TabsTrigger value="custos">Tabela de Custos</TabsTrigger>
                    <TabsTrigger value="alocacoes">Alocações</TabsTrigger>
                    <TabsTrigger value="apontamentos">Apontamentos</TabsTrigger>
                    <TabsTrigger value="fiscal">Dados Fiscais</TabsTrigger>
                </TabsList>

                {/* INFO */}
                <TabsContent value="info" className="mt-4">
                    <Card><CardContent className="pt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        {([
                            ['Email', employee.email],
                            ['Telefone', employee.telefone],
                            ['Morada', employee.morada],
                            ['Data Nascimento', employee.data_nascimento ? formatDate(employee.data_nascimento) : undefined],
                            ['Data Admissão', employee.data_admissao ? formatDate(employee.data_admissao) : undefined],
                            ['Função', employee.employee_roles?.nome],
                            ['Notas', employee.notas],
                        ] as [string, string | undefined][]).map(([label, val]) => val ? (
                            <div key={label}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">{val}</p></div>
                        ) : null)}
                    </CardContent></Card>
                </TabsContent>

                {/* CUSTOS */}
                <TabsContent value="custos" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div><CardTitle className="text-base">Tabela de Custos</CardTitle><CardDescription>Histórico de taxas</CardDescription></div>
                            <Dialog open={rateOpen} onOpenChange={setRateOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nova Taxa</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[380px]">
                                    <DialogHeader><DialogTitle>Nova Taxa de Custo</DialogTitle></DialogHeader>
                                    <form onSubmit={(e) => void rateForm.handleSubmit(async (vals) => {
                                        const payload = { ...vals }
                                        if (!payload.data_fim) delete payload.data_fim
                                        await createRateMutation.mutateAsync(payload)
                                        rateForm.reset()
                                        setRateOpen(false)
                                    })(e)} className="space-y-3 mt-2">
                                        <div className="space-y-1">
                                            <Label className="text-sm">Tipo</Label>
                                            <Select
                                                defaultValue="daily"
                                                onValueChange={(v) => { rateForm.setValue('tipo', v as EmployeeRate['tipo']) }}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="hourly">/hora</SelectItem>
                                                    <SelectItem value="daily">/dia</SelectItem>
                                                    <SelectItem value="monthly">/mês</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm">Valor *</Label>
                                            <Input type="number" step="0.01" min="0.01" {...rateForm.register('valor', { valueAsNumber: true, required: true })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-sm">Data início *</Label>
                                                <Input type="date" {...rateForm.register('data_inicio', { required: true })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-sm">Data fim (Opcional)</Label>
                                                <Input type="date" {...rateForm.register('data_fim')} />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full mt-2" disabled={createRateMutation.isPending}>
                                            {createRateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                            Guardar Taxa
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {rates.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8 text-sm">Nenhuma taxa definida.</div>
                            ) : (
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Vigência</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>{rates.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell><Badge variant="outline">{r.tipo === 'hourly' ? '/hora' : r.tipo === 'daily' ? '/dia' : '/mês'}</Badge></TableCell>
                                            <TableCell className="font-medium">{formatCurrency(r.valor)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDate(r.data_inicio)} → {r.data_fim ? formatDate(r.data_fim) : 'atual'}
                                            </TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ALOCAÇÕES */}
                <TabsContent value="alocacoes" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base">Alocações a Obras</CardTitle>
                            <Dialog open={allocOpen} onOpenChange={setAllocOpen}>
                                <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Alocar</Button></DialogTrigger>
                                <DialogContent className="sm:max-w-[380px]">
                                    <DialogHeader><DialogTitle>Alocar a Obra</DialogTitle></DialogHeader>
                                    <form onSubmit={(e) => void allocForm.handleSubmit(async (vals) => {
                                        await createAllocMutation.mutateAsync({ ...vals, employee_id: id ?? '' } as Parameters<typeof createAllocMutation.mutateAsync>[0])
                                        allocForm.reset()
                                        setAllocOpen(false)
                                    })(e)} className="space-y-3 mt-2">
                                        <div className="space-y-1">
                                            <Label className="text-sm">Obra *</Label>
                                            <Select onValueChange={(v) => { allocForm.setValue('obra_id', v) }}>
                                                <SelectTrigger><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                                                <SelectContent>
                                                    {obras.map((obra) => (
                                                        <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-sm">Início *</Label>
                                                <Input type="date" {...allocForm.register('data_inicio', { required: true })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-sm">Fim</Label>
                                                <Input type="date" {...allocForm.register('data_fim')} />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full" disabled={createAllocMutation.isPending}>
                                            {createAllocMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                            Confirmar
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {allocations.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8 text-sm">Sem alocações registadas.</div>
                            ) : (
                                <div className="divide-y">
                                    {allocations.map((a) => (
                                        <div key={a.id} className="flex items-center justify-between py-3 text-sm">
                                            <div>
                                                <p className="font-medium">{a.obras?.name ?? a.obra_id}</p>
                                                <p className="text-muted-foreground text-xs">{formatDate(a.data_inicio)} → {a.data_fim ? formatDate(a.data_fim) : 'em curso'}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => void deleteAllocMutation.mutateAsync(a.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* APONTAMENTOS */}
                <TabsContent value="apontamentos" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Histórico de Apontamentos</CardTitle></CardHeader>
                        <CardContent>
                            {timesheets.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8 text-sm">Sem apontamentos.</div>
                            ) : (
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead>Data</TableHead><TableHead>Obra</TableHead><TableHead>Horas</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Custo</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>{timesheets.slice(0, 20).map((ts) => (
                                        <TableRow key={ts.id}>
                                            <TableCell>{formatDate(ts.data)}</TableCell>
                                            <TableCell className="text-muted-foreground">{ts.obras?.name ?? '—'}</TableCell>
                                            <TableCell>{ts.horas ? `${String(ts.horas)}h` : 'Presença'}</TableCell>
                                            <TableCell><Badge variant={tsVariant[ts.estado] ?? 'default'}>{ts.estado}</Badge></TableCell>
                                            <TableCell className="text-right">{ts.custo_calculado ? formatCurrency(ts.custo_calculado) : '—'}</TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DADOS FISCAIS */}
                <TabsContent value="fiscal" className="mt-4">
                    <EmployeePayrollFields employeeId={id ?? ''} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
