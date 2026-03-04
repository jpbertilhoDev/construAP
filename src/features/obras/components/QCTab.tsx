// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ShieldCheck,
    Plus,
    CheckCircle2,
    XCircle,
    Circle,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Trash2,
    Loader2,
    ClipboardList,
    Flame,
} from 'lucide-react'
import {
    fetchChecklists,
    createChecklist,
    deleteChecklist,
    createQCItem,
    updateQCItem,
    deleteQCItem,
    fetchNonConformidades,
    createNonConformidade,
    updateNonConformidade,
    type QCChecklist,
    type QCItem,
    type QCNonConformidade,
} from '@/services/qc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Constants ─────────────────────────────────────────────────────────────────

const FASES = ['Fundações', 'Estrutura', 'Cobertura', 'Paredes', 'Instalações', 'Acabamentos', 'Final']

const GRAVIDADE_COLORS: Record<string, string> = {
    Baixa: 'text-emerald-600 bg-emerald-50',
    Média: 'text-amber-600 bg-amber-50',
    Alta: 'text-orange-600 bg-orange-50',
    Crítica: 'text-red-600 bg-red-50',
}

const ESTADO_NC: Record<string, string> = {
    Aberta: 'destructive',
    'Em Resolução': 'secondary',
    Encerrada: 'outline',
}

// ── QC Item Row ───────────────────────────────────────────────────────────────

function QCItemRow({ item, checklistId }: { item: QCItem; checklistId: string }) {
    const qc = useQueryClient()
    const [showObs, setShowObs] = useState(false)
    const [obsText, setObsText] = useState(item.observacoes ?? '')

    const toggleMutation = useMutation({
        mutationFn: (conforme: boolean | null) =>
            updateQCItem(item.id, { conforme }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['qc-checklists'] }),
    })

    const saveMutation = useMutation({
        mutationFn: () => updateQCItem(item.id, { observacoes: obsText }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['qc-checklists'] })
            toast.success('Nota guardada.')
            setShowObs(false)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: () => deleteQCItem(item.id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['qc-checklists'] }),
    })

    return (
        <div className={cn('px-4 py-2.5 border-b last:border-0 hover:bg-muted/20', item.conforme === false && 'bg-red-50/50 dark:bg-red-950/10')}>
            <div className="flex items-center gap-3">
                {/* Status toggle */}
                <div className="flex gap-1 shrink-0">
                    <button
                        title="Conforme"
                        onClick={() => toggleMutation.mutate(item.conforme === true ? null : true)}
                        className={cn('h-6 w-6 rounded-full flex items-center justify-center border transition-colors',
                            item.conforme === true
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-muted-foreground/30 hover:border-emerald-400'
                        )}
                    >
                        {item.conforme === true ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 opacity-30" />}
                    </button>
                    <button
                        title="Não conforme"
                        onClick={() => toggleMutation.mutate(item.conforme === false ? null : false)}
                        className={cn('h-6 w-6 rounded-full flex items-center justify-center border transition-colors',
                            item.conforme === false
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'border-muted-foreground/30 hover:border-red-400'
                        )}
                    >
                        {item.conforme === false ? <XCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5 opacity-30" />}
                    </button>
                </div>

                <p className={cn('flex-1 text-sm', item.conforme === true && 'line-through text-muted-foreground', item.conforme === false && 'text-red-700 dark:text-red-400 font-medium')}>
                    {item.description}
                </p>

                <div className="flex gap-1 shrink-0">
                    <button
                        onClick={() => setShowObs(!showObs)}
                        className="text-xs text-muted-foreground hover:text-foreground px-1 transition-colors"
                    >
                        Obs
                    </button>
                    <button onClick={() => deleteMutation.mutate()} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {showObs && (
                <div className="mt-2 pl-8 flex gap-2">
                    <Textarea
                        rows={2}
                        className="text-xs"
                        value={obsText}
                        onChange={e => setObsText(e.target.value)}
                        placeholder="Observações..."
                    />
                    <Button size="sm" onClick={() => saveMutation.mutate()}>Guardar</Button>
                </div>
            )}
            {item.observacoes && !showObs && (
                <p className="text-xs text-muted-foreground pl-8 mt-1 italic">{item.observacoes}</p>
            )}
        </div>
    )
}

// ── Checklist Panel ────────────────────────────────────────────────────────────

function ChecklistPanel({ checklist, obraId }: { checklist: QCChecklist; obraId: string }) {
    const qc = useQueryClient()
    const [expanded, setExpanded] = useState(true)
    const [newItem, setNewItem] = useState('')

    const addMutation = useMutation({
        mutationFn: () => createQCItem(checklist.id, obraId, newItem),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['qc-checklists', obraId] })
            setNewItem('')
        },
    })

    const deleteCLMutation = useMutation({
        mutationFn: () => deleteChecklist(checklist.id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['qc-checklists', obraId] }),
    })

    const items = checklist.items ?? []
    const done = items.filter(i => i.conforme === true).length
    const nc = items.filter(i => i.conforme === false).length
    const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0

    return (
        <Card className="overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
                {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5">{checklist.fase}</Badge>
                        <span className="font-medium text-sm truncate">{checklist.title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {nc > 0 && (
                        <span className="text-xs text-red-600 font-medium">{nc} NC</span>
                    )}
                    <span className="text-xs text-muted-foreground">{done}/{items.length}</span>
                    {items.length > 0 && (
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); deleteCLMutation.mutate() }}
                        className="text-muted-foreground hover:text-destructive ml-2"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </button>

            {expanded && (
                <>
                    <div className="divide-y">
                        {items.map(item => (
                            <QCItemRow key={item.id} item={item} checklistId={checklist.id} />
                        ))}
                    </div>
                    <div className="px-4 py-2 border-t flex gap-2 bg-muted/10">
                        <Input
                            placeholder="Novo item de verificação..."
                            className="text-sm h-8"
                            value={newItem}
                            onChange={e => setNewItem(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && newItem.trim()) addMutation.mutate() }}
                        />
                        <Button
                            size="sm"
                            disabled={!newItem.trim() || addMutation.isPending}
                            onClick={() => addMutation.mutate()}
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </>
            )}
        </Card>
    )
}

