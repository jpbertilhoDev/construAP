import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Plus, Search, CheckCircle2, XCircle, Ban, Euro, FileText, Trash2, BookOpen, Download, Upload, Calendar } from 'lucide-react'
import { BlocosTab } from './tabs/BlocosTab'
import { AuditoriaTab } from './tabs/AuditoriaTab'
import { CSVImportDialog } from './tabs/CSVImportDialog'
import { exportFracoesCSV, exportFracoesPDF } from './utils/exportUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEmpreendimento } from './hooks/useEmpreendimentos'
import {
    useFracoes, useCreateFracao, useDeleteFracao, useUpdateFracaoEstado,
    useTipologias, useCreateTipologia, useDeleteTipologia,
    useReservas, useCreateReserva, useCancelarReserva, useConfirmarVenda, useEstenderReserva,
    usePrecoHistorico, useUpdateFracaoPreco,
    useImobDocumentos, useUploadImobDocumento, useDeleteImobDocumento, getImobDocumentoUrl,
} from './hooks/useFracoes'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { EstadoComercial, TipologiaTipo, TipoDocumento } from '@/services/fracoes'

// ── State colors ──────────────────────────────────────────────────────────────

const estadoVariant: Record<string, 'success' | 'warning' | 'default' | 'secondary'> = {
    'Disponível': 'success',
    'Reservado': 'warning',
    'Vendido': 'default',
    'Bloqueado': 'secondary',
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const fracaoSchema = z.object({
    ref: z.string().min(1, 'Referência obrigatória'),
    designacao: z.string().optional(),
    tipologia_id: z.string().optional(),
    piso: z.coerce.number().optional(),
    area_util_m2: z.coerce.number().optional(),
    area_bruta_m2: z.coerce.number().optional(),
    orientation: z.string().optional(),
    preco_atual: z.coerce.number().min(1, 'Preço obrigatório'),
    notes: z.string().optional(),
})
type FracaoFormValues = z.infer<typeof fracaoSchema>

const tipologiaSchema = z.object({
    tipo: z.enum(['T0', 'T1', 'T2', 'T3', 'T4+', 'Garagem', 'Arrecadação', 'Comercial', 'Lote', 'Outro']),
    designacao: z.string().optional(),
    area_util_m2: z.coerce.number().optional(),
    quartos: z.coerce.number().optional(),
})
type TipologiaFormValues = z.infer<typeof tipologiaSchema>

const reservaSchema = z.object({
    cliente_nome: z.string().min(2, 'Nome obrigatório'),
    cliente_email: z.string().email('Email inválido').optional().or(z.literal('')),
    cliente_telefone: z.string().optional(),
    cliente_nif: z.string().optional(),
    valor_sinal: z.coerce.number().optional(),
    notas: z.string().optional(),
})
type ReservaFormValues = z.infer<typeof reservaSchema>

// ── Main Page ─────────────────────────────────────────────────────────────────

export function EmpreendimentoDetailPage() {
    const { id } = useParams<{ id: string }>()
    const empreendimentoId = id!

    const { data: empreendimento, isLoading } = useEmpreendimento(empreendimentoId)
    const { data: fracoes = [] } = useFracoes(empreendimentoId)
    const { data: tipologias = [] } = useTipologias(empreendimentoId)
    const { data: reservas = [] } = useReservas(empreendimentoId)

    const [search, setSearch] = useState('')
    const [estadoFilter, setEstadoFilter] = useState<EstadoComercial | 'Todas'>('Todas')

    const filtered = useMemo(() => fracoes.filter(f => {
        const matchSearch = (f.designacao || f.ref).toLowerCase().includes(search.toLowerCase()) ||
            (f.tipologias?.designacao || f.tipologias?.tipo || '').toLowerCase().includes(search.toLowerCase())
        const matchEstado = estadoFilter === 'Todas' || f.estado_comercial === estadoFilter
        return matchSearch && matchEstado
    }), [fracoes, search, estadoFilter])

    const kpis = useMemo(() => ({
        total: fracoes.length,
        disponiveis: fracoes.filter(f => f.estado_comercial === 'Disponível').length,
        reservados: fracoes.filter(f => f.estado_comercial === 'Reservado').length,
        vendidos: fracoes.filter(f => f.estado_comercial === 'Vendido').length,
        bloqueados: fracoes.filter(f => f.estado_comercial === 'Bloqueado').length,
        receitaVendida: fracoes.filter(f => f.estado_comercial === 'Vendido').reduce((s, f) => s + (f.preco_atual ?? 0), 0),
    }), [fracoes])

    if (isLoading) {
        return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    }
    if (!empreendimento) {
        return <div className="py-8 text-center text-muted-foreground">Empreendimento não encontrado.</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
                    <Link to="/imobiliario"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">{empreendimento.name}</h1>
                    <p className="text-muted-foreground text-sm">
                        {[empreendimento.address, empreendimento.concelho, empreendimento.promotor && `Promotor: ${empreendimento.promotor}`]
                            .filter(Boolean).join(' · ')}
                    </p>
                </div>
                <Badge variant={estadoVariant[empreendimento.estado] ?? 'default'}>{empreendimento.estado}</Badge>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                    { label: 'Total', value: kpis.total, color: '' },
                    { label: 'Disponíveis', value: kpis.disponiveis, color: 'text-emerald-600' },
                    { label: 'Reservadas', value: kpis.reservados, color: 'text-amber-600' },
                    { label: 'Vendidas', value: kpis.vendidos, color: 'text-blue-600' },
                    { label: 'Bloqueadas', value: kpis.bloqueados, color: 'text-slate-500' },
                ].map(k => (
                    <Card key={k.label}>
                        <CardContent className="pt-4 pb-3 text-center">
                            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                        </CardContent>
                    </Card>
                ))}
                <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(kpis.receitaVendida)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Vendido</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="fracoes">
                <TabsList>
                    <TabsTrigger value="fracoes">Mapa de Frações</TabsTrigger>
                    <TabsTrigger value="reservas">Reservas</TabsTrigger>
                    <TabsTrigger value="blocos">Blocos</TabsTrigger>
                    <TabsTrigger value="tipologias">Tipologias</TabsTrigger>
                    <TabsTrigger value="documentos">Documentos</TabsTrigger>
                    <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
                </TabsList>

                <TabsContent value="fracoes" className="mt-4">
                    <MapaFracoesTab
                        empreendimentoId={empreendimentoId}
                        filtered={filtered}
                        allFracoes={fracoes}
                        search={search} setSearch={setSearch}
                        estadoFilter={estadoFilter} setEstadoFilter={setEstadoFilter}
                        tipologias={tipologias}
                        diasReserva={empreendimento.dias_reserva}
                        empreendimentoNome={empreendimento.name}
                    />
                </TabsContent>

                <TabsContent value="reservas" className="mt-4">
                    <ReservasTab empreendimentoId={empreendimentoId} reservas={reservas} />
                </TabsContent>

                <TabsContent value="blocos" className="mt-4">
                    <BlocosTab empreendimentoId={empreendimentoId} />
                </TabsContent>

                <TabsContent value="tipologias" className="mt-4">
                    <TipologiasTab empreendimentoId={empreendimentoId} tipologias={tipologias} />
                </TabsContent>

                <TabsContent value="documentos" className="mt-4">
                    <DocumentosTab empreendimentoId={empreendimentoId} />
                </TabsContent>

                <TabsContent value="auditoria" className="mt-4">
                    <AuditoriaTab empreendimentoId={empreendimentoId} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

// ── Mapa de Frações Tab ───────────────────────────────────────────────────────

function MapaFracoesTab({ empreendimentoId, filtered, allFracoes, search, setSearch, estadoFilter, setEstadoFilter, tipologias, diasReserva, empreendimentoNome }: {
    empreendimentoId: string
    filtered: any[]
    allFracoes: any[]
    search: string
    setSearch: (s: string) => void
    estadoFilter: string
    setEstadoFilter: (s: any) => void
    tipologias: any[]
    diasReserva: number
    empreendimentoNome: string
}) {
    const createFracaoMutation = useCreateFracao(empreendimentoId)
    const deleteFracaoMutation = useDeleteFracao(empreendimentoId)
    const updateEstadoMutation = useUpdateFracaoEstado(empreendimentoId)
    const createReservaMutation = useCreateReserva(empreendimentoId)

    const [isAddOpen, setIsAddOpen] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [reservaFracao, setReservaFracao] = useState<any | null>(null)
    const [priceEditFracao, setPriceEditFracao] = useState<any | null>(null)
    const [csvImportOpen, setCsvImportOpen] = useState(false)

    const fracaoForm = useForm<FracaoFormValues>({
        resolver: zodResolver(fracaoSchema) as any,
        defaultValues: { preco_atual: 0 },
    })

    const reservaForm = useForm<ReservaFormValues>({
        resolver: zodResolver(reservaSchema) as any,
    })

    const onCreateFracao = async (values: FracaoFormValues) => {
        await createFracaoMutation.mutateAsync({ ...values, empreendimento_id: empreendimentoId })
        fracaoForm.reset()
        setIsAddOpen(false)
    }

    const onCreateReserva = async (values: ReservaFormValues) => {
        if (!reservaFracao) return
        await createReservaMutation.mutateAsync({
            ...values,
            fracao_id: reservaFracao.id,
            empreendimento_id: empreendimentoId,
            dias_reserva: diasReserva,
        })
        reservaForm.reset()
        setReservaFracao(null)
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
                <div className="relative flex-1 min-w-44 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Pesquisar..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                    <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {['Todas', 'Disponível', 'Reservado', 'Vendido', 'Bloqueado'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => exportFracoesCSV(allFracoes, `${empreendimentoNome}_fracoes.csv`)}>
                    <Download className="h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => void exportFracoesPDF(allFracoes, empreendimentoNome)}>
                    <FileText className="h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setCsvImportOpen(true)}>
                    <Upload className="h-4 w-4" /> Importar
                </Button>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1.5 ml-auto"><Plus className="h-4 w-4" /> Nova Fração</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader><DialogTitle>Adicionar Fração</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => void fracaoForm.handleSubmit(onCreateFracao)(e)} className="space-y-3 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Referência *</label>
                                    <Input placeholder="A1.01" {...fracaoForm.register('ref')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Designação</label>
                                    <Input placeholder="Ap.1.01" {...fracaoForm.register('designacao')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Tipologia</label>
                                    <Select onValueChange={(v) => fracaoForm.setValue('tipologia_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                                        <SelectContent>
                                            {tipologias.map((t: any) => (
                                                <SelectItem key={t.id} value={t.id}>{t.designacao || t.tipo}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Piso</label>
                                    <Input type="number" {...fracaoForm.register('piso')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Área Útil (m²)</label>
                                    <Input type="number" step="0.01" {...fracaoForm.register('area_util_m2')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Preço (€) *</label>
                                    <Input type="number" step="0.01" {...fracaoForm.register('preco_atual')} />
                                    {fracaoForm.formState.errors.preco_atual && (
                                        <p className="text-xs text-destructive">{fracaoForm.formState.errors.preco_atual.message}</p>
                                    )}
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium">Orientação</label>
                                    <Input placeholder="Norte, Sul..." {...fracaoForm.register('orientation')} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={createFracaoMutation.isPending}>
                                {createFracaoMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Adicionar Fração
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ref.</TableHead>
                            <TableHead>Tipologia</TableHead>
                            <TableHead>Piso</TableHead>
                            <TableHead>Área (m²)</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Preço</TableHead>
                            <TableHead className="w-[140px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    Nenhuma fração encontrada.
                                </TableCell>
                            </TableRow>
                        ) : filtered.map((f: any) => (
                            <TableRow key={f.id}>
                                <TableCell className="font-medium">{f.designacao || f.ref}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {f.tipologias?.designacao || f.tipologias?.tipo || f.type || '—'}
                                </TableCell>
                                <TableCell>{f.piso ?? f.floor ?? '—'}</TableCell>
                                <TableCell>
                                    {(f.area_util_m2 ?? f.area_m2) ? `${f.area_util_m2 ?? f.area_m2} m²` : '—'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={estadoVariant[f.estado_comercial as EstadoComercial] || 'outline'}>
                                        {f.estado_comercial}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {formatCurrency(f.preco_atual ?? f.sale_price ?? 0)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-0.5">
                                        {f.estado_comercial === 'Disponível' && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Reservar" onClick={() => setReservaFracao(f)}>
                                                <BookOpen className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Preço" onClick={() => setPriceEditFracao(f)}>
                                            <Euro className="h-3.5 w-3.5" />
                                        </Button>
                                        {f.estado_comercial === 'Disponível' && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-600" title="Bloquear"
                                                onClick={() => void updateEstadoMutation.mutateAsync({ id: f.id, estado: 'Bloqueado', motivo: 'Bloqueado manualmente' })}>
                                                <Ban className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        {f.estado_comercial === 'Bloqueado' && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-600" title="Desbloquear"
                                                onClick={() => void updateEstadoMutation.mutateAsync({ id: f.id, estado: 'Disponível' })}>
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Eliminar" onClick={() => setDeleteId(f.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Reserva Dialog */}
            <Dialog open={!!reservaFracao} onOpenChange={(o) => !o && setReservaFracao(null)}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Reservar — {reservaFracao?.designacao || reservaFracao?.ref}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => void reservaForm.handleSubmit(onCreateReserva)(e)} className="space-y-3 mt-2">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Nome do Cliente *</label>
                            <Input placeholder="João Silva" {...reservaForm.register('cliente_nome')} />
                            {reservaForm.formState.errors.cliente_nome && (
                                <p className="text-xs text-destructive">{reservaForm.formState.errors.cliente_nome.message}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Email</label>
                                <Input type="email" {...reservaForm.register('cliente_email')} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Telefone</label>
                                <Input {...reservaForm.register('cliente_telefone')} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">NIF</label>
                                <Input {...reservaForm.register('cliente_nif')} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Valor Sinal (€)</label>
                                <Input type="number" step="0.01" {...reservaForm.register('valor_sinal')} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Notas</label>
                            <Input {...reservaForm.register('notas')} />
                        </div>
                        <p className="text-xs text-muted-foreground">Reserva válida por {diasReserva} dias.</p>
                        <Button type="submit" className="w-full" disabled={createReservaMutation.isPending}>
                            {createReservaMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                            Confirmar Reserva
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Price Edit Dialog */}
            {priceEditFracao && (
                <PriceEditDialog fracao={priceEditFracao} empreendimentoId={empreendimentoId} onClose={() => setPriceEditFracao(null)} />
            )}

            {/* Delete */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Fração</AlertDialogTitle>
                        <AlertDialogDescription>Esta acção é irreversível.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => { if (deleteId) void deleteFracaoMutation.mutateAsync(deleteId).then(() => setDeleteId(null)) }}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* CSV Import */}
            <CSVImportDialog
                open={csvImportOpen}
                onClose={() => setCsvImportOpen(false)}
                empreendimentoId={empreendimentoId}
                tipologias={tipologias}
            />
        </div>
    )
}

// ── Price Edit Dialog ─────────────────────────────────────────────────────────

function PriceEditDialog({ fracao, empreendimentoId, onClose }: { fracao: any; empreendimentoId: string; onClose: () => void }) {
    const { data: historico = [] } = usePrecoHistorico(fracao.id)
    const updateMutation = useUpdateFracaoPreco(empreendimentoId, fracao.id)
    const [preco, setPreco] = useState('')
    const [motivo, setMotivo] = useState('')

    const onSubmit = async () => {
        if (!preco || !motivo) return
        await updateMutation.mutateAsync({ precoNovo: parseFloat(preco), motivo })
        onClose()
    }

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader><DialogTitle>Preço — {fracao.designacao || fracao.ref}</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Novo Preço (€)</label>
                            <Input type="number" step="0.01" value={preco} onChange={e => setPreco(e.target.value)}
                                placeholder={String(fracao.preco_atual ?? '')} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Motivo *</label>
                            <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ajuste de mercado..." />
                        </div>
                    </div>
                    <Button className="w-full" onClick={() => void onSubmit()} disabled={updateMutation.isPending || !preco || !motivo}>
                        {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Actualizar Preço
                    </Button>
                    {historico.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Histórico de Preços</p>
                            <div className="space-y-1 max-h-36 overflow-y-auto">
                                {historico.map(h => (
                                    <div key={h.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0">
                                        <span className="text-muted-foreground">{formatDate(h.created_at)}</span>
                                        <span>{formatCurrency(h.preco_anterior)} → {formatCurrency(h.preco_novo)}</span>
                                        <span className={h.delta_pct && h.delta_pct > 0 ? 'text-emerald-600' : 'text-destructive'}>
                                            {h.delta_pct ? `${h.delta_pct > 0 ? '+' : ''}${h.delta_pct.toFixed(1)}%` : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Reservas Tab ──────────────────────────────────────────────────────────────

function ReservasTab({ empreendimentoId, reservas }: { empreendimentoId: string; reservas: any[] }) {
    const cancelarMutation = useCancelarReserva(empreendimentoId)
    const confirmarMutation = useConfirmarVenda(empreendimentoId)
    const estenderMutation = useEstenderReserva(empreendimentoId)
    const [cancelData, setCancelData] = useState<{ id: string; fracao_id: string } | null>(null)
    const [cancelMotivo, setCancelMotivo] = useState('')
    const [extenderData, setExtenderData] = useState<{ id: string } | null>(null)
    const [novaData, setNovaData] = useState('')

    const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
        'Ativa': 'warning',
        'Confirmada': 'success',
        'Cancelada': 'destructive',
        'Expirada': 'default',
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Reservas</CardTitle>
                <CardDescription>Todas as reservas deste empreendimento</CardDescription>
            </CardHeader>
            <CardContent>
                {reservas.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">Nenhuma reserva registada.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fração</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Início</TableHead>
                                <TableHead>Expiração</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Sinal</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reservas.map((r: any) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-medium">{r.fracoes?.designacao || r.fracoes?.ref || '—'}</TableCell>
                                    <TableCell>
                                        <div>{r.cliente_nome}</div>
                                        {r.cliente_telefone && <div className="text-xs text-muted-foreground">{r.cliente_telefone}</div>}
                                    </TableCell>
                                    <TableCell className="text-sm">{formatDate(r.data_inicio)}</TableCell>
                                    <TableCell className="text-sm">{formatDate(r.data_expiracao)}</TableCell>
                                    <TableCell><Badge variant={statusVariant[r.estado] || 'default'}>{r.estado}</Badge></TableCell>
                                    <TableCell>{r.valor_sinal ? formatCurrency(r.valor_sinal) : '—'}</TableCell>
                                    <TableCell>
                                        {r.estado === 'Ativa' && (
                                            <div className="flex gap-1 justify-end">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Confirmar Venda"
                                                    onClick={() => void confirmarMutation.mutateAsync({ id: r.id, fracao_id: r.fracao_id })}>
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="Estender Prazo"
                                                    onClick={() => { setExtenderData({ id: r.id }); setNovaData(r.data_expiracao) }}>
                                                    <Calendar className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Cancelar"
                                                    onClick={() => setCancelData({ id: r.id, fracao_id: r.fracao_id })}>
                                                    <XCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                <AlertDialog open={!!cancelData} onOpenChange={(o) => !o && setCancelData(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar Reserva</AlertDialogTitle>
                            <AlertDialogDescription>Indique o motivo do cancelamento.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input className="my-2" placeholder="Motivo obrigatório..." value={cancelMotivo} onChange={e => setCancelMotivo(e.target.value)} />
                        <AlertDialogFooter>
                            <AlertDialogCancel>Voltar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={!cancelMotivo}
                                onClick={() => {
                                    if (cancelData && cancelMotivo)
                                        void cancelarMutation.mutateAsync({ ...cancelData, motivo: cancelMotivo })
                                            .then(() => { setCancelData(null); setCancelMotivo('') })
                                }}
                            >
                                Cancelar Reserva
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Estender Reserva */}
                <Dialog open={!!extenderData} onOpenChange={(o) => !o && setExtenderData(null)}>
                    <DialogContent className="sm:max-w-[360px]">
                        <DialogHeader><DialogTitle>Estender Reserva</DialogTitle></DialogHeader>
                        <div className="space-y-3 mt-2">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Nova data de expiração</label>
                                <Input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} />
                            </div>
                            <Button className="w-full" disabled={!novaData || estenderMutation.isPending}
                                onClick={() => {
                                    if (extenderData && novaData)
                                        void estenderMutation.mutateAsync({ id: extenderData.id, novaDataExpiracao: novaData })
                                            .then(() => setExtenderData(null))
                                }}>
                                {estenderMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Confirmar Extensão
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}

// ── Tipologias Tab ────────────────────────────────────────────────────────────

function TipologiasTab({ empreendimentoId, tipologias }: { empreendimentoId: string; tipologias: any[] }) {
    const createMutation = useCreateTipologia(empreendimentoId)
    const deleteMutation = useDeleteTipologia(empreendimentoId)
    const [isOpen, setIsOpen] = useState(false)
    const form = useForm<TipologiaFormValues>({
        resolver: zodResolver(tipologiaSchema) as any,
        defaultValues: { tipo: 'T2' },
    })

    const onSubmit = async (values: TipologiaFormValues) => {
        await createMutation.mutateAsync({ ...values, empreendimento_id: empreendimentoId } as any)
        form.reset()
        setIsOpen(false)
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                    <CardTitle className="text-base">Tipologias</CardTitle>
                    <CardDescription>Tipos de frações deste empreendimento</CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nova Tipologia</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[380px]">
                        <DialogHeader><DialogTitle>Nova Tipologia</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-3 mt-2">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Tipo *</label>
                                <Select defaultValue="T2" onValueChange={(v) => form.setValue('tipo', v as TipologiaTipo)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['T0', 'T1', 'T2', 'T3', 'T4+', 'Garagem', 'Arrecadação', 'Comercial', 'Lote', 'Outro'].map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Designação</label>
                                <Input placeholder="Ex: T2 com terraço" {...form.register('designacao')} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Área Útil (m²)</label>
                                    <Input type="number" step="0.01" {...form.register('area_util_m2')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Quartos</label>
                                    <Input type="number" {...form.register('quartos')} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Criar Tipologia
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {tipologias.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Nenhuma tipologia definida.</div>
                ) : (
                    <div className="divide-y">
                        {tipologias.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline">{t.tipo}</Badge>
                                    <span className="text-sm font-medium">{t.designacao || t.tipo}</span>
                                    {t.area_util_m2 && <span className="text-xs text-muted-foreground">{t.area_util_m2} m²</span>}
                                    {t.quartos != null && <span className="text-xs text-muted-foreground">{t.quartos} qto{t.quartos !== 1 ? 's' : ''}</span>}
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => void deleteMutation.mutateAsync(t.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ── Documentos Tab ────────────────────────────────────────────────────────────

function DocumentosTab({ empreendimentoId }: { empreendimentoId: string }) {
    const { data: docs = [] } = useImobDocumentos(empreendimentoId)
    const uploadMutation = useUploadImobDocumento(empreendimentoId)
    const deleteMutation = useDeleteImobDocumento(empreendimentoId)

    const [tipo, setTipo] = useState<TipoDocumento>('Outro')
    const [descricao, setDescricao] = useState('')

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        await uploadMutation.mutateAsync({ file, tipo, descricao })
        setDescricao('')
        e.target.value = ''
    }

    const handleDownload = async (doc: any) => {
        const url = await getImobDocumentoUrl(doc.storage_path)
        window.open(url, '_blank')
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Documentos do Empreendimento</CardTitle>
                <CardDescription>Plantas, certificados, regulamentos e outros ficheiros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-md border bg-muted/30 p-4 space-y-3">
                    <p className="text-sm font-medium">Adicionar documento</p>
                    <div className="flex flex-wrap gap-3">
                        <Select value={tipo} onValueChange={v => setTipo(v as TipoDocumento)}>
                            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {['Planta', 'Certificado', 'Caderneta', 'Regulamento', 'Contrato', 'Foto', 'Outro'].map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input placeholder="Descrição (opcional)" className="h-8 flex-1 min-w-32 max-w-xs"
                            value={descricao} onChange={e => setDescricao(e.target.value)} />
                        <label className="cursor-pointer">
                            <Button asChild size="sm" variant="outline" disabled={uploadMutation.isPending}>
                                <span>
                                    {uploadMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                                    Carregar Ficheiro
                                </span>
                            </Button>
                            <input type="file" className="sr-only" accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.xlsx"
                                onChange={(e) => void handleUpload(e)} />
                        </label>
                    </div>
                </div>

                {docs.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Nenhum documento carregado.</div>
                ) : (
                    <div className="divide-y">
                        {docs.map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between py-3 text-sm">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{doc.nome_ficheiro}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {doc.tipo_documento}{doc.descricao ? ` · ${doc.descricao}` : ''}
                                            {doc.tamanho_bytes ? ` · ${(doc.tamanho_bytes / 1024).toFixed(0)} KB` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0 ml-2">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void handleDownload(doc)}>
                                        Abrir
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => void deleteMutation.mutateAsync({ id: doc.id, storagePath: doc.storage_path })}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
