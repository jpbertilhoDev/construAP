import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    Users, Clock, CheckCircle, AlertCircle, ArrowRight,
    UserCheck, UserX, ClipboardList, CalendarCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useEmployees, useEmployeeRoles, useTimesheets, useApproveTimesheet } from '@/features/rh/hooks/useEmployees'
import { usePermissions } from '@/features/auth/usePermissions'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const ESTADO_STYLES: Record<string, string> = {
    Rascunho: 'bg-slate-100 text-slate-700',
    Submetido: 'bg-yellow-100 text-yellow-800',
    Aprovado: 'bg-green-100 text-green-800',
    Rejeitado: 'bg-red-100 text-red-800',
}

export function DashboardRH() {
    const { hasPermission } = usePermissions()
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')

    // Data
    const { data: allEmployees = [], isLoading: loadingEmp } = useEmployees(true)
    const { data: roles = [] } = useEmployeeRoles()
    const { data: todayTimesheets = [] } = useTimesheets({ data_inicio: todayStr, data_fim: todayStr })
    const { data: pendingTimesheets = [] } = useTimesheets({ estado: 'Submetido' })
    const { data: weekTimesheets = [] } = useTimesheets({ data_inicio: weekStart, data_fim: weekEnd })
    const { data: recentTimesheets = [] } = useTimesheets({})
    const approveMutation = useApproveTimesheet()

    // KPIs
    const activeCount = allEmployees.filter(e => e.estado === 'Ativo').length
    const inactiveCount = allEmployees.filter(e => e.estado !== 'Ativo').length

    // Chart: hours per obra this week
    const hoursPerObra = useMemo(() => {
        const map: Record<string, { name: string; horas: number }> = {}
        weekTimesheets.forEach(ts => {
            const obraName = ts.obras?.name ?? 'Sem obra'
            if (!map[obraName]) map[obraName] = { name: obraName, horas: 0 }
            map[obraName].horas += ts.horas ?? (ts.presenca ? 8 : 0)
        })
        return Object.values(map).sort((a, b) => b.horas - a.horas).slice(0, 8)
    }, [weekTimesheets])

    // Chart: employees by role
    const employeesByRole = useMemo(() => {
        const rolesMap = new Map(roles.map(r => [r.id, r.nome]))
        const map: Record<string, number> = {}
        allEmployees.filter(e => e.estado === 'Ativo').forEach(e => {
            const roleName = e.role_id ? (rolesMap.get(e.role_id) ?? 'Sem função') : 'Sem função'
            map[roleName] = (map[roleName] ?? 0) + 1
        })
        return Object.entries(map).map(([name, value]) => ({ name, value }))
    }, [allEmployees, roles])

    const stats = [
        {
            label: 'Funcionários Ativos',
            value: loadingEmp ? '...' : activeCount.toString(),
            icon: UserCheck,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
        },
        {
            label: 'Inativos / Suspensos',
            value: loadingEmp ? '...' : inactiveCount.toString(),
            icon: UserX,
            color: 'text-slate-500',
            bg: 'bg-slate-500/10',
        },
        {
            label: 'Apontamentos Hoje',
            value: todayTimesheets.length.toString(),
            icon: Clock,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Pendentes Aprovação',
            value: pendingTimesheets.length.toString(),
            icon: AlertCircle,
            color: pendingTimesheets.length > 0 ? 'text-amber-500' : 'text-emerald-500',
            bg: pendingTimesheets.length > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
        },
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Recursos Humanos</h1>
                <p className="text-muted-foreground mt-1">
                    Visão geral da equipa e apontamentos
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <div className={`${stat.bg} p-2 rounded-lg`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Bar Chart: Hours per Obra */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                            Horas por Obra (esta semana)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {hoursPerObra.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Sem apontamentos esta semana
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={hoursPerObra} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" fontSize={12} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={120}
                                        fontSize={11}
                                        tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v}
                                    />
                                    <Tooltip
                                        formatter={(v) => [`${v}h`, 'Horas']}
                                        contentStyle={{ fontSize: 12 }}
                                    />
                                    <Bar dataKey="horas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Pie Chart: Employees by Role */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            Funcionários por Função
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {employeesByRole.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Sem funcionários registados
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={employeesByRole}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={90}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, value }) => `${name ?? ''} (${value ?? 0})`}
                                        labelLine={false}
                                        fontSize={11}
                                    >
                                        {employeesByRole.map((_entry, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => [v, 'Funcionários']} />
                                    <Legend fontSize={11} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Pending Approvals */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        Aprovações Pendentes
                        {pendingTimesheets.length > 0 && (
                            <Badge variant="outline" className="ml-1 text-xs border-amber-500/30 text-amber-600 bg-amber-500/10">
                                {pendingTimesheets.length}
                            </Badge>
                        )}
                    </CardTitle>
                    <Link to="/rh/aprovacoes">
                        <Button variant="ghost" size="sm" className="text-xs gap-1">
                            Ver todas <ArrowRight className="h-3 w-3" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {pendingTimesheets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                            <p className="text-sm text-muted-foreground">Tudo aprovado. Sem pendências!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pendingTimesheets.slice(0, 5).map(ts => (
                                <div key={ts.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm truncate">{ts.employees?.nome ?? '—'}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {ts.obras?.name ?? '—'} · {format(new Date(ts.data), 'dd/MM/yyyy')} · {ts.horas ? `${ts.horas}h` : 'Presença'}
                                        </p>
                                    </div>
                                    {hasPermission('rh.manage') && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1 border-green-500/30 text-green-600 hover:bg-green-500/10 ml-2"
                                            disabled={approveMutation.isPending}
                                            onClick={() => approveMutation.mutate(ts.id)}
                                        >
                                            <CheckCircle className="h-3 w-3" />
                                            Aprovar
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Timesheets */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        Apontamentos Recentes
                    </CardTitle>
                    <Link to="/rh/apontamentos">
                        <Button variant="ghost" size="sm" className="text-xs gap-1">
                            Ver todos <ArrowRight className="h-3 w-3" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {recentTimesheets.length === 0 ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                            Sem apontamentos registados
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 font-medium text-muted-foreground">Funcionário</th>
                                        <th className="text-left py-2 font-medium text-muted-foreground hidden sm:table-cell">Obra</th>
                                        <th className="text-left py-2 font-medium text-muted-foreground">Data</th>
                                        <th className="text-center py-2 font-medium text-muted-foreground">Horas</th>
                                        <th className="text-center py-2 font-medium text-muted-foreground">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recentTimesheets.slice(0, 10).map(ts => (
                                        <tr key={ts.id} className="hover:bg-muted/20">
                                            <td className="py-2 font-medium">{ts.employees?.nome ?? '—'}</td>
                                            <td className="py-2 text-muted-foreground hidden sm:table-cell">{ts.obras?.name ?? '—'}</td>
                                            <td className="py-2">{format(new Date(ts.data), 'dd/MM', { locale: pt })}</td>
                                            <td className="py-2 text-center">{ts.horas ? `${ts.horas}h` : 'Dia'}</td>
                                            <td className="py-2 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[ts.estado] ?? ''}`}>
                                                    {ts.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Access */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Link to="/rh/apontamentos" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-blue-500/10 p-3 rounded-lg">
                                <Clock className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Folha de Ponto</p>
                                <p className="text-xs text-muted-foreground">Registar apontamentos</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/rh/aprovacoes" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-emerald-500/10 p-3 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Aprovações</p>
                                <p className="text-xs text-muted-foreground">
                                    {pendingTimesheets.length > 0 ? `${pendingTimesheets.length} pendente${pendingTimesheets.length !== 1 ? 's' : ''}` : 'Tudo em dia'}
                                </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/rh/funcionarios" className="block group">
                    <Card className="hover:border-primary/40 transition-colors h-full">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="bg-violet-500/10 p-3 rounded-lg">
                                <Users className="h-5 w-5 text-violet-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors">Funcionários</p>
                                <p className="text-xs text-muted-foreground">{activeCount} ativo{activeCount !== 1 ? 's' : ''}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
