import { useState } from 'react'
import { ReportFilterBar } from '../components/ReportFilterBar'
import { ReportKpiCards, type ReportKpiData } from '../components/ReportKpiCards'
import { ReportDataTable } from '../components/ReportDataTable'
import { useReportBudgetActual } from '../hooks/useRelatorios'
import type { ReportFilters } from '@/services/relatorios'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Wallet, TrendingUp, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function ReportBudgetPage() {
    const [filters, setFilters] = useState<ReportFilters>({})
    const { data: reportData, isLoading } = useReportBudgetActual(filters)

    // Calculate aggregated KPIs
    const totalBudget = reportData?.reduce((acc, curr) => acc + (curr.contract_value || 0), 0) || 0
    const totalCosts = reportData?.reduce((acc, curr) => acc + (curr.total_costs || 0), 0) || 0
    const totalMargin = totalBudget - totalCosts
    const marginColor = totalMargin < 0 ? 'danger' : (totalMargin > 0 ? 'success' : 'warning')

    const kpiData: ReportKpiData[] = [
        {
            id: 'kpi-budget',
            title: 'Orçamento Global (Adjudicado)',
            value: formatCurrency(totalBudget),
            icon: <Wallet className="h-4 w-4" />
        },
        {
            id: 'kpi-costs',
            title: 'Custos Totais Assumidos',
            value: formatCurrency(totalCosts),
        },
        {
            id: 'kpi-margin',
            title: 'Margem / Desvio Líquido',
            value: formatCurrency(totalMargin),
            colorHint: marginColor,
            icon: totalMargin >= 0 ? <TrendingUp className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4 text-red-500" />
        }
    ]

    const columns = [
        { key: 'obra_name', label: 'Nome da Empreitada' },
        { key: 'obra_status', label: 'Estado' },
        { key: 'contract_value', label: 'Valor Adjudicado', rightAlign: true, render: (v: number) => formatCurrency(v) },
        { key: 'total_costs', label: 'Custos Reais', rightAlign: true, render: (v: number) => formatCurrency(v) },
        {
            key: 'profit_margin',
            label: 'Margem',
            rightAlign: true,
            render: (v: number) => (
                <span className={v < 0 ? 'text-red-500 font-medium' : 'text-emerald-500 font-medium'}>
                    {formatCurrency(v)}
                </span>
            )
        },
        {
            key: 'profit_percentage',
            label: 'Rentabilidade (%)',
            rightAlign: true,
            render: (v: number) => (
                <span className={v < 0 ? 'text-red-500 font-medium' : 'text-emerald-500 font-medium'}>
                    {v}%
                </span>
            )
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
                        <Wallet className="h-7 w-7 text-emerald-500" />
                        Comparativo Orçado vs Real
                    </h1>
                </div>
            </div>

            <div className="print-hidden">
                <ReportFilterBar onFilterChange={setFilters} />
            </div>

            <ReportKpiCards data={kpiData} />

            <ReportDataTable
                title="Lista Analítica de Obras"
                reportId="orcamento-vs-real"
                columns={columns}
                data={reportData || []}
                isLoading={isLoading}
                filtersApplied={filters}
            />
        </div>
    )
}
