import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTimesheets, useCreateTimesheet } from './hooks/useEmployees'
import { useEmployees } from './hooks/useEmployees'
import { useObras } from '@/features/obras/hooks/useObras'
import { useForm } from 'react-hook-form'
import { formatDate } from '@/lib/utils'
import { usePermissions } from '@/features/auth/usePermissions'

const estadoVariant: Record<string, any> = { Rascunho: 'secondary', Submetido: 'warning', Aprovado: 'success', Rejeitado: 'destructive' }

function getDisplayEstado(estado: string) {
    if (estado === 'Submetido') return 'Pendente'
    return estado
}

// Gerar os 7 dias da semana atual
function getWeekDays(): string[] {
    const days = []
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        days.push(d.toISOString().substring(0, 10))
    }
    return days
}

export function ApontamentosPage() {
    const { hasPermission } = usePermissions()
    const weekDays = getWeekDays()

    const [createOpen, setCreateOpen] = useState(false)

    const { data: timesheets = [] } = useTimesheets({
        data_inicio: weekDays[0],
        data_fim: weekDays[6],
    })
    const { data: employees = [] } = useEmployees()
    const { data: obras = [] } = useObras()
    const createMutation = useCreateTimesheet()

    const form = useForm<{
        employee_id: string
        obra_id: string
        data: string
        tipo: 'presenca' | 'horas'
        horas?: number
        observacao?: string
    }>({ defaultValues: { tipo: 'presenca', data: new Date().toISOString().substring(0, 10) } })

    const onSubmit = async (values: any) => {
        const payload = {
            employee_id: values.employee_id,
            obra_id: values.obra_id,
            data: values.data,
            presenca: values.tipo === 'presenca',
            horas: values.tipo === 'horas' ? values.horas : undefined,
            observacao: values.observacao,
        }
        await createMutation.mutateAsync(payload)
        form.reset()
        setCreateOpen(false)
    }

    const weekDayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    const today = new Date().toISOString().substring(0, 10)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Folha de Ponto</h1>
                    <p className="text-muted-foreground text-sm">Semana de {formatDate(weekDays[0])} a {formatDate(weekDays[6])}</p>
                </div>
                {hasPermission('rh.manage') && (
                    <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" /> Registar Apontamento
                    </Button>
                )}
            </div>

            {/* Calendário semanal simples */}
            <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((day, i) => {
                    const dayTs = timesheets.filter(ts => ts.data === day)
                    const isToday = day === today
                    return (
                        <Card key={day} className={`cursor-pointer hover:shadow-md transition-shadow ${isToday ? 'ring-2 ring-primary' : ''}`}>
                            <CardContent className="p-3 text-center">
                                <p className="text-xs font-semibold text-muted-foreground">{weekDayNames[i]}</p>
                                <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-primary' : ''}`}>{day.substring(8)}</p>
                                {dayTs.length > 0 ? (
                                    <div className="mt-1.5 space-y-1">
                                        {dayTs.map(ts => (
                                            <Badge key={ts.id} variant={estadoVariant[ts.estado]} className="text-[10px] px-1 block truncate">
                                                {ts.horas ? `${ts.horas}h` : '✓'}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-2 h-5" />
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Lista de apontamentos da semana */}
            <Card>
                <CardHeader><CardTitle className="text-base">Apontamentos desta semana</CardTitle></CardHeader>
                <CardContent>
                    {timesheets.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">Nenhum apontamento esta semana.</div>
                    ) : (
                        <div className="divide-y">
                            {timesheets.map(ts => (
                                <div key={ts.id} className="flex items-center justify-between py-3 text-sm">
                                    <div className="flex-1">
                                        <p className="font-medium">{ts.employees?.nome ?? '—'}</p>
                                        <p className="text-muted-foreground text-xs">{ts.obras?.name ?? '—'} · {formatDate(ts.data)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{ts.horas ? `${ts.horas}h` : 'Presença'}</span>
                                        <Badge variant={estadoVariant[ts.estado]}>{getDisplayEstado(ts.estado)}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de criação */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader><DialogTitle>Registar Apontamento</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-3 mt-2">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Funcionário *</label>
                            <Select onValueChange={v => form.setValue('employee_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                                <SelectContent>
                                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Obra *</label>
                            <Select onValueChange={v => form.setValue('obra_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Selecionar obra..." /></SelectTrigger>
                                <SelectContent>
                                    {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Data *</label>
                                <Input type="date" {...form.register('data', { required: true })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Tipo</label>
                                <Select defaultValue="presenca" onValueChange={v => form.setValue('tipo', v as any)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="presenca">Presença (dia)</SelectItem>
                                        <SelectItem value="horas">Horas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {form.watch('tipo') === 'horas' && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Horas *</label>
                                <Input type="number" step="0.5" min="0.5" max="24" {...form.register('horas', { valueAsNumber: true })} />
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Observação</label>
                            <Input placeholder="Notas opcionais..." {...form.register('observacao')} />
                        </div>
                        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                            Guardar Apontamento
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
