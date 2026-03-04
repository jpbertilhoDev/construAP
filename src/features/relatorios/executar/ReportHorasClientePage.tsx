// @ts-nocheck
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, Download, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchTimesheetsDetailed() {
    const profile = await getProfile()

    const { data, error } = await supabase
        .from('timesheets')
        .select(`
            id, total_hours, date, estado,
            employees(name, hourly_rate),
            obras(name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .in('estado', ['Aprovado'])
        .order('date', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportHorasClientePage() {
    const { data: timesheets = [], isLoading } = useQuery({
        queryKey: ['report-horas-cliente'],
        queryFn: fetchTimesheetsDetailed,
        staleTime: 60_000,
    })

    // Group by obra + employee
    const grouped = useMemo(() => {
        const map: Record<string, {
            obraName: string
            employeeName: string
            hourly_rate: number
            totalHours: number
        }> = {}

        for (const ts of timesheets) {
            const obraName = ts.obras?.name ?? 'Sem obra'
            const empName = ts.employees?.name ?? 'Desconhecido'
            const key = `${obraName}|||${empName}`

            if (!map[key]) {
                map[key] = {
                    obraName,
                    employeeName: empName,
                    hourly_rate: ts.employees?.hourly_rate ?? 0,
                    totalHours: 0,
                }
            }
            map[key].totalHours += ts.total_hours ?? 0
        }

        return Object.values(map)
            .map(r => ({ ...r, totalValue: r.totalHours * r.hourly_rate }))
            .sort((a, b) => b.totalHours - a.totalHours)
    }, [timesheets])

    // Group by obra for obra-level totals
    const byObra = useMemo(() => {
        const map: Record<string, { totalHours: number; totalValue: number; employees: typeof grouped }> = {}
        for (const r of grouped) {
            if (!map[r.obraName]) map[r.obraName] = { totalHours: 0, totalValue: 0, employees: [] }
            map[r.obraName].totalHours += r.totalHours
            map[r.obraName].totalValue += r.totalValue
            map[r.obraName].employees.push(r)
        }
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    }, [grouped])

    const totalHorasGeral = grouped.reduce((s, r) => s + r.totalHours, 0)
    const totalValorGeral = grouped.reduce((s, r) => s + r.totalValue, 0)

    const handleExportPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(14)
        doc.text('Relatório de Horas por Obra', 14, 18)
        doc.setFontSize(9)
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')}`, 14, 25)

        const rows: string[][] = []
        for (const [obraName, obra] of byObra) {
            for (const emp of obra.employees) {
                rows.push([obraName, emp.employeeName, `${emp.totalHours.toFixed(1)}h`, formatCurrency(emp.hourly_rate) + '/h', formatCurrency(emp.totalValue)])
            }
            rows.push([`TOTAL — ${obraName}`, '', `${obra.totalHours.toFixed(1)}h`, '', formatCurrency(obra.totalValue)])
        }

        autoTable(doc, {
            startY: 30,
            head: [['Obra', 'Funcionário', 'Total Horas', 'Custo/h', 'Total €']],
            body: rows,
            styles: { fontSize: 8 },
        })
        doc.save(`horas-obra-${new Date().toISOString().slice(0, 10)}.pdf`)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" /> Horas por Obra
                    </h2>
                    <p className="text-sm text-muted-foreground">Apontamentos aprovados — para faturação a clientes</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-2" /> Exportar PDF
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="pt-5">
                        <p className="text-xl font-bold">{totalHorasGeral.toFixed(1)}h</p>
                        <p className="text-xs text-muted-foreground mt-1">Total horas aprovadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <p className="text-xl font-bold text-primary">{formatCurrency(totalValorGeral)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Custo total de mão-de-obra</p>
                    </CardContent>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : byObra.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Sem apontamentos aprovados registados.</p>
            ) : (
                <div className="space-y-4">
                    {byObra.map(([obraName, obra]) => (
                        <Card key={obraName}>
                            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/40">
                                <p className="font-semibold text-sm">{obraName}</p>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-muted-foreground font-medium">{obra.totalHours.toFixed(1)}h</span>
                                    <span className="font-bold text-primary">{formatCurrency(obra.totalValue)}</span>
                                </div>
                            </div>
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <tbody className="divide-y">
                                        {obra.employees.map(emp => (
                                            <tr key={emp.employeeName} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-5 py-2.5 text-muted-foreground">{emp.employeeName}</td>
                                                <td className="px-5 py-2.5 text-right">{emp.totalHours.toFixed(1)}h</td>
                                                <td className="px-5 py-2.5 text-right text-muted-foreground text-xs">{formatCurrency(emp.hourly_rate)}/h</td>
                                                <td className="px-5 py-2.5 text-right font-medium">{formatCurrency(emp.totalValue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
