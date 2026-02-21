import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { exportToCSV, exportToPDF, type CSVColumn } from '@/lib/exportUtils'
import { useLogReportExport } from '../hooks/useRelatorios'

interface ReportDataTableProps {
    title: string
    reportId: string
    columns: { key: string; label: string; rightAlign?: boolean; render?: (val: any, row: any) => React.ReactNode }[]
    data: any[]
    filtersApplied?: Record<string, any>
    isLoading?: boolean
    csvColumns?: CSVColumn[]
    itemsPerPage?: number
}

export function ReportDataTable({
    title,
    reportId,
    columns,
    data,
    filtersApplied,
    isLoading,
    csvColumns,
    itemsPerPage = 15
}: ReportDataTableProps) {
    const [currentPage, setCurrentPage] = useState(1)
    const { mutate: logExport } = useLogReportExport()

    const totalPages = Math.ceil((data?.length || 0) / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentData = data?.slice(startIndex, startIndex + itemsPerPage) || []

    const handleExportCSV = () => {
        if (!data || data.length === 0) return
        exportToCSV(data, reportId, csvColumns || columns.map(c => ({ key: c.key, label: c.label })))
        logExport({ reportName: reportId, format: 'CSV', filters: filtersApplied })
    }

    const handleExportPDF = () => {
        exportToPDF()
        logExport({ reportName: reportId, format: 'PDF', filters: filtersApplied })
    }

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <h3 className="font-semibold text-card-foreground">{title}</h3>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading || data.length === 0}>
                        <Download className="h-4 w-4 mr-1.5" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isLoading || data.length === 0}>
                        <FileText className="h-4 w-4 mr-1.5" /> PDF
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto print-friendly">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            {columns.map((col) => (
                                <TableHead key={col.key} className={col.rightAlign ? 'text-right' : ''}>
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        A processar dados...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    Nenhum dado encontrado para os filtros selecionados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentData.map((row, i) => (
                                <TableRow key={i}>
                                    {columns.map((col) => {
                                        const cellVal = row[col.key]
                                        return (
                                            <TableCell key={col.key} className={col.rightAlign ? 'text-right' : ''}>
                                                {col.render ? col.render(cellVal, row) : cellVal}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {!isLoading && totalPages > 1 && (
                <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Mostrando {startIndex + 1} até {Math.min(startIndex + itemsPerPage, data.length)} de {data.length} registos
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-xs font-medium px-2">
                            Página {currentPage} de {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Minimal print styles injected locally */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    nav, header, aside, .print-hidden, [role="navigation"] { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; }
                    .bg-card { border: none !important; box-shadow: none !important; }
                }
            `}} />
        </div>
    )
}
