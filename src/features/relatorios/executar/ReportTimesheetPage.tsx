import { useState } from 'react'
import { ReportFilterBar } from '../components/ReportFilterBar'
import { ReportKpiCards, type ReportKpiData } from '../components/ReportKpiCards'
import { ReportDataTable } from '../components/ReportDataTable'
import { useReportTimesheetAggregate } from '../hooks/useRelatorios'
import type { ReportFilters } from '@/services/relatorios'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Users, Clock, Sigma } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function ReportTimesheetPage() {
    const [filters, setFilters] = useState<ReportFilters>({})
    const { data: reportData, isLoading } = useReportTimesheetAggregate(filters)

    // Calculate aggregated KPIs
    const totalHoras = reportData?.reduce((acc, curr) => acc + (curr.total_horas || 0), 0) || 0
    const totalPresencas = reportData?.reduce((acc, curr) => acc + (curr.total_presencas || 0), 0) || 0
    const totalCusto = reportData?.reduce((acc, curr) => acc + (curr.total_cost_calculated || 0), 0) || 0

    const kpiData: ReportKpiData[] = [
        {
            id: 'kpi-hours',
            title: 'Total de Horas Trabalhadas',
            value: totalHoras,
            icon: <Clock className="h-4 w-4 text-blue-500" />
        },
        {
            id: 'kpi-presencas',
            title: 'Dias de Presença Real',
            value: totalPresencas,
            icon: <Users className="h-4 w-4" />
        },
        {
            id: 'kpi-costs',
            title: 'Custo de Mão de Obra Acumulado',
            value: formatCurrency(totalCusto),
            colorHint: 'danger',
            icon: <Sigma className="h-4 w-4 text-red-500" />
        }
    ]

    const columns = [
        { key: 'obra_name', label: 'Nome da Empreitada' },
        { key: 'employee_name', label: 'Nome do Funcionário' },
        { key: 'total_presencas', label: 'Presenças', rightAlign: true },
        { key: 'total_horas', label: 'Horas Totais', rightAlign: true },
        {
            key: 'total_cost_calculated',
            label: 'Custo Calculado',
            rightAlign: true,
            render: (v: number) => <span className="text-red-500">{formatCurrency(v)}</span>
        },
    ]

    return (
        <div className="space-y-6 animate-fade-in pb-10 print:pb-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print-hidden">
                <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                            <Link to="/relatorios">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <span className="text-xs font-medium">Voltar ao Catálogo</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Users className="h-7 w-7 text-amber-500" />
                        Mão de Obra e Apontamentos
                    </h1>
                </div>
            </div>

            <div className="print-hidden">
                <ReportFilterBar onFilterChange={setFilters} />
            </div>

            <ReportKpiCards data={kpiData} />

            <ReportDataTable
                title="Agregação de Horas por Funcionário"
                reportId="mao-de-obra"
                columns={columns}
                data={reportData || []}
                isLoading={isLoading}
                filtersApplied={filters}
            />
        </div>
    )
}
