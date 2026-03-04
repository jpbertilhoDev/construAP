// @ts-nocheck
import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    UserCircle2,
    HardHat,
    Clock,
    CheckSquare,
    ClipboardList,
    AlertTriangle,
    CheckCircle2,
    CalendarCheck,
    Plus,
    Loader2,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfile } from '@/lib/getProfile'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────────────────────

type MyTask = {
    id: string
    title: string
    description: string | null
    due_date: string | null
    priority: string
    status: string
    obras: { name: string } | null
}

type MyTimesheet = {
    id: string
    data: string
    horas: number
    status: string
    obras: { name: string } | null
}

type MyAllocation = {
    id: string
    start_date: string
    end_date: string | null
    obras: { id: string; name: string; status: string } | null
}

// ── Queries ──────────────────────────────────────────────────────────────────

async function fetchMyArea() {
    const profile = await getProfile()
    const uid = profile.id
    const tid = profile.tenant_id
    const today = new Date().toISOString().split('T')[0]

    const [tasksRes, timesheetsRes, allocationsRes, meRes] = await Promise.all([
        supabase
            .from('tasks')
            .select('id, title, description, due_date, priority, status, obras(name)')
            .eq('tenant_id', tid)
            .eq('assignee_id', uid)
            .in('status', ['Aberta', 'Em Curso'])
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(20),

        supabase
            .from('timesheets')
            .select('id, data, horas, status, obras(name)')
            .eq('tenant_id', tid)
            .eq('employee_id', uid)
            .order('data', { ascending: false })
            .limit(7),

        supabase
            .from('employee_obra_allocations')
            .select('id, start_date, end_date, obras(id, name, status)')
            .eq('tenant_id', tid)
            .eq('employee_id', uid)
            .lte('start_date', today)
            .or(`end_date.is.null,end_date.gte.${today}`)
            .order('start_date', { ascending: false }),

        supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', uid)
            .single(),
    ])

    return {
        tasks: (tasksRes.data ?? []) as MyTask[],
        timesheets: (timesheetsRes.data ?? []) as MyTimesheet[],
        allocations: (allocationsRes.data ?? []) as MyAllocation[],
        profile: meRes.data as { full_name: string; email: string } | null,
    }
}

async function submitTimesheet(obraId: string, horas: number) {
    const profile = await getProfile()
    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase
        .from('timesheets')
        .upsert({
            tenant_id: profile.tenant_id,
            employee_id: profile.id,
            obra_id: obraId,
            data: today,
            horas,
            status: 'Rascunho',
            presenca: true,
        } as never, { onConflict: 'employee_id,obra_id,data' })

    if (error) throw new Error(error.message)
}

// ── Priority / Status helpers ────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
    'Crítica': 'destructive',
    'Alta': 'outline',
    'Média': 'outline',
    'Baixa': 'outline',
}
const priorityDot: Record<string, string> = {
    'Crítica': 'bg-red-500',
    'Alta': 'bg-orange-400',
    'Média': 'bg-yellow-400',
    'Baixa': 'bg-green-500',
}

function isPast(dateStr: string): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(dateStr) < today
}

// ─────────────────────────────────────────────────────────────────────────────
// MinhaAreaPage
// ─────────────────────────────────────────────────────────────────────────────

