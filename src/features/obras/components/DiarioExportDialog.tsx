import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { fetchDiarioEntriesByDateRange } from '@/services/diario'
import { exportDiarioPdf } from '../utils/diarioExportPdf'

interface DiarioExportDialogProps {
    obraId: string
    obraName: string
}

export function DiarioExportDialog({ obraId, obraName }: DiarioExportDialogProps) {
    const [open, setOpen] = useState(false)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        if (!startDate || !endDate) {
            toast.error('Selecione as datas de início e fim.')
            return
        }
        if (startDate > endDate) {
            toast.error('A data de início deve ser anterior à data de fim.')
            return
        }

        setIsExporting(true)
        try {
            const entries = await fetchDiarioEntriesByDateRange(obraId, startDate, endDate)
            if (entries.length === 0) {
                toast.error('Nenhuma entrada encontrada no período selecionado.')
                return
            }
            await exportDiarioPdf(entries, obraName, { start: startDate, end: endDate })
            toast.success('PDF exportado com sucesso!')
            setOpen(false)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao exportar PDF.')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-1.5" />
                    Exportar PDF
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Exportar Diário de Obra</DialogTitle>
                    <DialogDescription>
                        Selecione o intervalo de datas para gerar o PDF.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Data Início</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value)
                                }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Data Fim</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value)
                                }}
                            />
                        </div>
                    </div>
                    <Button
                        className="w-full"
                        disabled={isExporting || !startDate || !endDate}
                        onClick={() => void handleExport()}
                    >
                        {isExporting ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                A gerar PDF...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <FileDown className="h-4 w-4" />
                                Gerar PDF
                            </span>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
