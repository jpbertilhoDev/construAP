import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuditLog } from '../hooks/useFracoes'
import { Loader2 } from 'lucide-react'

const actionLabel: Record<string, string> = {
    INSERT: 'Criado',
    UPDATE: 'Alterado',
    DELETE: 'Eliminado',
}
const actionVariant: Record<string, 'success' | 'default' | 'destructive'> = {
    INSERT: 'success',
    UPDATE: 'default',
    DELETE: 'destructive',
}
const tableLabel: Record<string, string> = {
    empreendimentos: 'Empreendimento',
    fracoes: 'Fração',
    blocos: 'Bloco',
    tipologias: 'Tipologia',
    reservas: 'Reserva',
    fracao_preco_historico: 'Preço',
    imob_documentos: 'Documento',
}

export function AuditoriaTab({ empreendimentoId }: { empreendimentoId: string }) {
    const { data: entries = [], isLoading } = useAuditLog(empreendimentoId)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Auditoria</CardTitle>
                <CardDescription>Registo de todas as ações neste empreendimento (últimas 200)</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : entries.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Nenhum registo de auditoria.</div>
                ) : (
                    <div className="divide-y max-h-[500px] overflow-y-auto">
                        {entries.map((e) => (
                            <div key={e.id} className="py-3 flex items-start gap-3 text-sm">
                                <Badge variant={actionVariant[e.action] ?? 'default'} className="shrink-0 mt-0.5">
                                    {actionLabel[e.action] ?? e.action}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">{tableLabel[e.table_name] ?? e.table_name}</span>
                                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">{e.record_id}</span>
                                    </div>
                                    {e.new_value && (
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                            {JSON.stringify(e.new_value).slice(0, 120)}
                                        </p>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">{formatDate(e.changed_at)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
