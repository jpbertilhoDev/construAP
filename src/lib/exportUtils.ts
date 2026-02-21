import { formatDate } from './utils'

export interface CSVColumn {
    key: string
    label: string
}

export function exportToCSV(data: any[], filename: string, columns: CSVColumn[]) {
    if (!data || data.length === 0) return

    // Create header row
    const headers = columns.map(col => `"${col.label}"`).join(',')

    // Create data rows
    const rows = data.map(item => {
        return columns.map(col => {
            const val = item[col.key]

            // Handle null/undefined
            if (val === null || val === undefined) return '""'

            // Format dates simply by checking if it looks like an ISO string
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                return `"${formatDate(val)}"`
            }

            // Format numbers for Portuguese locale (comma as decimal separator in Excel)
            // But we have to be careful as some CSV readers prefer dots or depend on system settings.
            // Using standard representation, maybe users expect raw numbers or formatted ones.
            if (typeof val === 'number') {
                // If it's a currency or big number, pt-PT usually prefers , for decimal
                // We'll keep it standard to avoid corrupting data, but maybe format strings
                return `"${val}"`
            }

            // Escape quotes inside string
            const stringVal = String(val).replace(/"/g, '""')
            return `"${stringVal}"`
        }).join(',')
    })

    const csvContent = [headers, ...rows].join('\n')

    // Add BOM for Excel UTF-8 reading
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

export function exportToPDF() {
    // Basic implementation for V1 without external heavy deps.
    // In V2, jspdf can be integrated for full layout control.
    alert('Na versão V1, a exportação PDF utiliza o serviço de impressão do browser. Por favor, escolha a opção "Guardar como PDF" no destino.')
    window.print()
}
