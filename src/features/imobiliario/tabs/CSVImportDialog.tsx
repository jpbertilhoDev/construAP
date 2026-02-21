import { useState, useRef } from 'react'
import { Upload, Download, FileWarning, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useImportFracoesCSV } from '../hooks/useFracoes'
import type { Tipologia } from '@/services/fracoes'

// CSV template columns: designacao,tipologia_tipo,piso,area_util_m2,preco_atual,orientacao,notas

function parseCSV(text: string) {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    return lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((h, i) => { row[h] = vals[i] || '' })
        return {
            designacao: row['designacao'] || row['ref'] || '',
            tipologia_tipo: row['tipologia_tipo'] || row['tipologia'] || '',
            piso: row['piso'] ? parseInt(row['piso']) : undefined,
            area_util_m2: row['area_util_m2'] || row['area'] ? parseFloat(row['area_util_m2'] || row['area']) : undefined,
            preco_atual: parseFloat(row['preco_atual'] || row['preco'] || '0'),
            orientation: row['orientacao'] || row['orientation'] || undefined,
            notes: row['notas'] || row['notes'] || undefined,
        }
    })
}

function downloadTemplate() {
    const csv = 'designacao,tipologia_tipo,piso,area_util_m2,preco_atual,orientacao,notas\nA.01,T2,1,85,250000,Sul,\nA.02,T3,2,110,320000,Norte,Vista mar'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'template_fracoes.csv'; a.click()
    URL.revokeObjectURL(url)
}

export function CSVImportDialog({ open, onClose, empreendimentoId, tipologias }: {
    open: boolean; onClose: () => void; empreendimentoId: string; tipologias: Tipologia[]
}) {
    const importMutation = useImportFracoesCSV(empreendimentoId)
    const inputRef = useRef<HTMLInputElement>(null)
    const [result, setResult] = useState<{ created: number; errors: { row: number; msg: string }[] } | null>(null)

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const text = await file.text()
        const rows = parseCSV(text)
        const res = await importMutation.mutateAsync({ rows, tipologias })
        setResult(res)
    }

    const handleClose = () => { setResult(null); onClose() }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader><DialogTitle>Importar Frações via CSV</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                    {!result ? (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Faz download do template, preenche e carrega o ficheiro CSV.
                                Máx. 500 frações por ficheiro.
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
                                    <Download className="h-4 w-4" /> Descarregar Template
                                </Button>
                                <Button size="sm" className="gap-1.5" disabled={importMutation.isPending}
                                    onClick={() => inputRef.current?.click()}>
                                    {importMutation.isPending
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Upload className="h-4 w-4" />}
                                    Carregar CSV
                                </Button>
                                <input ref={inputRef} type="file" accept=".csv" className="sr-only"
                                    onChange={(e) => void handleFile(e)} />
                            </div>
                            <div className="rounded-md border bg-muted/30 p-3 text-xs font-mono text-muted-foreground">
                                designacao, tipologia_tipo, piso, area_util_m2, preco_atual, orientacao, notas
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">{result.created} frações importadas com sucesso</span>
                            </div>
                            {result.errors.length > 0 && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-destructive text-sm font-medium">
                                        <FileWarning className="h-4 w-4" />
                                        <span>{result.errors.length} erros</span>
                                    </div>
                                    <div className="max-h-36 overflow-y-auto rounded border divide-y text-xs">
                                        {result.errors.map((e, i) => (
                                            <div key={i} className="px-3 py-1.5">
                                                <span className="font-medium">Linha {e.row}:</span> {e.msg}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <Button className="w-full" onClick={handleClose}>Fechar</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
