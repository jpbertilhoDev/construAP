import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, MapPin, Calendar, Tag, AlertTriangle, MoreVertical, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useObra, useUpdateObra, useDeleteObra, useObraFinancials } from '@/features/obras/hooks/useObras'

import { BudgetTab } from '@/features/obras/components/BudgetTab'
import { CostsTab } from '@/features/obras/components/CostsTab'
import { DiarioTab } from '@/features/obras/components/DiarioTab'
import { TasksTab } from '@/features/obras/components/TasksTab'
import { ReceivablesTab } from '@/features/finance/components/ReceivablesTab'
import { DocumentsTab } from '@/features/obras/components/DocumentsTab'
import { AllocationsTab } from '@/features/obras/components/AllocationsTab'
import { QCTab } from '@/features/obras/components/QCTab'
import { formatDate, formatCurrency } from '@/lib/utils'






import type { ObraStatus } from '@/types/database.types'
import { usePermissions } from '@/features/auth/usePermissions'


const TABS = [
    { id: 'visao', label: 'Visão Geral' },
    { id: 'orcamento', label: 'Orçamento' },
    { id: 'custos', label: 'Custos Reais' },
    { id: 'alocacoes', label: 'Funcionários' },
    { id: 'receitas', label: 'Contas a Receber' },
    { id: 'diario', label: 'Diário de Obra' },
    { id: 'tarefas', label: 'Tarefas' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'qc', label: 'Qualidade (QC)' },
] as const

type Tab = (typeof TABS)[number]['id']

const STATUS_OPTIONS: ObraStatus[] = [
    'Em preparação', 'Em execução', 'Suspensa', 'Concluída', 'Arquivada',
]

const statusColor: Record<string, string> = {
    'Em preparação': 'bg-slate-500/20 text-slate-300',
    'Em execução': 'bg-emerald-500/20 text-emerald-400',
    'Suspensa': 'bg-amber-500/20 text-amber-400',
    'Concluída': 'bg-blue-500/20 text-blue-400',
    'Arquivada': 'bg-zinc-500/20 text-zinc-400',
}



