import { Link } from 'react-router-dom'
import {
    Wallet,
    Plus,
    Settings,
    Calendar,
    Users,
    ArrowRight,
    Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { usePermissions } from '@/features/auth/usePermissions'
import { usePayrollRuns } from './hooks/usePayroll'
import { PayrollConfigDialog } from './PayrollConfigDialog'
import { useState } from 'react'

const MONTH_NAMES = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const statusVariant: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
    Rascunho: 'secondary',
    Processado: 'default',
    Finalizado: 'outline',
    Anulado: 'destructive',
}

export function PayrollPage() {
    const { hasPermission } = usePermissions()
    const canManage = hasPermission('rh.manage')
    const { data: runs = [], isLoading } = usePayrollRuns()
    const [configOpen, setConfigOpen] = useState(false)

    const lastFinalized = runs.find((r) => r.status === 'Finalizado')
    const pendingCount = runs.filter((r) => r.status === 'Processado').length

    const kpis = [
        {
            label: 'Último Processamento',
            value: lastFinalized
                ? `${MONTH_NAMES[lastFinalized.periodo_mes]} ${String(lastFinalized.periodo_ano)}`
                : 'Nenhum',
            icon: Calendar,
            color: 'text-blue-600',
        },
        {
            label: 'Total Bruto',
            value: lastFinalized ? formatCurrency(lastFinalized.total_bruto) : '—',
            icon: Wallet,
            color: 'text-emerald-600',
        },
        {
            label: 'Total Líquido',
            value: lastFinalized ? formatCurrency(lastFinalized.total_liquido) : '—',
            icon: Wallet,
            color: 'text-blue-600',
        },
        {
            label: 'Pendentes',
            value: String(pendingCount),
            icon: Users,
            color: pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Salários</h1>
                    <p className="text-muted-foreground text-sm">
                        Processamento salarial mensal
                    </p>
                </div>
                <div className="flex gap-2">
                    {canManage && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setConfigOpen(true) }}
                        >
                            <Settings className="h-4 w-4 mr-1" />
                            Configuração
                        </Button>
                    )}
                    {canManage && (
                        <Button asChild size="sm">
                            <Link to="/rh/salarios/processar">
                                <Plus className="h-4 w-4 mr-1" />
                                Novo Processamento
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {kpis.map((k) => (
                    <Card key={k.label}>
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">{k.label}</p>
                                <k.icon className={`h-4 w-4 ${k.color}`} />
                            </div>
                            <p className={`text-2xl font-bold mt-1 ${k.color}`}>
                                {k.value}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Runs list */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Processamentos
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : runs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Wallet className="h-8 w-8 text-muted-foreground mb-3" />
                            <p className="font-medium">Nenhum processamento</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Crie o primeiro processamento salarial.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {runs.slice(0, 12).map((run) => (
                                <Link
                                    key={run.id}
                                    to={`/rh/salarios/${run.id}`}
                                    className="flex items-center justify-between py-3 hover:bg-muted/50 px-2 -mx-2 rounded-md transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                                {MONTH_NAMES[run.periodo_mes]} {String(run.periodo_ano)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {String(run.num_funcionarios)} funcionário{run.num_funcionarios !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-sm font-medium">
                                                {formatCurrency(run.total_liquido)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                líquido
                                            </p>
                                        </div>
                                        <Badge variant={statusVariant[run.status] ?? 'outline'}>
                                            {run.status}
                                        </Badge>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <PayrollConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
        </div>
    )
}
