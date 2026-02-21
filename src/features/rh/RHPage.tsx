import { Link } from 'react-router-dom'
import { Users, Clock, CheckCircle2, AlertTriangle, Plus, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEmployees } from './hooks/useEmployees'
import { useTimesheets } from './hooks/useEmployees'
import { formatDate } from '@/lib/utils'

export function RHPage() {
    const { data: employees = [] } = useEmployees()
    const { data: pendentes = [] } = useTimesheets({ estado: 'Submetido' })
    const { data: todayTs = [] } = useTimesheets({
        data_inicio: new Date().toISOString().substring(0, 10),
        data_fim: new Date().toISOString().substring(0, 10),
    })

    const kpis = {
        total: employees.length,
        ativos: employees.filter(e => e.estado === 'Ativo').length,
        pendentes: pendentes.length,
        apontamentosHoje: todayTs.length,
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Recursos Humanos</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">Gestão de funcionários, alocações e apontamentos</p>
                </div>
                <Button asChild size="sm" className="gap-1.5">
                    <Link to="/rh/funcionarios"><Plus className="h-4 w-4" /> Novo Funcionário</Link>
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Funcionários Ativos', value: kpis.ativos, icon: Users, color: 'text-blue-600', href: '/rh/funcionarios' },
                    { label: 'Apontamentos Hoje', value: kpis.apontamentosHoje, icon: Clock, color: 'text-emerald-600', href: '/rh/apontamentos' },
                    { label: 'Pendentes Aprovação', value: kpis.pendentes, icon: AlertTriangle, color: kpis.pendentes > 0 ? 'text-amber-600' : 'text-muted-foreground', href: '/rh/aprovacoes' },
                    { label: 'Total Funcionários', value: kpis.total, icon: CheckCircle2, color: 'text-slate-500', href: '/rh/funcionarios' },
                ].map(k => (
                    <Link key={k.label} to={k.href}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="pt-4 pb-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">{k.label}</p>
                                    <k.icon className={`h-4 w-4 ${k.color}`} />
                                </div>
                                <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Pendentes de aprovação */}
            {pendentes.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                Apontamentos Pendentes de Aprovação
                            </CardTitle>
                            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                                <Link to="/rh/aprovacoes">Ver todos <ArrowRight className="h-3 w-3" /></Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="divide-y">
                            {pendentes.slice(0, 5).map(ts => (
                                <div key={ts.id} className="flex items-center justify-between py-2.5 text-sm">
                                    <div>
                                        <span className="font-medium">{ts.employees?.nome ?? '—'}</span>
                                        <span className="text-muted-foreground ml-2">· {ts.obras?.name ?? '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-xs">{formatDate(ts.data)}</span>
                                        <Badge variant="warning">{ts.horas ? `${ts.horas}h` : 'Presença'}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Acesso rápido */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { title: 'Folha de Ponto', desc: 'Registar horas e presenças', href: '/rh/apontamentos', icon: Clock },
                    { title: 'Aprovações', desc: 'Aprovar/rejeitar apontamentos', href: '/rh/aprovacoes', icon: CheckCircle2 },
                    { title: 'Funcionários', desc: 'Gerir equipa e funções', href: '/rh/funcionarios', icon: Users },
                ].map(item => (
                    <Link key={item.href} to={item.href}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardHeader className="pb-2">
                                <item.icon className="h-5 w-5 text-primary mb-1" />
                                <CardTitle className="text-sm">{item.title}</CardTitle>
                                <CardDescription className="text-xs">{item.desc}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
