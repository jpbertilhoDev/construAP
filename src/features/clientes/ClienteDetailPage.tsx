// @ts-nocheck
import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    Users2,
    Phone,
    Mail,
    Building2,
    MapPin,
    FileText,
    HardHat,
    Pencil,
    Trash2,
    Loader2,
    Receipt,
} from 'lucide-react'
import { fetchClient, updateClient, deleteClient, type Client } from '@/services/clients'
import { fetchObras } from '@/services/obras'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

// import the modal from the list page to reuse
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ── Status badge colors ────────────────────────────────────────────────────────

const statusVariant: Record<string, 'success' | 'outline' | 'destructive' | 'secondary'> = {
    'Em execução': 'success',
    'Concluída': 'outline',
    'Suspensa': 'destructive',
    'Em preparação': 'secondary',
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

const clientSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    nif: z.string().optional().nullable(),
    email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
    telefone: z.string().optional().nullable(),
    morada: z.string().optional().nullable(),
    cidade: z.string().optional().nullable(),
    codigo_postal: z.string().optional().nullable(),
    notas: z.string().optional().nullable(),
})
type ClientForm = z.infer<typeof clientSchema>

function EditModal({ client, onClose }: { client: Client; onClose: () => void }) {
    const qc = useQueryClient()
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ClientForm>({
        resolver: zodResolver(clientSchema),
        defaultValues: client,
    })
    const mutation = useMutation({
        mutationFn: (data: ClientForm) => updateClient(client.id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['client', client.id] })
            qc.invalidateQueries({ queryKey: ['clients'] })
            toast.success('Cliente atualizado!')
            onClose()
        },
        onError: (err: Error) => toast.error(err.message),
    })
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
            <DialogContent className="max-w-lg w-[95vw] max-h-[90dvh] overflow-y-auto">
                <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-1.5">
                            <Label>Nome / Razão Social *</Label>
                            <Input {...register('name')} />
                            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-1.5"><Label>NIF</Label><Input {...register('nif')} /></div>
                        <div className="space-y-1.5"><Label>Telefone</Label><Input {...register('telefone')} /></div>
                        <div className="sm:col-span-2 space-y-1.5"><Label>Email</Label><Input {...register('email')} type="email" /></div>
                        <div className="sm:col-span-2 space-y-1.5"><Label>Morada</Label><Input {...register('morada')} /></div>
                        <div className="space-y-1.5"><Label>Cidade</Label><Input {...register('cidade')} /></div>
                        <div className="space-y-1.5"><Label>Código Postal</Label><Input {...register('codigo_postal')} /></div>
                        <div className="sm:col-span-2 space-y-1.5">
                            <Label>Notas</Label><Textarea {...register('notas')} rows={3} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                            {(isSubmitting || mutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Guardar
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ClienteDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const qc = useQueryClient()
    const [editing, setEditing] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const { data: client, isLoading } = useQuery({
        queryKey: ['client', id],
        queryFn: () => fetchClient(id!),
        enabled: !!id,
    })

    const { data: allObras = [] } = useQuery({
        queryKey: ['obras'],
        queryFn: fetchObras,
        staleTime: 60_000,
    })

    const clientObras = allObras.filter(o => o.client_id === id)

    const deleteMutation = useMutation({
        mutationFn: () => deleteClient(id!),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clients'] })
            toast.success('Cliente eliminado.')
            navigate('/clientes')
        },
        onError: (err: Error) => toast.error(err.message),
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!client) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">Cliente não encontrado.</p>
                <Button variant="ghost" className="mt-4" onClick={() => navigate('/clientes')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
            </div>
        )
    }

    const totalContractValue = clientObras.reduce((s, o) => s + (o.contract_value ?? 0), 0)
    const activeObras = clientObras.filter(o => o.status === 'Em execução' || o.status === 'Em preparação')

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Back + Actions */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <Button variant="ghost" size="sm" asChild>
                    <Link to="/clientes">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Clientes
                    </Link>
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => setDeleting(true)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                    </Button>
                </div>
            </div>

            {/* Header Card */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Users2 className="h-7 w-7 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold">{client.name}</h1>
                            {client.nif && <p className="text-sm text-muted-foreground">NIF: {client.nif}</p>}
                            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                {client.email && (
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5" />{client.email}
                                    </span>
                                )}
                                {client.telefone && (
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5" />{client.telefone}
                                    </span>
                                )}
                                {client.cidade && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />{client.morada ? `${client.morada}, ` : ''}{client.cidade}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-5 text-center">
                        <p className="text-2xl font-bold text-primary">{clientObras.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total de obras</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{activeObras.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Obras ativas</p>
                    </CardContent>
                </Card>
                <Card className="col-span-2 sm:col-span-1">
                    <CardContent className="pt-5 text-center">
                        <p className="text-2xl font-bold">{formatCurrency(totalContractValue)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Volume total contratado</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="obras">
                <TabsList>
                    <TabsTrigger value="obras">
                        <HardHat className="h-4 w-4 mr-2" /> Obras ({clientObras.length})
                    </TabsTrigger>
                    {client.notas && (
                        <TabsTrigger value="notas">
                            <FileText className="h-4 w-4 mr-2" /> Notas
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="obras" className="mt-4">
                    {clientObras.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border rounded-lg">
                            <HardHat className="h-8 w-8 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">Não existem obras associadas a este cliente.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {clientObras.map(obra => (
                                <Link key={obra.id} to={`/obras/${obra.id}`}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/40 transition-colors group"
                                >
                                    <div>
                                        <p className="font-medium text-sm group-hover:text-primary transition-colors">{obra.name}</p>
                                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                            {obra.ref && <span>{obra.ref}</span>}
                                            {obra.start_date && <span>Início: {formatDate(obra.start_date)}</span>}
                                            <span>{formatCurrency(obra.contract_value ?? 0)}</span>
                                        </div>
                                    </div>
                                    <Badge variant={statusVariant[obra.status] ?? 'outline'}>
                                        {obra.status}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {client.notas && (
                    <TabsContent value="notas" className="mt-4">
                        <Card>
                            <CardContent className="pt-5">
                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{client.notas}</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* Edit modal */}
            {editing && <EditModal client={client} onClose={() => setEditing(false)} />}

            {/* Delete confirmation */}
            <AlertDialog open={deleting} onOpenChange={setDeleting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar "{client.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser revertida. As obras associadas não serão eliminadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate()}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
