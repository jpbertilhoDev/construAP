import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Building2, MapPin, Home, Loader2, Archive, Pencil, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEmpreendimentos, useCreateEmpreendimento, useArchiveEmpreendimento } from './hooks/useEmpreendimentos'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { EmpreendimentoEstado } from '@/services/empreendimentos'

const statusColors: Record<string, 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'outline'> = {
    'Em Construção': 'warning',
    'Em Comercialização': 'success',
    'Concluído': 'default',
    'Suspenso': 'secondary',
    'Arquivado': 'outline',
}

const empreendimentoSchema = z.object({
    name: z.string().min(2, 'Nome obrigatório'),
    address: z.string().optional(),
    descricao: z.string().optional(),
    concelho: z.string().optional(),
    distrito: z.string().optional(),
    promotor: z.string().optional(),
    ano_construcao: z.coerce.number().optional(),
    estado: z.enum(['Em Construção', 'Em Comercialização', 'Concluído', 'Suspenso', 'Arquivado']),
    dias_reserva: z.coerce.number().min(1).default(30),
})
type EmpreendimentoForm = z.infer<typeof empreendimentoSchema>

export function EmpreendimentosListPage() {
    const { data: empreendimentos = [], isLoading } = useEmpreendimentos()
    const createMutation = useCreateEmpreendimento()
    const archiveMutation = useArchiveEmpreendimento()

    const [isOpen, setIsOpen] = useState(false)
    const [archiveId, setArchiveId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const form = useForm<EmpreendimentoForm>({
        resolver: zodResolver(empreendimentoSchema) as any,
        defaultValues: { estado: 'Em Comercialização', dias_reserva: 30 },
    })

    const filtered = empreendimentos.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.address || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.promotor || '').toLowerCase().includes(search.toLowerCase())
    )

    const onSubmit = async (values: EmpreendimentoForm) => {
        await createMutation.mutateAsync(values as any)
        form.reset()
        setIsOpen(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Imobiliário</h1>
                    <p className="text-muted-foreground text-sm mt-1">Empreendimentos e frações</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Novo Empreendimento
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Novo Empreendimento</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4 mt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-sm font-medium">Nome *</label>
                                    <Input placeholder="Ex: Residencial Tejo" {...form.register('name')} />
                                    {form.formState.errors.name && (
                                        <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Promotor</label>
                                    <Input placeholder="Nome do promotor" {...form.register('promotor')} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Ano de Construção</label>
                                    <Input type="number" placeholder="2026" {...form.register('ano_construcao')} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Concelho</label>
                                    <Input placeholder="Lisboa" {...form.register('concelho')} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Distrito</label>
                                    <Input placeholder="Lisboa" {...form.register('distrito')} />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-sm font-medium">Morada</label>
                                    <Input placeholder="Rua, número..." {...form.register('address')} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Estado</label>
                                    <Select
                                        defaultValue="Em Comercialização"
                                        onValueChange={(v) => form.setValue('estado', v as EmpreendimentoEstado)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['Em Construção', 'Em Comercialização', 'Concluído', 'Suspenso'].map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Dias de Reserva (padrão)</label>
                                    <Input type="number" min={1} {...form.register('dias_reserva')} />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-sm font-medium">Descrição</label>
                                    <Input placeholder="Breve descrição..." {...form.register('descricao')} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Criar Empreendimento
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Pesquisar empreendimentos..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> A carregar empreendimentos...
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                        <Building2 className="h-12 w-12 text-muted-foreground/30" />
                        <p className="font-medium">
                            {empreendimentos.length === 0 ? 'Ainda não há empreendimentos.' : 'Nenhum resultado encontrado.'}
                        </p>
                        {empreendimentos.length === 0 && (
                            <p className="text-sm text-muted-foreground max-w-xs">
                                Clique em "Novo Empreendimento" para começar a gerir o seu portfólio imobiliário.
                            </p>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((e) => (
                        <Card key={e.id} className="hover:shadow-md transition-shadow group">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base truncate">{e.name}</h3>
                                        {e.promotor && (
                                            <p className="text-xs text-muted-foreground">{e.promotor}</p>
                                        )}
                                    </div>
                                    <Badge variant={statusColors[e.estado] || 'default'} className="ml-2 shrink-0 text-xs">
                                        {e.estado}
                                    </Badge>
                                </div>

                                {(e.address || e.concelho) && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{e.address || ''}{e.concelho ? `, ${e.concelho}` : ''}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                                    <Home className="h-3 w-3" />
                                    <span>{e.total_units} fração{e.total_units !== 1 ? 'ões' : ''} definida{e.total_units !== 1 ? 's' : ''}</span>
                                </div>

                                <div className="flex gap-2">
                                    <Button asChild size="sm" className="flex-1">
                                        <Link to={`/imobiliario/${e.id}`}>Ver Detalhe</Link>
                                    </Button>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                        title="Arquivar"
                                        onClick={() => setArchiveId(e.id)}
                                    >
                                        <Archive className="h-4 w-4" />
                                    </Button>
                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                        <Link to={`/imobiliario/${e.id}/editar`} title="Editar">
                                            <Pencil className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AlertDialog open={!!archiveId} onOpenChange={(o) => !o && setArchiveId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Arquivar Empreendimento</AlertDialogTitle>
                        <AlertDialogDescription>
                            O empreendimento ficará arquivado e não aparecerá na listagem principal.
                            Pode ser consultado mais tarde.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => { if (archiveId) void archiveMutation.mutateAsync(archiveId).then(() => setArchiveId(null)) }}
                        >
                            Arquivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
