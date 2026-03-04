// @ts-nocheck
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
    CalendarDays,
    Plus,
    CheckCircle2,
    Circle,
    ChevronLeft,
    ChevronRight,
    Flag,
    HardHat,
    Loader2,
    Trash2,
} from 'lucide-react'
import {
    fetchAgendaMilestones,
    createMilestone,
    toggleMilestone,
    deleteMilestone,
    type Milestone,
} from '@/services/agenda'
import { fetchObras } from '@/services/obras'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const STATUS_COLOR: Record<string, string> = {
    'Em execução': 'bg-blue-500',
    'Em preparação': 'bg-amber-500',
    'Concluída': 'bg-emerald-500',
    'Suspensa': 'bg-red-500',
}

const TYPE_COLORS: Record<string, string> = {
    'Início': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    'Fim Previsto': 'text-red-600 bg-red-50 dark:bg-red-950/30',
    'Entrega': 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
    'Marco': 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    'Inspeção': 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
}

import { updateMilestone } from '@/services/agenda' // Add to existing imports

// ── Milestone Modal ────────────────────────────────────────────────────────

function MilestoneModal({
    open,
    onClose,
    defaultDate,
    milestone,
}: {
    open: boolean
    onClose: () => void
    defaultDate?: string
    milestone?: Milestone
}) {
    const qc = useQueryClient()
    const { data: obras = [] } = useQuery({ queryKey: ['obras'], queryFn: fetchObras, staleTime: 60_000 })

    // Default values if creating new vs editing
    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
        defaultValues: {
            obra_id: milestone?.obra_id ?? '',
            title: milestone?.title ?? '',
            date: milestone?.date ?? defaultDate ?? '',
            type: milestone?.type ?? 'Marco',
        },
    })

    const mutation = useMutation({
        mutationFn: (data: { obra_id: string; title: string; date: string; type: string }) => {
            if (milestone) {
                return updateMilestone(milestone.id, data)
            }
            return createMilestone(data)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['agenda-milestones'] })
            toast.success(milestone ? 'Marco atualizado!' : 'Marco adicionado!')
            reset()
            onClose()
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteMilestone,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['agenda-milestones'] })
            toast.success('Marco removido.')
            onClose()
        },
    })

    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
            <DialogContent className="max-w-sm w-[95vw]">
                <DialogHeader><DialogTitle>{milestone ? 'Editar Marco' : 'Adicionar Marco'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label>Data *</Label>
                        <Input type="date" {...register('date', { required: true })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Obra *</Label>
                        <select
                            {...register('obra_id', { required: true })}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="">Selecionar obra...</option>
                            {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Tipo</Label>
                        <select
                            {...register('type')}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            {['Marco', 'Início', 'Fim Previsto', 'Entrega', 'Inspeção'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Título / Descrição *</Label>
                        <Input {...register('title', { required: true })} placeholder="Ex. Betonagem fundações" />
                    </div>
                    <div className="flex gap-2 justify-between mt-4 border-t pt-4">
                        <div>
                            {milestone && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => deleteMutation.mutate(milestone.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                                {(isSubmitting || mutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Guardar
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AgendaPage() {
    const qc = useQueryClient()
    const today = new Date()
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
    const [showModal, setShowModal] = useState(false)
    const [clickedDate, setClickedDate] = useState<string>()
    const [clickedMilestone, setClickedMilestone] = useState<Milestone | undefined>()

    const { data: milestones = [], isLoading } = useQuery({
        queryKey: ['agenda-milestones'],
        queryFn: fetchAgendaMilestones,
        staleTime: 60_000,
    })

    // Group milestones by date string for the calendar
    const byDate = useMemo(() => {
        const map: Record<string, Milestone[]> = {}
        for (const m of milestones) {
            if (!map[m.date]) map[m.date] = []
            map[m.date].push(m)
        }
        return map
    }, [milestones])

    // Build calendar grid for current month view
    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear()
        const month = viewDate.getMonth()
        const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const startOffset = (firstDay + 6) % 7 // Monday-first offset

        const days: { date: string | null; dayNum: number | null }[] = []
        for (let i = 0; i < startOffset; i++) days.push({ date: null, dayNum: null })
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            days.push({ date: dateStr, dayNum: d })
        }
        return days
    }, [viewDate])

    const toggleMilestoneMutation = useMutation({
        mutationFn: ({ id, completed }: { id: string; completed: boolean }) => toggleMilestone(id, completed),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda-milestones'] }),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteMilestone,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['agenda-milestones'] })
            toast.success('Marco removido.')
        },
    })

    const todayStr = today.toISOString().split('T')[0]

    // Upcoming milestones list (next 30 days)
    const upcoming = milestones
        .filter(m => !m.completed && m.date >= todayStr)
        .slice(0, 10)

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarDays className="h-6 w-6 text-primary" /> Agenda de Obras
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Calendário de datas, marcos e entregas</p>
                </div>
                <Button onClick={() => { setClickedDate(undefined); setClickedMilestone(undefined); setShowModal(true) }}>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Marco
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <Button variant="ghost" size="icon"
                                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <CardTitle className="text-base">
                                    {MONTHS_PT[viewDate.getMonth()]} {viewDate.getFullYear()}
                                </CardTitle>
                                <Button variant="ghost" size="icon"
                                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 gap-0.5 pt-2">
                                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                                    <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {isLoading ? (
                                <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
                            ) : (
                                <div className="grid grid-cols-7 gap-0.5">
                                    {calendarDays.map((cell, i) => {
                                        if (!cell.date) {
                                            return <div key={`empty-${i}`} className="h-16 rounded-md" />
                                        }
                                        const dayMillestones = byDate[cell.date] ?? []
                                        const isToday = cell.date === todayStr
                                        const isPast = cell.date < todayStr

                                        return (
                                            <div
                                                key={cell.date}
                                                onClick={() => { setClickedDate(cell.date!); setShowModal(true) }}
                                                className={cn(
                                                    'h-16 rounded-md border p-1 cursor-pointer hover:bg-muted/40 transition-colors flex flex-col',
                                                    isToday && 'border-primary bg-primary/5',
                                                    isPast && !isToday && 'opacity-60',
                                                )}
                                            >
                                                <span className={cn(
                                                    'text-[11px] font-medium self-end',
                                                    isToday && 'text-primary font-bold',
                                                )}>
                                                    {cell.dayNum}
                                                </span>
                                                <div className="flex-1 overflow-hidden space-y-0.5">
                                                    {dayMillestones.slice(0, 2).map(m => (
                                                        <div
                                                            key={m.id}
                                                            className="text-[9px] leading-tight px-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                                                            style={{ background: m.completed ? '#e5e7eb' : undefined }}
                                                            title={m.title}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setClickedMilestone(m)
                                                                setShowModal(true)
                                                            }}
                                                        >
                                                            <span className={TYPE_COLORS[m.type] ?? ''}>
                                                                {m.completed ? '✓ ' : '• '}{m.title}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {dayMillestones.length > 2 && (
                                                        <p className="text-[9px] text-muted-foreground">+{dayMillestones.length - 2}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Upcoming list */}
                <div>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Flag className="h-4 w-4 text-primary" /> Próximos Eventos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {upcoming.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-8">Sem eventos próximos.</p>
                            ) : (
                                <div className="divide-y">
                                    {upcoming.map(m => (
                                        <div key={m.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                                            <button
                                                onClick={() => toggleMilestoneMutation.mutate({ id: m.id, completed: !m.completed })}
                                                className="mt-0.5 shrink-0"
                                            >
                                                {m.completed
                                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    : <Circle className="h-4 w-4 text-muted-foreground" />}
                                            </button>
                                            <div
                                                className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => {
                                                    setClickedMilestone(m)
                                                    setShowModal(true)
                                                }}
                                            >
                                                <p className={cn('text-xs font-medium truncate', m.completed && 'line-through text-muted-foreground')}>
                                                    {m.title}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {m.obras?.name} • {new Date(m.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                                                </p>
                                                <Badge className={cn('text-[9px] mt-1 px-1.5 h-4', TYPE_COLORS[m.type])}>
                                                    {m.type}
                                                </Badge>
                                            </div>
                                            <button
                                                onClick={() => deleteMutation.mutate(m.id)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <MilestoneModal
                open={showModal}
                onClose={() => { setShowModal(false); setClickedDate(undefined); setClickedMilestone(undefined) }}
                defaultDate={clickedDate}
                milestone={clickedMilestone}
            />
        </div>
    )
}
