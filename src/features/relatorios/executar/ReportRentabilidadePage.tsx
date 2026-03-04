// @ts-nocheck
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, TrendingUp, TrendingDown, Download, Loader2 } from 'lucide-react'
import { useObras, useAllObraFinancials } from '@/features/obras/hooks/useObras'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Types ─────────────────────────────────────────────────────────────────────

type RentabilidadeRow = {
    id: string
    name: string
    status: string
    contract_value: number
    total_costs: number
    margem: number
    margem_pct: number
}

function getSemaforo(pct: number): { label: string; variant: 'success' | 'outline' | 'destructive' | 'secondary' } {
    if (pct > 20) return { label: 'Boa margem', variant: 'success' }
    if (pct >= 0) return { label: 'Margem baixa', variant: 'secondary' }
    return { label: 'Prejuízo', variant: 'destructive' }
}

export function ReportRentabilidadePage() {
    const { data: obras = [], isLoading: loadingObras } = useObras()
    const { data: financials = [], isLoading: loadingFin } = useAllObraFinancials()

    const isLoading = loadingObras || loadingFin

    const rows: RentabilidadeRow[] = obras
        .filter(o => o.status !== 'Arquivada')
        .map(o => {
            const fin = financials.find(f => f.obra_id === o.id)
            const contract_value = o.contract_value ?? 0
            const total_costs = fin?.total_costs ?? 0
            const margem = contract_value - total_costs
            const margem_pct = contract_value > 0 ? (margem / contract_value) * 100 : 0
            return { id: o.id, name: o.name, status: o.status, contract_value, total_costs, margem, margem_pct }
        })
        .sort((a, b) => a.margem_pct - b.margem_pct) // worst first

    const totalContrato = rows.reduce((s, r) => s + r.contract_value, 0)
    const totalCustos = rows.reduce((s, r) => s + r.total_costs, 0)
    const totalMargem = totalContrato - totalCustos
    const totalMargemPct = totalContrato > 0 ? (totalMargem / totalContrato) * 100 : 0

    const handleExportPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(14)
        doc.text('Relatório de Rentabilidade por Obra', 14, 18)
        doc.setFontSize(9)
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')}`, 14, 25)

        autoTable(doc, {
            startY: 30,
            head: [['Obra', 'Estado', 'Valor Contrato', 'Custos Reais', 'Margem €', 'Margem %']],
            body: rows.map(r => [
                r.name,
                r.status,
                formatCurrency(r.contract_value),
                formatCurrency(r.total_costs),
                formatCurrency(r.margem),
                `${r.margem_pct.toFixed(1)}%`,
            ]),
            foot: [['TOTAL', '', formatCurrency(totalContrato), formatCurrency(totalCustos), formatCurrency(totalMargem), `${totalMargemPct.toFixed(1)}%`]],
            styles: { fontSize: 8 },
        })

        doc.save(`rentabilidade-${new Date().toISOString().slice(0, 10)}.pdf`)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-primary" /> Rentabilidade por Obra
                    </h2>
                    <p className="text-sm text-muted-foreground">Margem sobre vendas (valor contrato vs custos reais)</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-2" /> Exportar PDF
                </Button>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Contratado', value: formatCurrency(totalContrato), color: 'text-foreground' },
                    { label: 'Total Custos', value: formatCurrency(totalCustos), color: 'text-amber-600' },
                    { label: 'Margem Total', value: formatCurrency(totalMargem), color: totalMargem >= 0 ? 'text-emerald-600' : 'text-red-600' },
                    { label: 'Margem Média', value: `${totalMargemPct.toFixed(1)}%`, color: totalMargemPct >= 0 ? 'text-emerald-600' : 'text-red-600' },
                ].map(kpi => (
                    <Card key={kpi.label}>
                        <CardContent className="pt-5">
                            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Obra</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Contrato</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Custos</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Margem €</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Margem %</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {rows.map(r => {
                                        const sem = getSemaforo(r.margem_pct)
                                        return (
                                            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3 font-medium">{r.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs">{r.status}</td>
                                                <td className="px-4 py-3 text-right">{formatCurrency(r.contract_value)}</td>
                                                <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(r.total_costs)}</td>
                                                <td className={`px-4 py-3 text-right font-semibold ${r.margem >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {r.margem >= 0 ? <TrendingUp className="h-3 w-3 inline mr-1" /> : <TrendingDown className="h-3 w-3 inline mr-1" />}
                                                    {formatCurrency(r.margem)}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold ${r.margem_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {r.margem_pct.toFixed(1)}%
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={sem.variant} className="text-[10px]">{sem.label}</Badge>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 bg-muted/30 font-semibold">
                                        <td colSpan={2} className="px-4 py-3">TOTAL</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(totalContrato)}</td>
                                        <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(totalCustos)}</td>
                                        <td className={`px-4 py-3 text-right ${totalMargem >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(totalMargem)}</td>
                                        <td className={`px-4 py-3 text-right ${totalMargemPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{totalMargemPct.toFixed(1)}%</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
