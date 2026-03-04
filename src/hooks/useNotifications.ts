// @ts-nocheck
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'

export type NotificationType = 'cost' | 'task' | 'payable' | 'receivable' | 'timesheet'

export type AppNotification = {
    id: string
    type: NotificationType
    title: string
    description: string
    link: string
    createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isPast(dateStr: string): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(dateStr) < today
}

function formatDateShort(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

// ── Main query fn ──────────────────────────────────────────────────────────

async function fetchNotifications(): Promise<AppNotification[]> {
    const profile = await getProfile()
    const tid = profile.tenant_id
    const uid = profile.id

    const notifications: AppNotification[] = []

    // 1. Costs awaiting approval
    const { data: costs } = await supabase
        .from('costs')
        .select('id, description, amount, created_at, obras(name)')
        .eq('tenant_id', tid)
        .eq('status', 'Pendente Aprovação')
        .order('created_at', { ascending: false })
        .limit(10)

    for (const c of costs ?? []) {
        const obra = (c.obras as { name: string } | null)?.name ?? ''
        notifications.push({
            id: `cost-${c.id}`,
            type: 'cost',
            title: 'Custo pendente de aprovação',
            description: `${c.description}${obra ? ` · ${obra}` : ''} · ${(c.amount as number).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`,
            link: '/obras',
            createdAt: c.created_at,
        })
    }

    // 2. Tasks assigned to me that are open or in progress
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority, created_at, obras(name)')
        .eq('tenant_id', tid)
        .eq('assignee_id', uid)
        .in('status', ['Aberta', 'Em Curso'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10)

    for (const t of tasks ?? []) {
        const obra = (t.obras as { name: string } | null)?.name ?? ''
        const overdue = t.due_date && isPast(t.due_date)
        notifications.push({
            id: `task-${t.id}`,
            type: 'task',
            title: overdue ? '⚠️ Tarefa atrasada' : 'Tarefa atribuída a si',
            description: `${t.title}${obra ? ` · ${obra}` : ''}${t.due_date ? ` · Prazo: ${formatDateShort(t.due_date)}` : ''}`,
            link: '/obras',
            createdAt: t.created_at,
        })
    }

    // 3. Overdue payables
    const { data: payables } = await supabase
        .from('accounts_payable')
        .select('id, description, amount, due_date, created_at')
        .eq('tenant_id', tid)
        .in('status', ['Pendente', 'Parcial'])
        .order('due_date', { ascending: true })
        .limit(10)

    for (const ap of (payables ?? []).filter(p => isPast(p.due_date))) {
        notifications.push({
            id: `ap-${ap.id}`,
            type: 'payable',
            title: '🔴 Fatura a pagar vencida',
            description: `${ap.description} · Venceu ${formatDateShort(ap.due_date)} · ${(ap.amount as number).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`,
            link: '/finance',
            createdAt: ap.created_at,
        })
    }

    // 4. Overdue receivables
    const { data: receivables } = await supabase
        .from('accounts_receivable')
        .select('id, description, amount, due_date, created_at')
        .eq('tenant_id', tid)
        .in('status', ['Pendente', 'Parcial'])
        .order('due_date', { ascending: true })
        .limit(10)

    for (const ar of (receivables ?? []).filter(r => isPast(r.due_date))) {
        notifications.push({
            id: `ar-${ar.id}`,
            type: 'receivable',
            title: '🟡 Fatura a receber vencida',
            description: `${ar.description} · Venceu ${formatDateShort(ar.due_date)} · ${(ar.amount as number).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`,
            link: '/finance',
            createdAt: ar.created_at,
        })
    }

    // 5. Timesheets submitted (only visible if user has rh.view effectively)
    const { data: timesheets } = await supabase
        .from('timesheets')
        .select('id, data, created_at, employees(nome)')
        .eq('tenant_id', tid)
        .eq('status', 'Submetido')
        .order('created_at', { ascending: false })
        .limit(5)

    for (const ts of timesheets ?? []) {
        const empName = (ts.employees as { nome: string } | null)?.nome ?? 'Funcionário'
        notifications.push({
            id: `ts-${ts.id}`,
            type: 'timesheet',
            title: 'Apontamento pendente de aprovação',
            description: `${empName} · ${formatDateShort(ts.data)}`,
            link: '/rh/aprovacoes',
            createdAt: ts.created_at,
        })
    }

    // Sort by createdAt descending and cap at 20
    return notifications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20)
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useNotifications() {
    return useQuery({
        queryKey: ['app-notifications'],
        queryFn: fetchNotifications,
        refetchInterval: 30_000, // Poll every 30 seconds
        staleTime: 25_000,
        retry: false, // Don't retry on failure to avoid spamming
    })
}