// ── Non-Conformidade Panel ─────────────────────────────────────────────────────

function NCPanel({ obraId }: { obraId: string }) {
    const qc = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [descricao, setDescricao] = useState('')
    const [gravidade, setGravidade] = useState('Média')

    const { data: ncs = [] } = useQuery({
        queryKey: ['qc-ncs', obraId],
        queryFn: () => fetchNonConformidades(obraId),
        staleTime: 30_000,
    })

    const createMutation = useMutation({
        mutationFn: () => createNonConformidade({ obra_id: obraId, descricao, gravidade }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['qc-ncs', obraId] })
            setDescricao('')
            setGravidade('Média')
            setShowForm(false)
            toast.success('Não-conformidade registada.')
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, estado }: { id: string; estado: string }) =>
            updateNonConformidade(id, { estado }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['qc-ncs', obraId] }),
    })

    const openCount = ncs.filter(n => n.estado === 'Aberta').length
    const criticalCount = ncs.filter(n => n.gravidade === 'Crítica' && n.estado !== 'Encerrada').length

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" /> Não-Conformidades
                    </h3>
                    {openCount > 0 && <Badge variant="destructive" className="text-[10px]">{openCount} abertas</Badge>}
                    {criticalCount > 0 && (
                        <Badge className=" text-[10px] bg-red-600">
                            <Flame className="h-2.5 w-2.5 mr-1" /> {criticalCount} críticas
                        </Badge>
                    )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Registar NC
                </Button>
            </div>

            {showForm && (
                <Card>
                    <CardContent className="pt-4 space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Descrição *</Label>
                            <Textarea rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrever a não-conformidade..." className="text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Gravidade</Label>
                            <select
                                value={gravidade}
                                onChange={e => setGravidade(e.target.value)}
                                className="w-full h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                            >
                                {['Baixa', 'Média', 'Alta', 'Crítica'].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button size="sm" disabled={!descricao.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
                                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                                Registar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {ncs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sem não-conformidades registadas. 🎉</p>
            ) : (
                <div className="space-y-2">
                    {ncs.map(nc => (
                        <div key={nc.id} className={cn(
                            'border rounded-lg px-4 py-3',
                            nc.gravidade === 'Crítica' && nc.estado !== 'Encerrada' && 'border-red-300 bg-red-50/50 dark:bg-red-950/10'
                        )}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{nc.descricao}</p>
                                    {nc.acao_corretiva && (
                                        <p className="text-xs text-muted-foreground mt-1">↳ {nc.acao_corretiva}</p>
                                    )}
                                    <div className="flex gap-2 mt-2">
                                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', GRAVIDADE_COLORS[nc.gravidade])}>
                                            {nc.gravidade}
                                        </span>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    <select
                                        value={nc.estado}
                                        onChange={e => updateMutation.mutate({ id: nc.id, estado: e.target.value })}
                                        className="h-7 text-xs rounded border border-input bg-transparent px-2"
                                    >
                                        {['Aberta', 'Em Resolução', 'Encerrada'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Add Checklist Modal ────────────────────────────────────────────────────────

function AddChecklistModal({ obraId, open, onClose }: { obraId: string; open: boolean; onClose: () => void }) {
    const qc = useQueryClient()
    const [fase, setFase] = useState(FASES[0])
    const [title, setTitle] = useState('')

    const mutation = useMutation({
        mutationFn: () => createChecklist(obraId, fase, title),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['qc-checklists', obraId] })
            toast.success('Checklist criada!')
            setTitle('')
            onClose()
        },
    })

    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
            <DialogContent className="max-w-sm w-[95vw]">
                <DialogHeader><DialogTitle>Nova Checklist de QC</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label>Fase</Label>
                        <select
                            value={fase}
                            onChange={e => setFase(e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        >
                            {FASES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Título da Checklist *</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. Inspeção de fundações" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button disabled={!title.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
                            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Criar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Main Export ────────────────────────────────────────────────────────────────

export function QCTab({ obraId }: { obraId: string }) {
    const [showAddCL, setShowAddCL] = useState(false)

    const { data: checklists = [], isLoading } = useQuery({
        queryKey: ['qc-checklists', obraId],
        queryFn: () => fetchChecklists(obraId),
        staleTime: 30_000,
    })

    const totalItems = checklists.reduce((s, cl) => s + (cl.items?.length ?? 0), 0)
    const doneItems = checklists.reduce((s, cl) => s + (cl.items?.filter(i => i.conforme === true).length ?? 0), 0)
    const ncItems = checklists.reduce((s, cl) => s + (cl.items?.filter(i => i.conforme === false).length ?? 0), 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" /> Controlo de Qualidade
                    </h3>
                    {totalItems > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="text-emerald-600 font-medium">{doneItems} OK</span>
                            {ncItems > 0 && <span className="text-red-600 font-medium">{ncItems} NC</span>}
                            <span>/ {totalItems} itens</span>
                        </div>
                    )}
                </div>
                <Button size="sm" onClick={() => setShowAddCL(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Nova Checklist
                </Button>
            </div>

            {/* Checklists */}
            {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : checklists.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <ClipboardList className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">Sem checklists de QC. Adicione uma para começar.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {checklists.map(cl => (
                        <ChecklistPanel key={cl.id} checklist={cl} obraId={obraId} />
                    ))}
                </div>
            )}

            {/* Non-Conformidades */}
            <div className="border-t pt-6">
                <NCPanel obraId={obraId} />
            </div>

            <AddChecklistModal obraId={obraId} open={showAddCL} onClose={() => setShowAddCL(false)} />
        </div>
    )
}
