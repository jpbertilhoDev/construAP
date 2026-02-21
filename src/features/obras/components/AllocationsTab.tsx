import { useState } from 'react'
import { Plus, User, CalendarDays, Loader2, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { useAllocations, useCreateAllocation, useDeleteAllocation, useEmployees } from '@/features/rh/hooks/useEmployees'
import { formatDate } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function AllocationsTab({ obraId }: { obraId: string }) {
    const { data: allocations = [], isLoading } = useAllocations({ obra_id: obraId })
    const { data: employees = [] } = useEmployees(false)

    const createMutation = useCreateAllocation()
    const deleteMutation = useDeleteAllocation()

    const [open, setOpen] = useState(false)
    const form = useForm<{ employee_id: string; data_inicio: string; data_fim?: string }>()

    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

    const activeAllocations = allocations.filter(a => !a.data_fim || a.data_fim >= new Date().toISOString().substring(0, 10))
    const pastAllocations = allocations.filter(a => a.data_fim && a.data_fim < new Date().toISOString().substring(0, 10))

    const onSubmit = async (values: any) => {
        const payload = { ...values, obra_id: obraId, created_by: '' }
        if (!payload.data_fim) delete payload.data_fim
        await createMutation.mutateAsync(payload)
        form.reset()
        setOpen(false)
    }

    return (
        <div className="space-y-6 mt-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                        <CardTitle className="text-base font-semibold">Equipa Alocada</CardTitle>
                        <CardDescription>Funcionários atualmente com atividade nesta obra.</CardDescription>
                    </div>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Alocar Funcionário</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader><DialogTitle>Nova Alocação</DialogTitle></DialogHeader>
                            <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4 mt-2">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Funcionário *</label>
                                    <Select onValueChange={v => form.setValue('employee_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Selecione o funcionário..." /></SelectTrigger>
                                        <SelectContent>
                                            {employees.map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>{emp.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Data Início *</label>
                                        <Input type="date" {...form.register('data_inicio', { required: true })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Data Fim (Opcional)</label>
                                        <Input type="date" {...form.register('data_fim')} />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Alocar à Obra
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {activeAllocations.length === 0 ? (
                        <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed">
                            <User className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <h3 className="text-sm font-medium text-foreground">Sem funcionários alocados</h3>
                            <p className="text-sm text-muted-foreground mt-1">Nenhum funcionário está a trabalhar nesta obra de momento.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Funcionário</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Data Início</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeAllocations.map((a: any) => (
                                    <TableRow key={a.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={a.employees?.avatar_url} className="object-cover" />
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                        {a.employees?.nome?.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <Link to={`/rh/funcionarios/${a.employee_id}`} className="font-medium hover:underline text-sm">
                                                    {a.employees?.nome}
                                                </Link>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal text-xs">{a.employees?.employee_roles?.nome || 'Sem função'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                {formatDate(a.data_inicio)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => { if (confirm('Remover alocação?')) void deleteMutation.mutateAsync(a.id) }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {pastAllocations.length > 0 && (
                <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Histórico de Alocações (Passadas)</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Funcionário</TableHead>
                                    <TableHead>Período</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pastAllocations.map((a: any) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="text-sm">{a.employees?.nome}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground text-xs">
                                            {formatDate(a.data_inicio)} → {formatDate(a.data_fim!)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
