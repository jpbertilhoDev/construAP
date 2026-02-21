import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTimesheets, useApproveTimesheet, useRejectTimesheet } from './hooks/useEmployees'
import { formatDate } from '@/lib/utils'

export function AprovacoesPage() {
    const { data: pendentes = [], isLoading } = useTimesheets({ estado: 'Submetido' })
    const approveMutation = useApproveTimesheet()
    const rejectMutation = useRejectTimesheet()

    const [rejectId, setRejectId] = useState<string | null>(null)
    const [motivo, setMotivo] = useState('')

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Aprovações de Apontamentos</h1>
                <p className="text-muted-foreground text-sm">
                    {pendentes.length} apontamento{pendentes.length !== 1 ? 's' : ''} aguarda{pendentes.length === 1 ? '' : 'm'} aprovação
                </p>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pendentes de Aprovação</CardTitle>
                    <CardDescription>Ao aprovar, o custo de mão de obra é gerado automaticamente no Financeiro da obra.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : pendentes.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10 text-sm flex flex-col items-center gap-2">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                            Nenhum apontamento pendente. Tudo em dia!
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Funcionário</TableHead>
                                    <TableHead>Obra</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Horas / Presença</TableHead>
                                    <TableHead>Observação</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendentes.map(ts => (
                                    <TableRow key={ts.id}>
                                        <TableCell className="font-medium">{ts.employees?.nome ?? '—'}</TableCell>
                                        <TableCell className="text-muted-foreground">{ts.obras?.name ?? ts.obra_id.substring(0, 8)}</TableCell>
                                        <TableCell>{formatDate(ts.data)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{ts.horas ? `${ts.horas}h` : 'Dia completo'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                                            {ts.observacao ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    size="sm"
                                                    className="gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700"
                                                    disabled={approveMutation.isPending}
                                                    onClick={() => void approveMutation.mutateAsync(ts.id)}
                                                >
                                                    {approveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                    Aprovar
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5 h-8 text-destructive border-destructive hover:bg-destructive/10"
                                                    onClick={() => setRejectId(ts.id)}
                                                >
                                                    <XCircle className="h-3.5 w-3.5" /> Rejeitar
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Reject dialog */}
            <Dialog open={!!rejectId} onOpenChange={o => { if (!o) { setRejectId(null); setMotivo('') } }}>
                <DialogContent className="sm:max-w-[380px]">
                    <DialogHeader><DialogTitle>Rejeitar Apontamento</DialogTitle></DialogHeader>
                    <div className="space-y-3 mt-2">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Motivo *</label>
                            <Input placeholder="Indique o motivo da rejeição..." value={motivo} onChange={e => setMotivo(e.target.value)} />
                        </div>
                        <Button
                            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={!motivo || rejectMutation.isPending}
                            onClick={() => {
                                if (rejectId && motivo) {
                                    void rejectMutation.mutateAsync({ id: rejectId, motivo }).then(() => {
                                        setRejectId(null)
                                        setMotivo('')
                                    })
                                }
                            }}
                        >
                            {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                            Confirmar Rejeição
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
