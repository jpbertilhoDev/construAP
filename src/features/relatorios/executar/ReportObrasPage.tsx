import { useState } from 'react'
import { ReportFilterBar } from '../components/ReportFilterBar'
import { ReportKpiCards, type ReportKpiData } from '../components/ReportKpiCards'
import { ReportDataTable } from '../components/ReportDataTable'
import { useReportObrasStatus } from '../hooks/useRelatorios'
import type { ReportFilters } from '@/services/relatorios'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Building2, CheckCircle2, Factory } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function ReportObrasPage() {
    const [filters, setFilters] = useState<ReportFilters>({})
    const { data: rawData, isLoading } = useReportObrasStatus()

    // Client-side filtering because view doesn't take parameters
    const reportData = (rawData || []).filter(item => {
        if (filters.obra_id && item.obra_id !== filters.obra_id) return false
        // For physical status report, start/end dates correspond to the project timeline filter if needed
        // but typically we just dump all. So client filter logic just for obra_id
        return true
    })

    const totalObras = reportData.length
    const obrasConcluidas = reportData.filter(o => o.status === 'Concluída').length
    const obrasAtivas = reportData.filter(o => o.status === 'Em execução').length

    const kpiData: ReportKpiData[] = [
        {
            id: 'kpi-total',
            title: 'Total de Obras (Filtro)',
            value: totalObras,
            icon: <Factory className="h-4 w-4" />
        },
        {
            id: 'kpi-ativas',
            title: 'Em execução',
            value: obrasAtivas,
            colorHint: 'warning'
        },
        {
            id: 'kpi-concluidas',
            title: 'Concluídas',
            value: obrasConcluidas,
            colorHint: 'success',
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        }
    ]

    const columns = [
        { key: 'obra_name', label: 'Nome da Empreitada' },
        { key: 'type', label: 'Tipologia' },
        {
            key: 'status',
            label: 'Estado',
            render: (v: string) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                    ${v === 'Concluída' ? 'bg-emerald-500/10 text-emerald-500' :
                        v === 'Em execução' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
                    {v}
                </span>
            )
        },
        { key: 'start_date', label: 'Início', render: (v: string) => v ? formatDate(v) : '-' },
        { key: 'end_date_planned', label: 'Fim Previsto', render: (v: string) => v ? formatDate(v) : '-' },
        { key: 'contract_value', label: 'Valor Adjudicado', rightAlign: true, render: (v: number) => formatCurrency(v || 0) },
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
                        <Building2 className="h-7 w-7 text-blue-500" />
                        Andamento Global de Obras
                    </h1>
                </div>
            </div>

            <div className="print-hidden">
                <ReportFilterBar
                    onFilterChange={setFilters}
                    showDates={false} // Filter basically just by Obra is enough
                />
            </div>

            <ReportKpiCards data={kpiData} />

            <ReportDataTable
                title="Registo Geral de Status"
                reportId="status-obras"
                columns={columns}
                data={reportData}
                isLoading={isLoading}
                filtersApplied={filters}
            />
        </div>
    )
}
