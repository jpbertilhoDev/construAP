import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, Eye, Play, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { usePermissions } from '@/features/auth/usePermissions'
import { usePayrollPreview, useProcessPayroll } from './hooks/usePayroll'
import type { PayrollProcessOptions, PayrollPreviewLine } from '@/services/payroll'

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const YEARS = (() => {
    const current = new Date().getFullYear()
    return [current - 1, current, current + 1]
})()

function sumField(lines: PayrollPreviewLine[], field: keyof PayrollPreviewLine): number {
    return lines.reduce((acc, l) => acc + (l[field] as number), 0)
}

export function PayrollProcessPage() {
    const navigate = useNavigate()
    const { hasPermission } = usePermissions()
    const canManage = hasPermission('rh.manage')

    const now = new Date()
    const [mes, setMes] = useState(now.getMonth() + 1)
    const [ano, setAno] = useState(now.getFullYear())
    const [incluirSubFerias, setIncluirSubFerias] = useState(now.getMonth() + 1 === 6)
    const [incluirSubNatal, setIncluirSubNatal] = useState(now.getMonth() + 1 === 12)
    const [previewOptions, setPreviewOptions] = useState<PayrollProcessOptions | null>(null)

    const {
        data: previewLines = [],
        isLoading: isLoadingPreview,
        isFetching: isFetchingPreview,
    } = usePayrollPreview(previewOptions)

    const processMutation = useProcessPayroll()

    const hasPreview = previewOptions !== null && previewLines.length > 0

    function handlePreview() {
        setPreviewOptions({ mes, ano, incluirSubFerias, incluirSubNatal })
    }

    async function handleProcess() {
        try {
            const run = await processMutation.mutateAsync({
                mes,
                ano,
                incluirSubFerias,
                incluirSubNatal,
            })
            void navigate(`/rh/salarios/${run.id}`)
        } catch {
            // Error handled by mutation's onError
        }
    }

    if (!canManage) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="font-medium">Sem permissão</p>
                <p className="text-sm text-muted-foreground mt-1">
                    Não tem permissão para processar salários.
                </p>
                <Button asChild variant="outline" className="mt-4">
                    <Link to="/rh/salarios">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Voltar
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="icon">
                    <Link to="/rh/salarios">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Processar Salários</h1>
                    <p className="text-muted-foreground text-sm">
                        Processamento salarial mensal
                    </p>
                </div>
            </div>

            {/* Options */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Opções de Processamento
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Month / Year selectors */}
                    <div className="flex flex-wrap gap-4">
                        <div className="space-y-1.5">
                            <Label>Mês</Label>
                            <Select
                                value={String(mes)}
                                onValueChange={(v) => {
                                    const m = Number(v)
                                    setMes(m)
                                    setIncluirSubFerias(m === 6)
                                    setIncluirSubNatal(m === 12)
                                    setPreviewOptions(null)
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTH_NAMES.map((name, i) => (
                                        <SelectItem key={i} value={String(i + 1)}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Ano</Label>
                            <Select
                                value={String(ano)}
                                onValueChange={(v) => {
                                    setAno(Number(v))
                                    setPreviewOptions(null)
                                }}
                            >
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {YEARS.map((y) => (
                                        <SelectItem key={y} value={String(y)}>
                                            {String(y)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Subsidy checkboxes */}
                    <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="sub-ferias"
                                checked={incluirSubFerias}
                                onCheckedChange={(c) => {
                                    setIncluirSubFerias(!!c)
                                    setPreviewOptions(null)
                                }}
                            />
                            <Label htmlFor="sub-ferias" className="cursor-pointer">
                                Incluir Subsídio de Férias
                            </Label>
                            {mes === 6 && (
                                <Badge variant="secondary" className="text-xs">Junho</Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="sub-natal"
                                checked={incluirSubNatal}
                                onCheckedChange={(c) => {
                                    setIncluirSubNatal(!!c)
                                    setPreviewOptions(null)
                                }}
                            />
                            <Label htmlFor="sub-natal" className="cursor-pointer">
                                Incluir Subsídio de Natal
                            </Label>
                            {mes === 12 && (
                                <Badge variant="secondary" className="text-xs">Dezembro</Badge>
                            )}
                        </div>
                    </div>

                    {/* Preview button */}
                    <div className="pt-2">
                        <Button
                            onClick={handlePreview}
                            disabled={isFetchingPreview}
                        >
                            {isFetchingPreview ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <Eye className="h-4 w-4 mr-1" />
                            )}
                            Pré-visualizar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Preview loading */}
            {isLoadingPreview && previewOptions && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Empty state */}
            {previewOptions && !isLoadingPreview && previewLines.length === 0 && (
                <Card>
                    <CardContent className="py-12">
                        <div className="flex flex-col items-center justify-center text-center">
                            <Calendar className="h-8 w-8 text-muted-foreground mb-3" />
                            <p className="font-medium">Sem funcionários</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Não foram encontrados funcionários com timesheets aprovados para{' '}
                                {MONTH_NAMES[mes - 1]} {String(ano)}.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Preview table */}
            {hasPreview && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                                Pré-visualização &mdash; {MONTH_NAMES[mes - 1]} {String(ano)}
                            </CardTitle>
                            <Badge variant="outline">
                                {String(previewLines.length)} funcionário{previewLines.length !== 1 ? 's' : ''}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="overflow-x-auto -mx-6 px-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[180px]">Funcionário</TableHead>
                                        <TableHead className="text-right">Dias</TableHead>
                                        <TableHead className="text-right">Horas</TableHead>
                                        <TableHead className="text-right">Base</TableHead>
                                        <TableHead className="text-right">Extra</TableHead>
                                        <TableHead className="text-right">Sub.Alim</TableHead>
                                        <TableHead className="text-right">Sub.Férias</TableHead>
                                        <TableHead className="text-right">Sub.Natal</TableHead>
                                        <TableHead className="text-right">Bruto</TableHead>
                                        <TableHead className="text-right">SS</TableHead>
                                        <TableHead className="text-right">IRS</TableHead>
                                        <TableHead className="text-right">Líquido</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewLines.map((line) => (
                                        <TableRow key={line.employee_id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {line.employee_name}
                                                    </p>
                                                    {line.employee_role && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {line.employee_role}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {String(line.dias_trabalhados)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {String(line.horas_normais)}
                                                {line.horas_extra > 0 && (
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                        (+{String(line.horas_extra)})
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCurrency(line.salario_base)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCurrency(line.valor_horas_extra)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCurrency(line.subsidio_alimentacao)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCurrency(line.subsidio_ferias)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCurrency(line.subsidio_natal)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums font-medium">
                                                {formatCurrency(line.total_bruto)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-red-600">
                                                {formatCurrency(line.desconto_ss)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-red-600">
                                                {formatCurrency(line.desconto_irs)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums font-semibold">
                                                {formatCurrency(line.total_liquido)}
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Totals footer row */}
                                    <TableRow className="border-t-2 font-semibold bg-muted/50">
                                        <TableCell>Totais</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {String(sumField(previewLines, 'dias_trabalhados'))}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {String(sumField(previewLines, 'horas_normais'))}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatCurrency(sumField(previewLines, 'salario_base'))}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatCurrency(sumField(previewLines, 'valor_horas_extra'))}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatCurrency(sumField(previewLines, 'subsidio_alimentacao'))}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatCurrency(sumField(previewLines, 'subsidio_ferias'))}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatCurrency(sumField(previewLines, 'subsidio_natal'))}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatCurrency(sumField(previewLines, 'total_bruto'))}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-red-600">
                                            {formatCurrency(sumField(previewLines, 'desconto_ss'))}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-red-600">
                                            {formatCurrency(sumField(previewLines, 'desconto_irs'))}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatCurrency(sumField(previewLines, 'total_liquido'))}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* Process button */}
                        <div className="flex justify-end pt-6">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        disabled={processMutation.isPending}
                                    >
                                        {processMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        ) : (
                                            <Play className="h-4 w-4 mr-1" />
                                        )}
                                        Processar Salários
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            Confirmar processamento salarial
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Vai processar os salários de{' '}
                                            <strong>{MONTH_NAMES[mes - 1]} {String(ano)}</strong>{' '}
                                            para <strong>{String(previewLines.length)}</strong>{' '}
                                            funcionário{previewLines.length !== 1 ? 's' : ''}.
                                            {incluirSubFerias && ' Inclui subsídio de férias.'}
                                            {incluirSubNatal && ' Inclui subsídio de Natal.'}
                                            {' '}Esta ação não pode ser revertida automaticamente.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                                void handleProcess()
                                            }}
                                        >
                                            Confirmar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
