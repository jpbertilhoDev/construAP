import { useState } from 'react'
import { Plus, Search, Loader2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from './hooks/useCompras'
import { useForm } from 'react-hook-form'
import type { Supplier } from '@/services/materiais'
import { usePermissions } from '@/features/auth/usePermissions'

const estadoVariant: Record<string, any> = { Ativo: 'success', Inativo: 'secondary' }
const tipoLabel: Record<string, string> = { material: 'Material', servico: 'Serviço', ambos: 'Material & Serviço' }

export function FornecedoresListPage() {
    const { hasPermission } = usePermissions()
    const [search, setSearch] = useState('')
    const [tipoFilter, setTipoFilter] = useState('todos')
    const [isOpen, setIsOpen] = useState(false)
    const [editItem, setEditItem] = useState<Supplier | null>(null)

    const { data: suppliers = [], isLoading } = useSuppliers(true)
    const createMutation = useCreateSupplier()
    const updateMutation = useUpdateSupplier()

    type FormValues = Pick<Supplier, 'name' | 'nif' | 'email' | 'phone' | 'morada' | 'tipo' | 'category' | 'condicoes_pagamento'>
    const form = useForm<FormValues>({ defaultValues: { tipo: 'ambos' } })

    const filtered = suppliers.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.nif ?? '').includes(search)
        const matchTipo = tipoFilter === 'todos' || s.tipo === tipoFilter
        return matchSearch && matchTipo
    })

    const onSubmit = async (values: FormValues) => {
        if (editItem) {
            await updateMutation.mutateAsync({ id: editItem.id, ...values })
        } else {
            await createMutation.mutateAsync(values)
        }
        form.reset()
        setIsOpen(false)
        setEditItem(null)
    }

    const openEdit = (s: Supplier) => {
        setEditItem(s)
        form.reset({ name: s.name, nif: s.nif ?? '', email: s.email ?? '', phone: s.phone ?? '', morada: s.morada ?? '', tipo: s.tipo, category: s.category ?? '', condicoes_pagamento: s.condicoes_pagamento ?? '' })
        setIsOpen(true)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
                    <p className="text-muted-foreground text-sm">Gestão de parceiros e subcontratados</p>
                </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-44 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Pesquisar..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="servico">Serviço</SelectItem>
                        <SelectItem value="ambos">Ambos</SelectItem>
                    </SelectContent>
                </Select>
                <Dialog open={isOpen} onOpenChange={o => { setIsOpen(o); if (!o) { setEditItem(null); form.reset() } }}>
                    {hasPermission('compras.manage') && (
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-1.5 ml-auto"><Plus className="h-4 w-4" /> Novo Fornecedor</Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader><DialogTitle>{editItem ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-3 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium">Nome *</label>
                                    <Input placeholder="Empresa Lda." {...form.register('name', { required: true })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">NIF</label>
                                    <Input placeholder="500000000" {...form.register('nif')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Telefone</label>
                                    <Input {...form.register('phone')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input type="email" {...form.register('email')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Tipo</label>
                                    <Select defaultValue={editItem?.tipo ?? 'ambos'} onValueChange={v => form.setValue('tipo', v as any)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="material">Material</SelectItem>
                                            <SelectItem value="servico">Serviço</SelectItem>
                                            <SelectItem value="ambos">Ambos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Categoria</label>
                                    <Input placeholder="Ex: Betão, Eletricidade..." {...form.register('category')} />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium">Morada</label>
                                    <Input {...form.register('morada')} />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium">Condições de pagamento</label>
                                    <Input placeholder="Ex: 30 dias, pronto pagamento..." {...form.register('condicoes_pagamento')} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                {editItem ? 'Guardar Alterações' : 'Criar Fornecedor'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="border rounded-md bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>NIF</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Estado</TableHead>
                                {hasPermission('compras.manage') && <TableHead className="w-10"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum fornecedor encontrado.</TableCell></TableRow>
                            ) : filtered.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.name}{s.category && <div className="text-xs text-muted-foreground">{s.category}</div>}</TableCell>
                                    <TableCell className="text-muted-foreground">{s.nif ?? '—'}</TableCell>
                                    <TableCell><Badge variant="outline">{tipoLabel[s.tipo]}</Badge></TableCell>
                                    <TableCell className="text-sm">{s.email ?? s.phone ?? '—'}</TableCell>
                                    <TableCell><Badge variant={estadoVariant[s.estado] ?? 'default'}>{s.estado}</Badge></TableCell>
                                    {hasPermission('compras.manage') && (
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(s)}>Editar</DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => void updateMutation.mutateAsync({ id: s.id, estado: s.estado === 'Ativo' ? 'Inativo' : 'Ativo' })}
                                                    >
                                                        {s.estado === 'Ativo' ? 'Inativar' : 'Ativar'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
