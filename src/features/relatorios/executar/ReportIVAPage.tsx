// @ts-nocheck
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Receipt, Download, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Types ─────────────────────────────────────────────────────────────────────

type CostRow = {
    created_at: string
    amount: number
    iva_rate: number | null
}

type IVAMonthGroup = {
    mes: string
    mesLabel: string
    baseIVA6: number
    baseIVA13: number
    baseIVA23: number
    ivaSuportado6: number
    ivaSuportado13: number
    ivaSuportado23: number
    totalBase: number
    totalIVA: number
}

async function fetchCostsForIVA(): Promise<CostRow[]> {
    const profile = await getProfile()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data, error } = await supabase
        .from('costs')
        .select('created_at, amount, iva_rate')
        .eq('tenant_id', profile.tenant_id)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as CostRow[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportIVAPage() {
    const { data: costs = [], isLoading } = useQuery({
        queryKey: ['report-iva-costs'],
        queryFn: fetchCostsForIVA,
        staleTime: 60_000,
    })

    const groups = useMemo<IVAMonthGroup[]>(() => {
        const map: Record<string, IVAMonthGroup> = {}

        for (const c of costs) {
            const d = new Date(c.created_at)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (!map[key]) {
                const label = d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
                map[key] = { mes: key, mesLabel: label, baseIVA6: 0, baseIVA13: 0, baseIVA23: 0, ivaSuportado6: 0, ivaSuportado13: 0, ivaSuportado23: 0, totalBase: 0, totalIVA: 0 }
            }
            const rate = c.iva_rate ?? 23
            const base = c.amount / (1 + rate / 100)
            const iva = c.amount - base

            map[key].totalBase += base
            map[key].totalIVA += iva

            if (rate === 6) { map[key].baseIVA6 += base; map[key].ivaSuportado6 += iva }
            else if (rate === 13) { map[key].baseIVA13 += base; map[key].ivaSuportado13 += iva }
            else { map[key].baseIVA23 += base; map[key].ivaSuportado23 += iva }
        }

        return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes))
    }, [costs])

    const totalIVA = groups.reduce((s, g) => s + g.totalIVA, 0)
    const totalBase = groups.reduce((s, g) => s + g.totalBase, 0)

    const handleExportPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(14)
        doc.text('Resumo IVA Mensal (últimos 6 meses)', 14, 18)
        doc.setFontSize(9)
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')}`, 14, 25)

        autoTable(doc, {
            startY: 30,
            head: [['Mês', 'Base IVA 6%', 'IVA 6%', 'Base IVA 23%', 'IVA 23%', 'Total Base', 'Total IVA']],
            body: groups.map(g => [
                g.mesLabel,
                formatCurrency(g.baseIVA6),
                formatCurrency(g.ivaSuportado6),
                formatCurrency(g.baseIVA23),
                formatCurrency(g.ivaSuportado23),
                formatCurrency(g.totalBase),
                formatCurrency(g.totalIVA),
            ]),
            foot: [['TOTAL', '', '', '', '', formatCurrency(totalBase), formatCurrency(totalIVA)]],
            styles: { fontSize: 8 },
        })

        doc.save(`iva-mensal-${new Date().toISOString().slice(0, 10)}.pdf`)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" /> Resumo IVA Mensal
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        IVA suportado em compras — últimos 6 meses. Preparação para declaração AT.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-2" /> Exportar PDF
                </Button>
            </div>

            <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 px-4 py-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                    Este relatório é um auxiliar de preparação fiscal. Para submissão oficial, utilize um TOC certificado.
                    Baseia-se nos campos de <strong>taxa de IVA</strong> registados nos custos.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="pt-5">
                        <p className="text-xl font-bold">{formatCurrency(totalBase)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Base tributável total (6 meses)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <p className="text-xl font-bold text-amber-600">{formatCurrency(totalIVA)}</p>
                        <p className="text-xs text-muted-foreground mt-1">IVA suportado total (6 meses)</p>
                    </CardContent>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : groups.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Sem custos registados nos últimos 6 meses.</p>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mês</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base 6%</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">IVA 6%</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base 13%</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">IVA 13%</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base 23%</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">IVA 23%</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground font-bold">Total IVA</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {groups.map(g => (
                                        <tr key={g.mes} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-medium capitalize">{g.mesLabel}</td>
                                            <td className="px-4 py-3 text-right text-xs">{formatCurrency(g.baseIVA6)}</td>
                                            <td className="px-4 py-3 text-right text-xs text-amber-600">{formatCurrency(g.ivaSuportado6)}</td>
                                            <td className="px-4 py-3 text-right text-xs">{formatCurrency(g.baseIVA13)}</td>
                                            <td className="px-4 py-3 text-right text-xs text-amber-600">{formatCurrency(g.ivaSuportado13)}</td>
                                            <td className="px-4 py-3 text-right text-xs">{formatCurrency(g.baseIVA23)}</td>
                                            <td className="px-4 py-3 text-right text-xs text-amber-600">{formatCurrency(g.ivaSuportado23)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-amber-700">{formatCurrency(g.totalIVA)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 bg-muted/30 font-semibold">
                                        <td className="px-4 py-3">TOTAL</td>
                                        <td colSpan={5} />
                                        <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(totalBase)}</td>
                                        <td className="px-4 py-3 text-right text-amber-700 font-bold">{formatCurrency(totalIVA)}</td>
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