export function MinhaAreaPage() {
    const { user } = useAuth()
    const qc = useQueryClient()
    const [selectedObraId, setSelectedObraId] = useState('')
    const [horas, setHoras] = useState('8')
    const today = new Date()

    const { data, isLoading } = useQuery({
        queryKey: ['minha-area'],
        queryFn: fetchMyArea,
        staleTime: 30_000,
    })

    const timesheetMutation = useMutation({
        mutationFn: () => submitTimesheet(selectedObraId, parseFloat(horas)),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['minha-area'] })
            toast.success('Horas registadas com sucesso!')
            setSelectedObraId('')
            setHoras('8')
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const greetingHour = today.getHours()
    const greeting = greetingHour < 12 ? 'Bom dia' : greetingHour < 18 ? 'Boa tarde' : 'Boa noite'
    const displayName = data?.profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Utilizador'

    const activeAllocations = data?.allocations ?? []
    const myTasks = data?.tasks ?? []
    const myTimesheets = data?.timesheets ?? []
    const overdueTasks = myTasks.filter(t => t.due_date && isPast(t.due_date))

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-10">
            {/* ── Greeting ── */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <UserCircle2 className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">{greeting}, {displayName}! 👋</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {today.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </div>
                {overdueTasks.length > 0 && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Tem <strong>{overdueTasks.length}</strong> tarefa{overdueTasks.length !== 1 ? 's' : ''} em atraso!</span>
                    </div>
                )}
            </div>

            {/* ── Registar Horas ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarCheck className="h-4 w-4 text-primary" />
                        Registar Horas Hoje
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {activeAllocations.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Não está alocado a nenhuma obra neste momento.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label>Obra *</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {activeAllocations.map(alloc => (
                                        <button
                                            key={alloc.id}
                                            type="button"
                                            onClick={() => setSelectedObraId(alloc.obras?.id ?? '')}
                                            className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left text-sm transition-all ${selectedObraId === alloc.obras?.id
                                                    ? 'border-primary bg-primary/5 font-semibold'
                                                    : 'border-border hover:border-primary/40'
                                                }`}
                                        >
                                            <HardHat className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="truncate">{alloc.obras?.name ?? '—'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="horas">Horas trabalhadas *</Label>
                                    <Input
                                        id="horas"
                                        type="number"
                                        min="0.5"
                                        max="24"
                                        step="0.5"
                                        value={horas}
                                        onChange={e => setHoras(e.target.value)}
                                        className="text-center text-lg font-bold"
                                    />
                                </div>
                            </div>
                            <Button
                                className="w-full"
                                disabled={!selectedObraId || !horas || timesheetMutation.isPending}
                                onClick={() => timesheetMutation.mutate()}
                            >
                                {timesheetMutation.isPending
                                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    : <Plus className="h-4 w-4 mr-2" />
                                }
                                Registar Presença
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Obras Ativas ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <HardHat className="h-4 w-4 text-primary" />
                        As Minhas Obras ({activeAllocations.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activeAllocations.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            Sem alocações ativas de momento.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {activeAllocations.map(alloc => (
                                <div key={alloc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                                    <div>
                                        <p className="font-medium text-sm">{alloc.obras?.name}</p>
                                        <p className="text-xs text-muted-foreground">Desde {formatDate(alloc.start_date)}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">{alloc.obras?.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Minhas Tarefas ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        Minhas Tarefas
                        {myTasks.length > 0 && (
                            <Badge variant={overdueTasks.length > 0 ? 'destructive' : 'secondary'} className="text-xs ml-1">
                                {myTasks.length}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {myTasks.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                            <p className="text-sm font-medium">Nenhuma tarefa pendente</p>
                            <p className="text-xs text-muted-foreground">Excelente trabalho!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {myTasks.map(task => {
                                const overdue = task.due_date && isPast(task.due_date)
                                return (
                                    <div
                                        key={task.id}
                                        className={`p-3 rounded-lg border transition-colors ${overdue ? 'border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/40' : 'bg-card'}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${priorityDot[task.priority] ?? 'bg-muted-foreground'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium leading-tight">{task.title}</p>
                                                {task.obras?.name && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{task.obras.name}</p>
                                                )}
                                                {task.due_date && (
                                                    <p className={`text-xs mt-1 ${overdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                                                        {overdue ? '⚠️ Venceu em ' : 'Prazo: '}{formatDate(task.due_date)}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant={overdue ? 'destructive' : 'outline'} className="text-[10px] shrink-0">
                                                {task.status}
                                            </Badge>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Histórico Recente ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardList className="h-4 w-4 text-primary" />
                        Apontamentos Recentes (7 dias)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {myTimesheets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Sem apontamentos recentes.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {myTimesheets.map(ts => (
                                <div key={ts.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                                    <div>
                                        <p className="font-medium text-sm">{formatDate(ts.data)}</p>
                                        <p className="text-xs text-muted-foreground">{ts.obras?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold">{ts.horas}h</p>
                                        <Badge variant={ts.status === 'Aprovado' ? 'success' : ts.status === 'Rejeitado' ? 'destructive' : 'outline'} className="text-[10px]">
                                            {ts.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
