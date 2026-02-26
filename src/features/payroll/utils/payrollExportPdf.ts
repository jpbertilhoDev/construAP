import type { PayrollRun, PayrollLine } from '@/services/payroll'
import { formatCurrency } from '@/lib/utils'

function getLastTableY(doc: unknown, fallback: number): number {
    const d = doc as Record<string, unknown>
    const lt = d.lastAutoTable as { finalY?: number } | undefined
    return lt?.finalY ? lt.finalY + 3 : fallback
}

const MONTH_NAMES = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ── Summary PDF ────────────────────────────────────────────────

export async function exportPayrollSummaryPdf(
    run: PayrollRun,
    lines: PayrollLine[],
) {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const today = new Date().toLocaleDateString('pt-PT')
    let y = 15

    // ── Header ──────────────────────────────────────────────
    doc.setFontSize(16)
    doc.setFont(undefined as never, 'bold')
    doc.text('Resumo Processamento Salarial', 14, y)
    y += 8

    doc.setFont(undefined as never, 'normal')
    doc.setFontSize(11)
    doc.text(
        `Período: ${MONTH_NAMES[run.periodo_mes]} ${String(run.periodo_ano)}`,
        14,
        y,
    )
    y += 6

    doc.setFontSize(9)
    doc.text(
        `Estado: ${run.status}  |  Funcionários: ${String(run.num_funcionarios)}  |  Gerado em: ${today}`,
        14,
        y,
    )
    y += 6

    const extras: string[] = []
    if (run.inclui_sub_ferias) extras.push('Subsídio de Férias')
    if (run.inclui_sub_natal) extras.push('Subsídio de Natal')
    if (extras.length > 0) {
        doc.setFontSize(9)
        doc.text(`Inclui: ${extras.join(', ')}`, 14, y)
        y += 6
    }

    doc.setDrawColor(200)
    doc.line(14, y, 196, y)
    y += 8

    // ── Summary KPIs ────────────────────────────────────────
    doc.setFontSize(10)
    doc.setFont(undefined as never, 'bold')
    doc.text('Resumo Global', 14, y)
    y += 6
    doc.setFont(undefined as never, 'normal')

    autoTable(doc, {
        startY: y,
        head: [['Indicador', 'Valor']],
        body: [
            ['Total Bruto', formatCurrency(run.total_bruto)],
            ['SS Entidade (23,75%)', formatCurrency(run.total_ss_entidade)],
            ['SS Trabalhador (11%)', formatCurrency(run.total_ss_trabalhador)],
            ['IRS', formatCurrency(run.total_irs)],
            ['Sub. Alimentação', formatCurrency(run.total_subsidio_alimentacao)],
            ['Total Líquido', formatCurrency(run.total_liquido)],
        ],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
        tableWidth: 100,
        margin: { left: 14 },
    })
    y = getLastTableY(doc, y + 50)
    y += 6

    // ── Main table ──────────────────────────────────────────
    doc.setFontSize(10)
    doc.setFont(undefined as never, 'bold')
    doc.text('Detalhe por Funcionário', 14, y)
    y += 5
    doc.setFont(undefined as never, 'normal')

    const tableHead = [
        [
            'Funcionário', 'Função', 'Dias', 'Horas', 'Base', 'Extra',
            'Sub.Alim', 'Sub.Férias', 'Sub.Natal', 'Bruto', 'SS', 'IRS', 'Líquido',
        ],
    ]

    const tableBody = lines.map((l) => [
        l.employees?.nome ?? '—',
        l.employees?.employee_roles?.nome ?? '—',
        String(l.dias_trabalhados),
        String(l.horas_normais),
        formatCurrency(l.salario_base),
        formatCurrency(l.valor_horas_extra),
        formatCurrency(l.subsidio_alimentacao),
        formatCurrency(l.subsidio_ferias),
        formatCurrency(l.subsidio_natal),
        formatCurrency(l.total_bruto),
        formatCurrency(l.desconto_ss),
        formatCurrency(l.desconto_irs),
        formatCurrency(l.total_liquido),
    ])

    // Totals footer row
    const totals = lines.reduce(
        (acc, l) => ({
            dias: acc.dias + l.dias_trabalhados,
            horas: acc.horas + l.horas_normais,
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

    const footerRow = [
        'TOTAL', '', String(totals.dias), String(totals.horas),
        formatCurrency(totals.base), formatCurrency(totals.extra),
        formatCurrency(totals.subAlim), formatCurrency(totals.subFerias),
        formatCurrency(totals.subNatal), formatCurrency(totals.bruto),
        formatCurrency(totals.ss), formatCurrency(totals.irs),
        formatCurrency(totals.liquido),
    ]

    tableBody.push(footerRow)

    autoTable(doc, {
        startY: y,
        head: tableHead,
        body: tableBody,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59], fontSize: 7 },
        margin: { left: 14, right: 14 },
        didParseCell(data: { row: { index: number }; cell: { styles: { fontStyle: string } } }) {
            // Bold the footer row
            if (data.row.index === tableBody.length - 1) {
                data.cell.styles.fontStyle = 'bold'
            }
        },
    })

    // ── Save ────────────────────────────────────────────────
    const mm = String(run.periodo_mes).padStart(2, '0')
    doc.save(`salarios_resumo_${String(run.periodo_ano)}_${mm}.pdf`)
}

// ── Payslips PDF (one page per employee) ───────────────────────

export async function exportPayrollPayslipsPdf(
    run: PayrollRun,
    lines: PayrollLine[],
) {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const periodo = `${MONTH_NAMES[run.periodo_mes]} ${String(run.periodo_ano)}`

    lines.forEach((line, index) => {
        if (index > 0) doc.addPage()

        let y = 15

        // ── Header ──────────────────────────────────────────
        doc.setFontSize(14)
        doc.setFont(undefined as never, 'bold')
        doc.text('Recibo de Vencimento', 14, y)
        y += 8

        doc.setFont(undefined as never, 'normal')
        doc.setFontSize(10)
        doc.text(`Período: ${periodo}`, 14, y)
        y += 8

        // ── Employee info ───────────────────────────────────
        doc.setFontSize(9)
        const emp = line.employees
        const nome = emp?.nome ?? '—'
        const nif = emp?.nif ?? '—'
        const niss = emp?.niss ?? '—'
        const iban = emp?.iban ?? '—'
        const funcao = emp?.employee_roles?.nome ?? '—'

        doc.setFont(undefined as never, 'bold')
        doc.text('Dados do Funcionário', 14, y)
        y += 5
        doc.setFont(undefined as never, 'normal')

        doc.text(`Nome: ${nome}`, 14, y)
        y += 4.5
        doc.text(`NIF: ${nif}`, 14, y)
        y += 4.5
        doc.text(`NISS: ${niss}`, 14, y)
        y += 4.5
        doc.text(`IBAN: ${iban}`, 14, y)
        y += 4.5
        doc.text(`Função: ${funcao}`, 14, y)
        y += 7

        doc.setDrawColor(200)
        doc.line(14, y, 196, y)
        y += 6

        // ── Abonos table (earnings) ────────────────────────
        doc.setFontSize(10)
        doc.setFont(undefined as never, 'bold')
        doc.text('Abonos', 14, y)
        y += 5
        doc.setFont(undefined as never, 'normal')

        const abonosBody: string[][] = [
            ['Salário Base', formatCurrency(line.salario_base)],
        ]
        if (line.valor_horas_extra > 0) {
            abonosBody.push([
                `Horas Extra (${String(line.horas_extra)}h)`,
                formatCurrency(line.valor_horas_extra),
            ])
        }
        abonosBody.push(['Subsídio de Alimentação', formatCurrency(line.subsidio_alimentacao)])
        if (line.subsidio_ferias > 0) {
            abonosBody.push(['Subsídio de Férias', formatCurrency(line.subsidio_ferias)])
        }
        if (line.subsidio_natal > 0) {
            abonosBody.push(['Subsídio de Natal', formatCurrency(line.subsidio_natal)])
        }

        autoTable(doc, {
            startY: y,
            head: [['Descrição', 'Valor']],
            body: abonosBody,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
            tableWidth: 120,
            margin: { left: 14 },
        })
        y = getLastTableY(doc, y + 30)
        y += 6

        // ── Descontos table (deductions) ────────────────────
        doc.setFontSize(10)
        doc.setFont(undefined as never, 'bold')
        doc.text('Descontos', 14, y)
        y += 5
        doc.setFont(undefined as never, 'normal')

        const irsLabel = line.irs_tabela
            ? `IRS (Tabela ${line.irs_tabela}${line.irs_taxa_marginal ? `, ${String(Math.round(line.irs_taxa_marginal * 100))}%` : ''})`
            : 'IRS'

        const descontosBody: string[][] = [
            ['Segurança Social (11%)', formatCurrency(line.desconto_ss)],
            [irsLabel, formatCurrency(line.desconto_irs)],
        ]

        autoTable(doc, {
            startY: y,
            head: [['Descrição', 'Valor']],
            body: descontosBody,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
            tableWidth: 120,
            margin: { left: 14 },
        })
        y = getLastTableY(doc, y + 20)
        y += 8

        // ── Totals section ──────────────────────────────────
        const totalDescontos = line.desconto_ss + line.desconto_irs

        doc.setFontSize(10)
        doc.setFont(undefined as never, 'bold')
        doc.text('Resumo', 14, y)
        y += 6

        doc.setFontSize(9)
        doc.setFont(undefined as never, 'normal')
        doc.text(`Total Bruto:`, 14, y)
        doc.text(formatCurrency(line.total_bruto), 90, y)
        y += 5

        doc.text(`Total Descontos:`, 14, y)
        doc.text(formatCurrency(totalDescontos), 90, y)
        y += 5

        doc.setFontSize(11)
        doc.setFont(undefined as never, 'bold')
        doc.text(`Total Líquido:`, 14, y)
        doc.text(formatCurrency(line.total_liquido), 90, y)
        y += 8

        // ── Custo Patronal ──────────────────────────────────
        doc.setFont(undefined as never, 'normal')
        doc.setFontSize(8)
        doc.text(
            `Custo Patronal — SS Entidade (23,75%): ${formatCurrency(line.ss_entidade)}`,
            14,
            y,
        )
        y += 10

        // ── Separator ───────────────────────────────────────
        doc.setDrawColor(180)
        doc.line(14, y, 196, y)
    })

    // ── Save ────────────────────────────────────────────────
    const mm = String(run.periodo_mes).padStart(2, '0')
    doc.save(`salarios_recibos_${String(run.periodo_ano)}_${mm}.pdf`)
}
