import { formatDate } from '@/lib/utils'
import type { DiarioEntry } from '@/services/diario'

function getLastTableY(doc: unknown, fallback: number): number {
    const d = doc as Record<string, unknown>
    const lt = d.lastAutoTable as { finalY?: number } | undefined
    return lt?.finalY ? lt.finalY + 3 : fallback
}

export async function exportDiarioPdf(
    entries: DiarioEntry[],
    obraName: string,
    dateRange: { start: string; end: string },
) {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const today = new Date().toLocaleDateString('pt-PT')
    let y = 15

    // ── Header ──────────────────────────────────────────────
    doc.setFontSize(16)
    doc.text('Diário de Obra', 14, y)
    y += 8

    doc.setFontSize(11)
    doc.text(`Obra: ${obraName}`, 14, y)
    y += 6
    doc.setFontSize(9)
    doc.text(
        `Período: ${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}  |  Gerado em: ${today}`,
        14,
        y,
    )
    y += 4

    // Summary line
    const totalDays = new Set(entries.map((e) => e.entry_date)).size
    const avgWorkers =
        entries.length > 0
            ? Math.round(entries.reduce((s, e) => s + e.resources_count, 0) / entries.length)
            : 0
    const totalIncidents = entries.reduce(
        (s, e) => s + (e.diario_incidents?.length ?? 0),
        0,
    )

    doc.setFontSize(8)
    doc.text(
        `Resumo: ${String(totalDays)} dias de trabalho  |  Média ${String(avgWorkers)} efetivos/dia  |  ${String(totalIncidents)} ocorrências`,
        14,
        y + 4,
    )
    y += 10

    doc.setDrawColor(200)
    doc.line(14, y, 196, y)
    y += 6

    // ── Each entry ──────────────────────────────────────────
    for (const entry of entries) {
        // Check page space
        if (y > 250) {
            doc.addPage()
            y = 15
        }

        // Date header
        doc.setFontSize(11)
        doc.setFont(undefined as never, 'bold')
        doc.text(`${formatDate(entry.entry_date)} — ${entry.work_shift}`, 14, y)
        y += 5

        doc.setFont(undefined as never, 'normal')
        doc.setFontSize(8)

        // Weather + Temp + Progress
        const tempStr =
            entry.temp_min != null || entry.temp_max != null
                ? `${entry.temp_min != null ? String(entry.temp_min) : '—'}°C / ${entry.temp_max != null ? String(entry.temp_max) : '—'}°C`
                : ''
        const weatherLine = [
            entry.weather || 'N/D',
            tempStr,
            `Progresso: ${String(entry.progress_pct)}%`,
        ]
            .filter(Boolean)
            .join('  |  ')
        doc.text(weatherLine, 14, y)
        y += 5

        // Workers table
        const workerEntries = Object.entries(entry.workers_by_category).filter(
            ([, v]) => v > 0,
        )

        if (workerEntries.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['Categoria', 'Nº']],
                body: workerEntries.map(([cat, count]) => [cat, String(count)]),
                styles: { fontSize: 7, cellPadding: 1.5 },
                headStyles: { fillColor: [30, 41, 59], fontSize: 7 },
                tableWidth: 80,
                margin: { left: 14 },
            })
            y = getLastTableY(doc, y + 15)
        } else if (entry.resources_count > 0) {
            doc.text(`Efetivos: ${String(entry.resources_count)}`, 14, y)
            y += 4
        }

        // Equipment table
        const eqList = entry.equipment_used
        if (eqList.length > 0) {
            if (y > 260) {
                doc.addPage()
                y = 15
            }
            autoTable(doc, {
                startY: y,
                head: [['Equipamento', 'Horas']],
                body: eqList.map((eq) => [eq.name, String(eq.hours)]),
                styles: { fontSize: 7, cellPadding: 1.5 },
                headStyles: { fillColor: [30, 41, 59], fontSize: 7 },
                tableWidth: 80,
                margin: { left: 14 },
            })
            y = getLastTableY(doc, y + 15)
        }

        // Activities
        const acts = entry.structured_activities
        if (acts.length > 0) {
            doc.setFontSize(8)
            doc.setFont(undefined as never, 'bold')
            doc.text('Atividades:', 14, y)
            y += 4
            doc.setFont(undefined as never, 'normal')
            for (const a of acts) {
                if (y > 275) {
                    doc.addPage()
                    y = 15
                }
                const line = a.chapter
                    ? `• ${a.description} (${a.chapter})`
                    : `• ${a.description}`
                doc.text(line, 16, y)
                y += 3.5
            }
            y += 1
        } else if (entry.activities) {
            doc.setFontSize(8)
            doc.setFont(undefined as never, 'bold')
            doc.text('Atividades:', 14, y)
            y += 4
            doc.setFont(undefined as never, 'normal')
            const lines = doc.splitTextToSize(entry.activities, 170) as string[]
            doc.text(lines, 16, y)
            y += lines.length * 3.5 + 1
        }

        // Incidents
        const incidents = entry.diario_incidents ?? []
        if (incidents.length > 0) {
            if (y > 270) {
                doc.addPage()
                y = 15
            }
            doc.setFont(undefined as never, 'bold')
            doc.text('Ocorrências:', 14, y)
            y += 4
            doc.setFont(undefined as never, 'normal')
            for (const inc of incidents) {
                if (y > 275) {
                    doc.addPage()
                    y = 15
                }
                doc.text(`[${inc.severity}] ${inc.description}`, 16, y)
                y += 3.5
            }
            y += 1
        }

        // Notes
        if (entry.notes) {
            if (y > 270) {
                doc.addPage()
                y = 15
            }
            doc.setFontSize(8)
            doc.setFont(undefined as never, 'italic')
            const noteLines = doc.splitTextToSize(`Notas: ${entry.notes}`, 170) as string[]
            doc.text(noteLines, 14, y)
            y += noteLines.length * 3.5
            doc.setFont(undefined as never, 'normal')
        }

        // Separator
        y += 3
        doc.setDrawColor(220)
        doc.line(14, y, 196, y)
        y += 6
    }

    // ── Save ────────────────────────────────────────────────
    const safeName = obraName.toLowerCase().replace(/\s+/g, '_').substring(0, 30)
    doc.save(`diario_${safeName}_${dateRange.start}_${dateRange.end}.pdf`)
}
