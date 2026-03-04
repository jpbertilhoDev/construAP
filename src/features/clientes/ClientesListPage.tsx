// @ts-nocheck
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Users2,
    Plus,
    Search,
    Building2,
    Phone,
    Mail,
    FileText,
    MoreHorizontal,
    Pencil,
    Trash2,
    Loader2,
} from 'lucide-react'
import { fetchClients, createClient, updateClient, deleteClient, type Client } from '@/services/clients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { toast } from 'sonner'

// ── Schema ────────────────────────────────────────────────────────────────────

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

// ── Client Form Modal ─────────────────────────────────────────────────────────

function ClientModal({
    open,
    onClose,
    initial,
}: {
    open: boolean
    onClose: () => void
    initial?: Client
}) {
    const qc = useQueryClient()
    const isEdit = !!initial

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClientForm>({
        resolver: zodResolver(clientSchema),
        defaultValues: initial ?? { name: '', nif: '', email: '', telefone: '', morada: '', cidade: '', codigo_postal: '', notas: '' },
    })

    const mutation = useMutation({
        mutationFn: (data: ClientForm) =>
            isEdit ? updateClient(initial!.id, data) : createClient(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clients'] })
            toast.success(isEdit ? 'Cliente atualizado!' : 'Cliente criado!')
            reset()
            onClose()
        },
        onError: (err: Error) => toast.error(err.message),
    })

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
            <DialogContent className="max-w-lg w-[95vw] max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-1.5">
                            <Label>Nome / Razão Social *</Label>
                            <Input {...register('name')} placeholder="Ex. ConstrutoraSA, Lda" />
                            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>NIF</Label>
                            <Input {...register('nif')} placeholder="PT 123456789" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Telefone</Label>
                            <Input {...register('telefone')} placeholder="+351 91X XXX XXX" />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                            <Label>Email</Label>
                            <Input {...register('email')} type="email" placeholder="geral@empresa.pt" />
                            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                            <Label>Morada</Label>
                            <Input {...register('morada')} placeholder="Rua, nº, andar..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Cidade</Label>
                            <Input {...register('cidade')} placeholder="Lisboa" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Código Postal</Label>
                            <Input {...register('codigo_postal')} placeholder="1000-001" />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                            <Label>Notas</Label>
                            <Textarea {...register('notas')} placeholder="Informação adicional..." rows={3} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                            {(isSubmitting || mutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {isEdit ? 'Guardar' : 'Criar Cliente'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ClientesListPage() {
    const qc = useQueryClient()
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingClient, setEditingClient] = useState<Client | undefined>()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: fetchClients,
        staleTime: 30_000,
    })

    const deleteMutation = useMutation({
        mutationFn: deleteClient,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clients'] })
            toast.success('Cliente eliminado.')
            setDeletingId(null)
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.nif ?? '').includes(search)
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Users2 className="h-6 w-6 text-primary" />
                        Clientes
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Gestão de clientes e histórico de obras</p>
                </div>
                <Button onClick={() => { setEditingClient(undefined); setShowModal(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Pesquisar por nome, email ou NIF..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{clients.length}</p>
                            <p className="text-xs text-muted-foreground">Total de clientes</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Building2 className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">
                        {search ? 'Nenhum cliente encontrado' : 'Sem clientes ainda'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {search ? 'Tente uma pesquisa diferente.' : 'Comece por adicionar o seu primeiro cliente.'}
                    </p>
                    {!search && (
                        <Button className="mt-4" onClick={() => setShowModal(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Adicionar Cliente
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(client => (
                        <Card key={client.id} className="group hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-2">
                                    <Link to={`/clientes/${client.id}`} className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                                            {client.name}
                                        </h3>
                                        {client.nif && (
                                            <p className="text-xs text-muted-foreground mt-0.5">NIF: {client.nif}</p>
                                        )}
                                        <div className="mt-3 space-y-1">
                                            {client.email && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <Mail className="h-3 w-3" />{client.email}
                                                </p>
                                            )}
                                            {client.telefone && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <Phone className="h-3 w-3" />{client.telefone}
                                                </p>
                                            )}
                                            {client.cidade && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <Building2 className="h-3 w-3" />{client.cidade}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setEditingClient(client); setShowModal(true) }}>
                                                <Pencil className="h-4 w-4 mr-2" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => setDeletingId(client.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                                    <Link
                                        to={`/clientes/${client.id}`}
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                        <FileText className="h-3 w-3" /> Ver ficha completa
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modals */}
            <ClientModal
                open={showModal}
                onClose={() => { setShowModal(false); setEditingClient(undefined) }}
                initial={editingClient}
            />

            <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser revertida. O cliente será removido permanentemente.
                            As obras associadas não serão afetadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
