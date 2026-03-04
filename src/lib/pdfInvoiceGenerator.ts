import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'

export interface InvoiceItem {
    description: string
    quantity: number
    unitPrice: number
    taxRate: number // e.g. 23 for 23%
}

export interface InvoiceData {
    invoiceNumber: string
    date: Date
    dueDate: Date
    company: {
        name: string
        nif: string
        address: string
        postalCode: string
        city: string
    }
    client: {
        name: string
        nif?: string
        address?: string
        postalCode?: string
        city?: string
    }
    obraTitle?: string
    items: InvoiceItem[]
}

// Ensure autotable type extension exists
declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable: {
            finalY: number
        }
    }
}

export function generateInvoicePDF(data: InvoiceData) {
    const doc = new jsPDF()
    const { company, client, items } = data

    // Calculate totals
    const calcSubtotal = (i: InvoiceItem) => i.quantity * i.unitPrice
    const calcTax = (i: InvoiceItem) => calcSubtotal(i) * (i.taxRate / 100)

    let totalNet = 0
    let totalTax = 0
    const taxBreakdown: Record<number, number> = {}

    items.forEach(i => {
        const sub = calcSubtotal(i)
        const tax = calcTax(i)
        totalNet += sub
        totalTax += tax

        if (!taxBreakdown[i.taxRate]) taxBreakdown[i.taxRate] = 0
        taxBreakdown[i.taxRate] += tax
    })

    const totalGross = totalNet + totalTax

    // --- Header ---
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('FATURA/RECIBO', 140, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`N.º ${data.invoiceNumber}`, 140, 28)
    doc.text(`Data: ${formatDate(data.date.toISOString())}`, 140, 34)
    doc.text(`Vencimento: ${formatDate(data.dueDate.toISOString())}`, 140, 40)

    // --- Company Info (Issuer) ---
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(company.name, 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`NIF: ${company.nif}`, 14, 28)
    doc.text(company.address, 14, 34)
    doc.text(`${company.postalCode} ${company.city}`, 14, 40)

    // --- Client Info (Recipient) ---
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(14, 55, 100, 45, 2, 2, 'FD')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Faturado a:', 18, 62)
    doc.setFont('helvetica', 'normal')
    const startY = 68
    doc.text(client.name, 18, startY)
    if (client.nif) doc.text(`NIF: ${client.nif}`, 18, startY + 6)
    if (client.address) doc.text(client.address, 18, startY + 12)
    if (client.postalCode && client.city) doc.text(`${client.postalCode} ${client.city}`, 18, startY + 18)

    // --- Reference ---
    if (data.obraTitle) {
        doc.setFont('helvetica', 'bold')
        doc.text(`Ref: ${data.obraTitle}`, 14, 110)
    }

    // --- Items Table ---
    const tableData = items.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.unitPrice),
        `${item.taxRate}%`,
        formatCurrency(calcTax(item)),
        formatCurrency(calcSubtotal(item) + calcTax(item))
    ])

    // @ts-ignore
    doc.autoTable({
        startY: 115,
        head: [['Descrição', 'Qtd', 'Preço Unit.', 'IVA %', 'Valor IVA', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'center' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        }
    })

    const finalY = doc.lastAutoTable.finalY + 15

    // --- Tax Summary ---
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Quadro Resumo de Impostos:', 14, finalY)
    doc.setFont('helvetica', 'normal')

    let constTaxY = finalY + 6
    Object.entries(taxBreakdown).forEach(([rate, amount]) => {
        doc.text(`Taxa ${rate}%: ${formatCurrency(amount)}`, 14, constTaxY)
        constTaxY += 6
    })

    // --- Totals ---
    doc.setDrawColor(0)
    doc.setFillColor(245, 245, 245)
    doc.rect(130, finalY - 5, 65, 30, 'F')

    doc.text('Total Líquido:', 135, finalY + 2)
    doc.text(formatCurrency(totalNet), 190, finalY + 2, { align: 'right' })

    doc.text('Total IVA:', 135, finalY + 8)
    doc.text(formatCurrency(totalTax), 190, finalY + 8, { align: 'right' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Total a Pagar:', 135, finalY + 18)
    doc.text(formatCurrency(totalGross), 190, finalY + 18, { align: 'right' })

    // --- Footer / Disclaimer ---
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    const footerY = 280
    doc.text('Documento processado por programa de faturação (ConstruAP).', 105, footerY, { align: 'center' })
    doc.text('Este documento não serve de fatura com validade fiscal oficial AT, usar apenas para validação preliminar.', 105, footerY + 5, { align: 'center' })

    // Save and open
    const safeName = `Fatura_${data.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    doc.save(safeName)
}