export function ObraDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<Tab>('visao')
    const [editingStatus, setEditingStatus] = useState(false)
    const [editingContractValue, setEditingContractValue] = useState(false)
    const [tempContractValue, setTempContractValue] = useState(0)

    const [showArchiveDialog, setShowArchiveDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    const { hasPermission } = usePermissions()
    const { data: obra, isLoading, isError } = useObra(id!)
    const { data: financials } = useObraFinancials(id!)
    const updateMutation = useUpdateObra(id!)


    const deleteMutation = useDeleteObra()

    if (isLoading) {
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
                <div className="h-40 bg-muted rounded animate-pulse" />
            </div>
        )
    }

    if (isError || !obra) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                <p className="font-medium">Obra não encontrada</p>
                <Button variant="outline" className="mt-4" asChild>
                    <Link to="/obras">Voltar às obras</Link>
                </Button>
            </div>
        )
    }

    const handleStatusChange = async (newStatus: ObraStatus) => {
        await updateMutation.mutateAsync({ status: newStatus })
        setEditingStatus(false)
    }

    const handleContractValueChange = async () => {
        await updateMutation.mutateAsync({ contract_value: tempContractValue })
        setEditingContractValue(false)
    }

    const handleArchive = async () => {
        await updateMutation.mutateAsync({ status: 'Arquivada' })
        setShowArchiveDialog(false)
    }

    const handleDelete = async () => {
        await deleteMutation.mutateAsync(obra.id)
        setShowDeleteDialog(false)
        navigate('/obras', { replace: true })
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/obras"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight">{obra.name}</h1>
                            {obra.ref && (
                                <Badge variant="outline" className="text-xs">{obra.ref}</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <div className="relative">
                                {editingStatus ? (
                                    <select
                                        autoFocus
                                        className="h-7 rounded-full text-xs px-2 border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                        defaultValue={obra.status}
                                        onChange={(e) => void handleStatusChange(e.target.value as ObraStatus)}
                                        onBlur={() => setEditingStatus(false)}
                                    >
                                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                ) : hasPermission('obras.manage') ? (
                                    <button
                                        onClick={() => setEditingStatus(true)}
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80 ${statusColor[obra.status]}`}
                                        title="Clique para alterar estado"
                                    >
                                        {obra.status} <Edit2 className="ml-1 h-2.5 w-2.5" />
                                    </button>
                                ) : (
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[obra.status]}`}>
                                        {obra.status}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground">{obra.type}</span>
                        </div>
                    </div>
                </div>

                {hasPermission('obras.manage') && (
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link to={`/obras/${obra.id}/edit`} className="cursor-pointer">
                                        <Edit2 className="w-4 h-4 mr-2" /> Editar Obra
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowArchiveDialog(true)} className="cursor-pointer">
                                    <Archive className="w-4 h-4 mr-2" /> Arquivar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="cursor-pointer focus:bg-destructive focus:text-destructive-foreground text-destructive"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Apagar Obra
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Arquivar Obra</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem a certeza que deseja arquivar a obra <strong>{obra.name}</strong>?
                            Esta obra deixará de aparecer no ecrã inicial, mas os seus dados financeiros não serão eliminados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleArchive()}>
                            Sim, Arquivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apagar Obra</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem a certeza ABSOLUTA que deseja apagar a obra <strong>{obra.name}</strong>?
                            Esta ação é irreversível e irá <strong className="text-destructive">apagar permanentemente</strong> todos os custos, receitas, tarefas e documentos associados!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void handleDelete()}
                        >
                            Sim, Apagar Definitivamente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            {/* Info cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" >
                <Card className="bg-muted/40">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <MapPin className="h-3 w-3" /> Morada
                        </div>
                        <p className="text-sm font-medium truncate">{obra.address || '—'}</p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/40">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Calendar className="h-3 w-3" /> Início
                        </div>
                        <p className="text-sm font-medium">{obra.start_date ? formatDate(obra.start_date) : '—'}</p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/40">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Calendar className="h-3 w-3" /> Conclusão prevista
                        </div>
                        <p className="text-sm font-medium">{obra.end_date_planned ? formatDate(obra.end_date_planned) : '—'}</p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/40">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Tag className="h-3 w-3" /> Tipo
                        </div>
                        <p className="text-sm font-medium">{obra.type}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div >
                <div className="flex gap-1 border-b overflow-x-auto pb-0">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="mt-4">
                    {activeTab === 'visao' && (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">Resumo Financeiro</CardTitle>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-muted-foreground mr-1">Valor Adjudicado</span>
                                            {editingContractValue ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={tempContractValue}
                                                        onChange={(e) => setTempContractValue(Number(e.target.value))}
                                                        className="h-7 w-28 rounded text-sm px-2 border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') void handleContractValueChange()
                                                            if (e.key === 'Escape') setEditingContractValue(false)
                                                        }}
                                                    />
                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => void handleContractValueChange()}>
                                                        <Edit2 className="h-3 w-3 text-green-600" />
                                                    </Button>
                                                </div>
                                            ) : hasPermission('obras.manage') ? (
                                                <button
                                                    onClick={() => {
                                                        setTempContractValue(obra.contract_value || 0)
                                                        setEditingContractValue(true)
                                                    }}
                                                    className="inline-flex items-center text-lg font-bold text-primary hover:text-primary/80 transition-colors"
                                                    title="Editar Valor do Contrato"
                                                >
                                                    {formatCurrency(obra.contract_value || 0)} <Edit2 className="ml-2 h-3 w-3 text-muted-foreground" />
                                                </button>
                                            ) : (
                                                <span className="text-lg font-bold text-primary">
                                                    {formatCurrency(obra.contract_value || 0)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Total Orçado</p>
                                            <p className="text-xl font-bold">{financials ? formatCurrency(financials.total_budgeted) : '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Total Realizado</p>
                                            <p className="text-xl font-bold">{financials ? formatCurrency(financials.total_costs) : '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Desvio Orçamento</p>
                                            <p className={`text-xl font-bold ${(financials?.deviation ?? 0) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                {financials ? formatCurrency(financials.deviation) : '—'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center mt-4">
                                        O rescaldo total do lucro pode ser observado no fluxo de recebimentos e custos.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    {activeTab === 'orcamento' && <BudgetTab obraId={obra.id} />}
                    {activeTab === 'custos' && <CostsTab obraId={obra.id} />}
                    {activeTab === 'alocacoes' && <AllocationsTab obraId={obra.id} />}
                    {activeTab === 'receitas' && <ReceivablesTab obraId={obra.id} />}
                    {activeTab === 'diario' && <DiarioTab obraId={obra.id} obraName={obra.name} />}
                    {activeTab === 'tarefas' && <TasksTab obraId={obra.id} />}
                    {activeTab === 'documentos' && <DocumentsTab obraId={obra.id} />}
                    {activeTab === 'qc' && <QCTab obraId={obra.id} />}

                </div>
            </div>
        </div>
    )
}
