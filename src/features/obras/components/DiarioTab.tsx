import { useState, useEffect } from 'react'
import { Plus, Loader2, BookOpen, LayoutList, Clock, WifiOff, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, Camera, AlertTriangle } from 'lucide-react'
import { usePermissions } from '@/features/auth/usePermissions'
import {
    useDiarioEntries,
    useCreateDiarioEntry,
    useUpdateDiarioEntry,
    useDeleteDiarioEntry,
} from '../hooks/useDiario'
import { DiarioEntryForm } from './DiarioEntryForm'
import { DiarioTimeline } from './DiarioTimeline'
import { DiarioExportDialog } from './DiarioExportDialog'
import { formatDate } from '@/lib/utils'
import { offlineSync, type OfflineAction } from '@/lib/offlineSync'
import type { DiarioEntry } from '@/services/diario'

type ViewMode = 'timeline' | 'tabela'

export function DiarioTab({ obraId, obraName }: { obraId: string; obraName: string }) {
    const { hasPermission } = usePermissions()
    const canEdit = hasPermission('obras.manage')

    const { data: entries = [], isLoading, isError } = useDiarioEntries(obraId)
    const createMutation = useCreateDiarioEntry()
    const updateMutation = useUpdateDiarioEntry(obraId)
    const deleteMutation = useDeleteDiarioEntry(obraId)

    const [view, setView] = useState<ViewMode>('timeline')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<DiarioEntry | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([])

    // Sync offline queue checker
    useEffect(() => {
        const checkQueue = async () => {
            const queue = await offlineSync.getQueue()
            // filter for this obra
            const pending = queue.filter(q =>
                q.status === 'pending' &&
                q.type === 'SYNC_DIARIO_OBRA' &&
                (q.payload as any).obra_id === obraId
            )
            setOfflineQueue(pending)
        }

        checkQueue()
        window.addEventListener('online', checkQueue)

        // Polling as a fallback to detect queue changes
        const interval = setInterval(checkQueue, 5000)

        return () => {
            window.removeEventListener('online', checkQueue)
            clearInterval(interval)
        }
    }, [obraId])

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open)
        if (!open) setEditingEntry(null)
    }

    const handleEdit = (entry: DiarioEntry) => {
        setEditingEntry(entry)
        setIsDialogOpen(true)
    }

    const handleDelete = async () => {
        if (deleteId) {
            await deleteMutation.mutateAsync(deleteId)
            setDeleteId(null)
        }
    }

    if (isLoading) {
        return (
            <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="py-8 text-center text-destructive">
                Erro ao carregar entradas do diário.
            </div>
        )
    }

    return (
        <Card className="mt-4">
            <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                    <CardTitle className="text-lg">Diário de Obra</CardTitle>
                    <CardDescription>
                        {entries.length === 0
                            ? 'Registe os acontecimentos diários, clima, equipa e atividades.'
                            : `${String(entries.length)} entrada${entries.length !== 1 ? 's' : ''} registada${entries.length !== 1 ? 's' : ''}`}
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View toggle */}
                    <div className="flex rounded-md border overflow-hidden">
                        <button
                            className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${view === 'timeline'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background hover:bg-muted'
                                }`}
                            onClick={() => { setView('timeline') }}
                        >
                            <Clock className="h-3.5 w-3.5 inline mr-1" />
                            Timeline
                        </button>
                        <button
                            className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${view === 'tabela'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background hover:bg-muted'
                                }`}
                            onClick={() => { setView('tabela') }}
                        >
                            <LayoutList className="h-3.5 w-3.5 inline mr-1" />
                            Tabela
                        </button>
                    </div>

                    {/* Export PDF */}
                    <DiarioExportDialog obraId={obraId} obraName={obraName} />

                    {/* New entry */}
                    {canEdit && (
                        <Button
                            size="sm"
                            onClick={() => {
                                setEditingEntry(null)
                                setIsDialogOpen(true)
                            }}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Nova Entrada
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {/* Offline Warning Banner */}
                {offlineQueue.length > 0 && (
                    <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2 text-amber-800 dark:text-amber-400">
                            <WifiOff className="h-5 w-5 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold">Modo Offline ({offlineQueue.length} {offlineQueue.length === 1 ? 'registo pendente' : 'registos pendentes'})</p>
                                <p className="text-xs opacity-90">
                                    Os relatórios que fez sem internet não foram enviados. Serão sincronizados automaticamente pela aplicação assim que houver rede.
                                </p>
                            </div>
                        </div>
                        {navigator.onLine && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-400 bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200"
                                onClick={async () => {
                                    await offlineSync.syncAll()
                                    window.location.reload()
                                }}
                            >
                                <UploadCloud className="h-4 w-4 mr-2" /> Forçar Sincronização
                            </Button>
                        )}
                    </div>
                )}

                {entries.length === 0 && offlineQueue.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center border rounded-md bg-muted/20 border-dashed">
                        <BookOpen className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="font-medium">O Diário de Obra está vazio.</p>
                        <p className="text-muted-foreground text-sm max-w-sm mt-1">
                            Adicione o primeiro registo diário para manter o histórico da
                            execução.
                        </p>
                    </div>
                ) : view === 'timeline' ? (
                    <DiarioTimeline
                        entries={entries}
                        obraId={obraId}
                        canEdit={canEdit}
                        onEdit={handleEdit}
                        onDelete={setDeleteId}
                    />
                ) : (
                    <DiarioTableView
                        entries={entries}
                        canEdit={canEdit}
                        onEdit={handleEdit}
                        onDelete={setDeleteId}
                    />
                )}
            </CardContent>

            {/* ── Entry form dialog ──────────────────────────── */}
            <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingEntry ? 'Editar Entrada' : 'Registar no Diário'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingEntry
                                ? 'Edite os dados desta entrada.'
                                : 'Preencha os dados relevantes do dia de trabalho na obra.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DiarioEntryForm
                        obraId={obraId}
                        initialData={editingEntry || undefined}
                        onSuccess={() => {
                            handleOpenChange(false)
                        }}
                        onSubmit={async (payload) => {
                            if (editingEntry) {
                                return updateMutation.mutateAsync({
                                    id: editingEntry.id,
                                    payload: payload,
                                })
                            }
                            return createMutation.mutateAsync(
                                payload as Parameters<typeof createMutation.mutateAsync>[0],
                            )
                        }}
                        isPending={createMutation.isPending || updateMutation.isPending}
                    />
                </DialogContent>
            </Dialog>

            {/* ── Delete confirmation ────────────────────────── */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Entrada do Diário</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem a certeza que deseja eliminar esta entrada do Diário de Obra?
                            Esta ação não pode ser revertida.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void handleDelete()}
                        >
                            Eliminar Entrada
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}

