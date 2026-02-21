import { formatCurrency } from '@/lib/utils'
import type { Fracao } from '@/services/fracoes'

export function exportFracoesCSV(fracoes: Fracao[], filename = 'fracoes.csv') {
    const headers = ['Designação', 'Tipologia', 'Bloco', 'Piso', 'Área Útil (m²)', 'Estado', 'Preço (€)', 'Orientação', 'Notas']
    const rows = fracoes.map(f => [
        f.designacao || f.ref,
        f.tipologias?.designacao || f.tipologias?.tipo || f.type || '',
        f.blocos?.nome || '',
        f.piso ?? f.floor ?? '',
        f.area_util_m2 ?? f.area_m2 ?? '',
        f.estado_comercial,
        f.preco_atual ?? f.sale_price ?? 0,
        f.orientation || '',
        f.notes || '',
    ])
    const csvContent = [headers, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
}

export async function exportFracoesPDF(fracoes: Fracao[], empreendimentoNome: string) {
    // Dynamic import so jsPDF only loads when needed
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    const today = new Date().toLocaleDateString('pt-PT')

    doc.setFontSize(14)
    doc.text(`Relatório de Disponibilidade — ${empreendimentoNome}`, 14, 15)
    doc.setFontSize(9)
    doc.text(`Gerado em: ${today}`, 14, 22)

    const total = fracoes.length
    const disponiveis = fracoes.filter(f => f.estado_comercial === 'Disponível').length
    const reservados = fracoes.filter(f => f.estado_comercial === 'Reservado').length
    const vendidos = fracoes.filter(f => f.estado_comercial === 'Vendido').length

    doc.text(`Total: ${total} | Disponíveis: ${disponiveis} | Reservadas: ${reservados} | Vendidas: ${vendidos}`, 14, 28)

    autoTable(doc, {
        startY: 33,
        head: [['Designação', 'Tipologia', 'Piso', 'Área (m²)', 'Estado', 'Preço']],
        body: fracoes.map(f => [
            f.designacao || f.ref,
            f.tipologias?.designacao || f.tipologias?.tipo || '',
            f.piso ?? f.floor ?? '—',
            f.area_util_m2 ?? f.area_m2 ?? '—',
            f.estado_comercial,
            formatCurrency(f.preco_atual ?? f.sale_price ?? 0),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] },
    })

    doc.save(`disponibilidade_${empreendimentoNome.toLowerCase().replace(/\s+/g, '_')}_${today.replace(/\//g, '-')}.pdf`)
}
