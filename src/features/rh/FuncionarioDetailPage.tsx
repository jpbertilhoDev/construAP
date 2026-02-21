import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    useEmployee, useUpdateEmployee,
    useEmployeeRates, useCreateEmployeeRate,
    useAllocations, useCreateAllocation, useDeleteAllocation,
    useTimesheets, useUploadAvatar
} from './hooks/useEmployees'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { EmployeeRate } from '@/services/employees'
import { useObras } from '@/features/obras/hooks/useObras'

const estadoVariant: Record<string, any> = { Ativo: 'success', Inativo: 'secondary', Suspenso: 'warning' }
const tsVariant: Record<string, any> = { Rascunho: 'secondary', Submetido: 'warning', Aprovado: 'success', Rejeitado: 'destructive' }

export function FuncionarioDetailPage() {
    const { id } = useParams<{ id: string }>()
    const { data: employee, isLoading } = useEmployee(id!)
    const { data: rates = [] } = useEmployeeRates(id!)
    const { data: allocations = [] } = useAllocations({ employee_id: id! })
    const { data: timesheets = [] } = useTimesheets({ employee_id: id! })
    const { data: obras = [] } = useObras()

    const updateMutation = useUpdateEmployee()
    const createRateMutation = useCreateEmployeeRate(id!)
    const createAllocMutation = useCreateAllocation()
    const deleteAllocMutation = useDeleteAllocation()
    const uploadMutation = useUploadAvatar()

    const [rateOpen, setRateOpen] = useState(false)
    const [allocOpen, setAllocOpen] = useState(false)
    const rateForm = useForm<Omit<EmployeeRate, 'id' | 'tenant_id' | 'created_at'>>({ defaultValues: { employee_id: id!, tipo: 'daily', valor: 0 } })
    const allocForm = useForm<{ obra_id: string; data_inicio: string; data_fim?: string }>()

    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    if (!employee) return <div className="py-8 text-center text-muted-foreground">Funcionário não encontrado.</div>

    const activeRate = rates[0]

    return (
        <div className="space-y-6">
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
                            {[employee.employee_roles?.nome, employee.nif && `NIF: ${employee.nif}`, employee.email].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={estadoVariant[employee.estado]}>{employee.estado}</Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void updateMutation.mutateAsync({ id: employee.id, estado: employee.estado === 'Ativo' ? 'Inativo' : 'Ativo' })}
                    >
                        {employee.estado === 'Ativo' ? 'Inativar' : 'Ativar'}
                    </Button>
                </div>
            </div>

            {/* KPI rápidos */}
            <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="pt-4 pb-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{activeRate ? formatCurrency(activeRate.valor) : '—'}</p>
                    <p className="text-xs text-muted-foreground">{activeRate?.tipo === 'hourly' ? '€/hora' : activeRate?.tipo === 'daily' ? '€/dia' : '€/mês'}</p>
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
                </TabsList>

                {/* INFO */}
                <TabsContent value="info" className="mt-4">
                    <Card><CardContent className="pt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        {[
                            ['Email', employee.email],
                            ['Telefone', employee.telefone],
                            ['Morada', employee.morada],
                            ['Data Nascimento', employee.data_nascimento ? formatDate(employee.data_nascimento) : undefined],
                            ['Data Admissão', employee.data_admissao ? formatDate(employee.data_admissao) : undefined],
                            ['Função', employee.employee_roles?.nome],
                        ].map(([label, val]) => val ? (
                            <div key={label as string}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">{val}</p></div>
                        ) : null)}
                    </CardContent></Card>
                </TabsContent>

                {/* CUSTOS */}
                <TabsContent value="custos" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div><CardTitle className="text-base">Tabela de Custos</CardTitle><CardDescription>Histórico de taxas (€)</CardDescription></div>
                            <Dialog open={rateOpen} onOpenChange={setRateOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nova Taxa</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[380px]">
                                    <DialogHeader><DialogTitle>Nova Taxa de Custo</DialogTitle></DialogHeader>
                                    <form onSubmit={(e) => void rateForm.handleSubmit(async vals => {
                                        const payload = { ...vals }
                                        if (!payload.data_fim) delete payload.data_fim
                                        await createRateMutation.mutateAsync(payload)
                                        rateForm.reset()
                                        setRateOpen(false)
                                    })(e)} className="space-y-3 mt-2">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium">Tipo</label>
                                            <Select defaultValue="daily" onValueChange={v => rateForm.setValue('tipo', v as any)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="hourly">€/hora</SelectItem>
                                                    <SelectItem value="daily">€/dia</SelectItem>
                                                    <SelectItem value="monthly">€/mês</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium">Valor (€) *</label>
                                            <Input type="number" step="0.01" min="0.01" {...rateForm.register('valor', { valueAsNumber: true, required: true })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium">Data início *</label>
                                                <Input type="date" {...rateForm.register('data_inicio', { required: true })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium">Data fim (Opcional)</label>
                                                <Input type="date" {...rateForm.register('data_fim')} />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full mt-2" disabled={createRateMutation.isPending}>
                                            {createRateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar Taxa
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
                                    <TableBody>{rates.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell><Badge variant="outline">{r.tipo === 'hourly' ? '€/hora' : r.tipo === 'daily' ? '€/dia' : '€/mês'}</Badge></TableCell>
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
                                    <form onSubmit={(e) => void allocForm.handleSubmit(async vals => {
                                        await createAllocMutation.mutateAsync({ ...vals, employee_id: id!, created_by: '' } as any)
                                        allocForm.reset()
                                        setAllocOpen(false)
                                    })(e)} className="space-y-3 mt-2">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium">Obra *</label>
                                            <Select onValueChange={v => allocForm.setValue('obra_id', v)}>
                                                <SelectTrigger><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                                                <SelectContent>
                                                    {obras?.map(obra => (
                                                        <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium">Início *</label>
                                                <Input type="date" {...allocForm.register('data_inicio', { required: true })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium">Fim</label>
                                                <Input type="date" {...allocForm.register('data_fim')} />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full" disabled={createAllocMutation.isPending}>
                                            {createAllocMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Confirmar
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
                                    {allocations.map(a => (
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
                                    <TableBody>{timesheets.slice(0, 20).map(ts => (
                                        <TableRow key={ts.id}>
                                            <TableCell>{formatDate(ts.data)}</TableCell>
                                            <TableCell className="text-muted-foreground">{ts.obras?.name ?? '—'}</TableCell>
                                            <TableCell>{ts.horas ? `${ts.horas}h` : 'Presença'}</TableCell>
                                            <TableCell><Badge variant={tsVariant[ts.estado] ?? 'default'}>{ts.estado}</Badge></TableCell>
                                            <TableCell className="text-right">{ts.custo_calculado ? formatCurrency(ts.custo_calculado) : '—'}</TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