// ── Legacy table view ───────────────────────────────────────

function DiarioTableView({
    entries,
    canEdit,
    onEdit,
    onDelete,
}: {
    entries: DiarioEntry[]
    canEdit: boolean
    onEdit: (entry: DiarioEntry) => void
    onDelete: (id: string) => void
}) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[110px]">Data</TableHead>
                        <TableHead className="w-[100px]">Turno</TableHead>
                        <TableHead className="w-[110px]">Clima</TableHead>
                        <TableHead className="text-center w-[80px]">Efetivos</TableHead>
                        <TableHead className="text-center w-[80px]">Progresso</TableHead>
                        <TableHead className="text-center w-[60px]">Anexos</TableHead>
                        <TableHead>Atividades</TableHead>
                        {canEdit && <TableHead className="w-[60px]" />}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.map((entry) => {
                        const totalWorkers = Object.keys(entry.workers_by_category).length > 0
                            ? Object.values(entry.workers_by_category).reduce(
                                (s, n) => s + n,
                                0,
                            )
                            : entry.resources_count

                        const activitySummary =
                            entry.structured_activities.length > 0
                                ? entry.structured_activities
                                    .map((a) => a.description)
                                    .join('; ')
                                : entry.activities || ''

                        return (
                            <TableRow key={entry.id}>
                                <TableCell className="font-medium">
                                    {formatDate(entry.entry_date)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[10px]">
                                        {entry.work_shift}
                                    </Badge>
                                </TableCell>
                                <TableCell>{entry.weather || '-'}</TableCell>
                                <TableCell className="text-center">{String(totalWorkers)}</TableCell>
                                <TableCell className="text-center">
                                    {String(entry.progress_pct)}%
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        {(entry.diario_photos?.length ?? 0) > 0 && (
                                            <span className="flex items-center gap-0.5 text-muted-foreground" title="Fotos">
                                                <Camera className="h-3 w-3" />
                                                <span className="text-[10px]">{String(entry.diario_photos?.length ?? 0)}</span>
                                            </span>
                                        )}
                                        {(entry.diario_incidents?.length ?? 0) > 0 && (
                                            <span className="flex items-center gap-0.5 text-orange-500" title="Ocorrências">
                                                <AlertTriangle className="h-3 w-3" />
                                                <span className="text-[10px]">{String(entry.diario_incidents?.length ?? 0)}</span>
                                            </span>
                                        )}
                                        {(entry.diario_photos?.length ?? 0) === 0 && (entry.diario_incidents?.length ?? 0) === 0 && (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell
                                    className="max-w-[250px] truncate"
                                    title={activitySummary}
                                >
                                    {activitySummary || (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                {canEdit && (
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={() => { onEdit(entry) }}
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => { onDelete(entry.id) }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
