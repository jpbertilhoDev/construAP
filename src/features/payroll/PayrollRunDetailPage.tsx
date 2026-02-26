import { useParams, Link } from 'react-router-dom'
import {
    Loader2,
    ArrowLeft,
    CheckCircle,
    XCircle,
    FileDown,
    Wallet,
    Shield,
    Receipt,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
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
import { formatCurrency } from '@/lib/utils'
import { usePermissions } from '@/features/auth/usePermissions'
import {
    usePayrollRun,
    usePayrollRunLines,
    useFinalizePayroll,
    useCancelPayroll,
} from './hooks/usePayroll'
import { exportPayrollSummaryPdf, exportPayrollPayslipsPdf } from './utils/payrollExportPdf'

// ── Constants ────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────

export function PayrollRunDetailPage() {
    const { id } = useParams<{ id: string }>()
    const { hasPermission } = usePermissions()
    const canManage = hasPermission('rh.manage')

    const { data: run, isLoading: runLoading } = usePayrollRun(id ?? '')
    const { data: lines = [], isLoading: linesLoading } = usePayrollRunLines(id ?? '')

    const finalize = useFinalizePayroll()
    const cancel = useCancelPayroll()

    const isLoading = runLoading || linesLoading

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!run) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="font-medium">Processamento não encontrado</p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link to="/rh/salarios">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Voltar
                    </Link>
                </Button>
            </div>
        )
    }

    const periodTitle = `${MONTH_NAMES[run.periodo_mes]} ${String(run.periodo_ano)}`
    const showActions = run.status === 'Processado' && canManage

    // ── KPI data ─────────────────────────────────────────────

    const kpis = [
        {
            label: 'Total Bruto',
            value: formatCurrency(run.total_bruto),
            icon: Wallet,
            color: 'text-emerald-600',
        },
        {
            label: 'SS Entidade',
            value: formatCurrency(run.total_ss_entidade),
            icon: Shield,
            color: 'text-orange-600',
        },
        {
            label: 'SS Trabalhador',
            value: formatCurrency(run.total_ss_trabalhador),
            icon: Shield,
            color: 'text-amber-600',
        },
        {
            label: 'IRS',
            value: formatCurrency(run.total_irs),
            icon: Receipt,
            color: 'text-red-600',
        },
        {
            label: 'Total Líquido',
            value: formatCurrency(run.total_liquido),
            icon: Wallet,
            color: 'text-blue-600',
        },
    ]

    // ── Table totals ─────────────────────────────────────────

    const totals = lines.reduce(
        (acc, l) => ({
            dias: acc.dias + l.dias_trabalhados,
            horas: acc.horas + l.horas_normais + l.horas_extra,
            base: acc.base + l.salario_base,
            extra: acc.extra + l.valor_horas_extra,
            subAlim: acc.subAlim + l.subsidio_alimentacao,
            subFerias: acc.subFerias + l.subsidio_ferias,
            subNatal: acc.subNatal + l.subsidio_natal,
            bruto: acc.bruto + l.total_bruto,
            ss: acc.ss + l.desconto_ss,
            irs: acc.irs + l.desconto_irs,
            liquido: acc.liquido + l.total_liquido,
        }),
        {
            dias: 0, horas: 0, base: 0, extra: 0, subAlim: 0,
            subFerias: 0, subNatal: 0, bruto: 0, ss: 0, irs: 0, liquido: 0,
        },
    )

    // ── Render ────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button asChild variant="outline" size="icon" className="h-8 w-8">
                        <Link to="/rh/salarios">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{periodTitle}</h1>
                        <p className="text-muted-foreground text-sm">
                            {String(run.num_funcionarios)} funcionário{run.num_funcionarios !== 1 ? 's' : ''} processado{run.num_funcionarios !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <Badge variant={statusVariant[run.status] ?? 'outline'} className="text-sm">
                    {run.status}
                </Badge>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
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

            {/* Breakdown Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                            Detalhe por Funcionário
                        </CardTitle>
                        {lines.length > 0 && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void exportPayrollSummaryPdf(run, lines)}
                                >
                                    <FileDown className="h-4 w-4 mr-1" />
                                    Resumo PDF
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void exportPayrollPayslipsPdf(run, lines)}
                                >
                                    <FileDown className="h-4 w-4 mr-1" />
                                    Recibos PDF
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {lines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Wallet className="h-8 w-8 text-muted-foreground mb-3" />
                            <p className="font-medium">Sem linhas de processamento</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[160px]">Funcionário</TableHead>
                                        <TableHead className="min-w-[100px]">Função</TableHead>
                                        <TableHead className="text-right">Dias</TableHead>
                                        <TableHead className="text-right">Horas</TableHead>
                                        <TableHead className="text-right">Base</TableHead>
                                        <TableHead className="text-right">Extra</TableHead>
                                        <TableHead className="text-right">Sub.Alim</TableHead>
                                        <TableHead className="text-right">Sub.Férias</TableHead>
                                        <TableHead className="text-right">Sub.Natal</TableHead>
                                        <TableHead className="text-right">Bruto</TableHead>
                                        <TableHead className="text-right">SS(11%)</TableHead>
                                        <TableHead className="text-right">IRS</TableHead>
                                        <TableHead className="text-right">Líquido</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lines.map((line) => (
                                        <TableRow key={line.id}>
                                            <TableCell className="font-medium">
                                                {line.employees?.nome ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {line.employees?.employee_roles?.nome ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {String(line.dias_trabalhados)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {String(line.horas_normais + line.horas_extra)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(line.salario_base)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(line.valor_horas_extra)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(line.subsidio_alimentacao)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(line.subsidio_ferias)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(line.subsidio_natal)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(line.total_bruto)}
                                            </TableCell>
                                            <TableCell className="text-right text-orange-600">
                                                {formatCurrency(line.desconto_ss)}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600">
                                                {formatCurrency(line.desconto_irs)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-blue-600">
                                                {formatCurrency(line.total_liquido)}
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Footer totals row */}
                                    <TableRow className="bg-muted/50 font-bold border-t-2">
                                        <TableCell>Totais</TableCell>
                                        <TableCell />
                                        <TableCell className="text-right">
                                            {String(totals.dias)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {String(Math.round(totals.horas * 100) / 100)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(totals.base)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(totals.extra)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(totals.subAlim)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(totals.subFerias)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(totals.subNatal)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(totals.bruto)}
                                        </TableCell>
                                        <TableCell className="text-right text-orange-600">
                                            {formatCurrency(totals.ss)}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                            {formatCurrency(totals.irs)}
                                        </TableCell>
                                        <TableCell className="text-right text-blue-600">
                                            {formatCurrency(totals.liquido)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Buttons */}
            {showActions && (
                <div className="flex gap-3 justify-end">
                    {/* Finalizar */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                disabled={finalize.isPending}
                            >
                                {finalize.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                Finalizar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Finalizar processamento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Ao finalizar, o processamento de {periodTitle} será marcado como
                                    concluído e não poderá ser alterado. Esta ação é irreversível.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => { finalize.mutate(run.id) }}
                                >
                                    Confirmar Finalização
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Anular */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                disabled={cancel.isPending}
                            >
                                {cancel.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                    <XCircle className="h-4 w-4 mr-1" />
                                )}
                                Anular
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Anular processamento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Ao anular, o processamento de {periodTitle} será invalidado.
                                    Os dados serão mantidos para referência, mas o processamento
                                    ficará marcado como anulado. Esta ação é irreversível.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => { cancel.mutate(run.id) }}
                                >
                                    Confirmar Anulação
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
        </div>
    )
}
