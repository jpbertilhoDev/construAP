import { useState } from 'react'
import { Plus, Search, Loader2, MoreVertical, Upload, Settings2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Link } from 'react-router-dom'
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useEmployeeRoles, useUploadAvatar, useCreateEmployeeRole, useDeleteEmployeeRole } from './hooks/useEmployees'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { formatDate } from '@/lib/utils'
import { usePermissions } from '@/features/auth/usePermissions'

type EmployeeForm = {
    nome: string
    nif?: string
    email?: string
    telefone?: string
    role_id?: string
    data_admissao?: string
    estado: 'Ativo' | 'Inativo' | 'Suspenso'
}

const estadoVariant: Record<string, 'success' | 'secondary' | 'warning'> = {
    Ativo: 'success',
    Inativo: 'secondary',
    Suspenso: 'warning',
}

export function FuncionariosListPage() {
    const { hasPermission } = usePermissions()
    const [search, setSearch] = useState('')
    const [estadoFilter, setEstadoFilter] = useState('Ativo')
    const [isOpen, setIsOpen] = useState(false)
    const [rolesOpen, setRolesOpen] = useState(false)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)

    const { data: employees = [], isLoading } = useEmployees(estadoFilter !== 'Ativo')
    const { data: roles = [] } = useEmployeeRoles()
    const createMutation = useCreateEmployee()
    const updateMutation = useUpdateEmployee()
    const deleteMutation = useDeleteEmployee()
    const uploadMutation = useUploadAvatar()
    const createRoleMutation = useCreateEmployeeRole()
    const deleteRoleMutation = useDeleteEmployeeRole()

    const form = useForm<EmployeeForm>({ defaultValues: { estado: 'Ativo' } })
    const roleForm = useForm<{ nome: string; descricao?: string }>()

    const filtered = employees.filter(e => {
        const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase()) ||
            (e.nif ?? '').includes(search) || (e.email ?? '').toLowerCase().includes(search.toLowerCase())
        const matchEstado = estadoFilter === 'Todos' || e.estado === estadoFilter
        return matchSearch && matchEstado
    })

    const onSubmit = async (values: EmployeeForm) => {
        const payload = { ...values }
        if (!payload.nif) delete payload.nif
        if (!payload.email) delete payload.email
        if (!payload.telefone) delete payload.telefone
        if (!payload.data_admissao) delete payload.data_admissao

        const newEmp = await createMutation.mutateAsync(payload as any)
        if (avatarFile && newEmp?.id) {
            await uploadMutation.mutateAsync({ employeeId: newEmp.id, file: avatarFile })
        }
        form.reset()
        setAvatarFile(null)
        setIsOpen(false)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
                    <p className="text-muted-foreground text-sm">Gestão da equipa e categorias profissionais</p>
                </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-44 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Pesquisar..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                    <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {['Ativo', 'Inativo', 'Suspenso', 'Todos'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
                    {hasPermission('rh.manage') && (
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 ml-auto"><Settings2 className="h-4 w-4" /> Categorias</Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[420px]">
                        <DialogHeader><DialogTitle>Categorias Profissionais</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-2">
                            <form onSubmit={(e) => void roleForm.handleSubmit(async vals => {
                                await createRoleMutation.mutateAsync(vals)
                                roleForm.reset()
                            })(e)} className="flex items-end gap-2">
                                <div className="space-y-1 flex-1">
                                    <label className="text-xs font-medium">Nome da Categoria</label>
                                    <Input placeholder="Ex: Engenheiro" {...roleForm.register('nome', { required: true })} />
                                </div>
                                <Button type="submit" size="sm" disabled={createRoleMutation.isPending}>
                                    {createRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                </Button>
                            </form>
                            <div className="border rounded-md divide-y max-h-[300px] overflow-auto">
                                {roles.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">Sem categorias. Crie uma acima.</div>
                                ) : roles.map(r => (
                                    <div key={r.id} className="flex items-center justify-between p-2.5 text-sm">
                                        <span>{r.nome}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => void deleteRoleMutation.mutateAsync(r.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    {hasPermission('rh.manage') && (
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Novo Funcionário</Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[460px]">
                        <DialogHeader><DialogTitle>Novo Funcionário</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-3 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium">Nome completo *</label>
                                    <Input placeholder="João Silva" {...form.register('nome', { required: true })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">NIF</label>
                                    <Input placeholder="123456789" {...form.register('nif')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Telefone</label>
                                    <Input placeholder="912 345 678" {...form.register('telefone')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input type="email" {...form.register('email')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Data de Admissão</label>
                                    <Input type="date" {...form.register('data_admissao')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Função</label>
                                    <Select onValueChange={v => form.setValue('role_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                                        <SelectContent>
                                            {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Estado</label>
                                    <Select defaultValue="Ativo" onValueChange={v => form.setValue('estado', v as any)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['Ativo', 'Inativo', 'Suspenso'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 space-y-1 mt-2">
                                    <label className="text-sm font-medium">Fotografia (Opcional)</label>
                                    <div className="flex items-center gap-3 mt-1 text-sm">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-muted-foreground"
                                            onClick={() => document.getElementById('new-avatar-upload')?.click()}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            {avatarFile ? avatarFile.name : 'Escolher foto...'}
                                        </Button>
                                        {avatarFile && (
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarFile(null)}>Remover</Button>
                                        )}
                                        <input
                                            type="file"
                                            id="new-avatar-upload"
                                            className="hidden"
                                            accept="image/png, image/jpeg, image/webp"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) setAvatarFile(e.target.files[0])
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending || uploadMutation.isPending}>
                                {(createMutation.isPending || uploadMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Criar Funcionário
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
                                <TableHead>Função</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Admissão</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum funcionário encontrado.</TableCell></TableRow>
                            ) : filtered.map(e => (
                                <TableRow key={e.id} className="group">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={e.avatar_url} />
                                                <AvatarFallback className="bg-primary/10 text-primary uppercase">
                                                    {e.nome.substring(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <Link to={`/rh/funcionarios/${e.id}`} className="font-medium hover:underline">
                                                    {e.nome}
                                                </Link>
                                                {e.nif && <div className="text-xs text-muted-foreground mt-0.5">NIF: {e.nif}</div>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{e.employee_roles?.nome ?? '—'}</TableCell>
                                    <TableCell className="text-sm">
                                        {e.email && <div>{e.email}</div>}
                                        {e.telefone && <div className="text-muted-foreground">{e.telefone}</div>}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{e.data_admissao ? formatDate(e.data_admissao) : '—'}</TableCell>
                                    <TableCell><Badge variant={estadoVariant[e.estado] ?? 'default'}>{e.estado}</Badge></TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild><Link to={`/rh/funcionarios/${e.id}`}>Ver Detalhe</Link></DropdownMenuItem>
                                                {hasPermission('rh.manage') && (
                                                    <>
                                                        <DropdownMenuItem
                                                            onClick={() => void updateMutation.mutateAsync({ id: e.id, estado: e.estado === 'Ativo' ? 'Inativo' : 'Ativo' })}
                                                        >
                                                            {e.estado === 'Ativo' ? 'Inativar' : 'Ativar'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => {
                                                                if (window.confirm(`Tem certeza que deseja excluir ${e.nome}? Esta ação é irreversível.`)) {
                                                                    void deleteMutation.mutateAsync(e.id).then(
                                                                        () => { toast.success('Funcionário excluído') },
                                                                        () => { toast.error('Erro ao excluir. Verifique dados associados.') },
                                                                    )
                                                                }
                                                            }}
                                                        >
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
