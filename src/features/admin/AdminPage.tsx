// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Users,
    Shield,
    Building2,
    History,
    Plus,
    Pencil,
    Trash2,
    Check,
    X,
    ShieldCheck,
    AlertCircle,
    Save,
    Loader2,
    UserPlus,
    CreditCard,
    Clock,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import {
    fetchRoles,
    fetchPermissions,
    fetchUsersWithRoles,
    fetchRolePermissions,
    fetchTenantSettings,
    createRole,
    updateRole,
    deleteRole,
    saveRolePermissions,
    assignRoleToUser,
    removeUserRole,
    updateTenantSettings,
    createManagedUser,
    deleteUser,
} from '@/services/admin'
import type { Role, Permission, UserWithRoles, TenantSettings } from '@/services/admin'
import { usePlan } from '@/hooks/usePlan'
import { fetchAllPlans, type Plan } from '@/services/subscription'
import { PlanBadge } from '@/components/PlanBadge'

// ════════════════════════════════════════════════════════════════════════════
// ROLES TAB
// ════════════════════════════════════════════════════════════════════════════

function RoleFormModal({
    role,
    permissions,
    open,
    onClose,
}: {
    role?: Role
    permissions: Permission[]
    open: boolean
    onClose: () => void
}) {
    const qc = useQueryClient()
    const isEdit = !!role

    const [name, setName] = useState(role?.name ?? '')
    const [description, setDescription] = useState(role?.description ?? '')
    const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
    const [loadingPerms, setLoadingPerms] = useState(false)

    // Load permissions for editing role
    useState(() => {
        if (isEdit && role?.id && open) {
            setLoadingPerms(true)
            fetchRolePermissions(role.id)
                .then((ids) => setSelectedPerms(new Set(ids)))
                .finally(() => setLoadingPerms(false))
        } else if (!isEdit) {
            setSelectedPerms(new Set())
            setName('')
            setDescription('')
        }
    })

    const saveMutation = useMutation({
        mutationFn: async () => {
            let roleId = role?.id
            if (isEdit) {
                await updateRole(role!.id, { name, description })
            } else {
                const created = await createRole({ name, description })
                roleId = created.id
            }
            await saveRolePermissions(roleId!, [...selectedPerms])
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-roles'] })
            onClose()
        },
    })

    // Group permissions by module
    const byModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
        if (!acc[p.module]) acc[p.module] = []
        acc[p.module].push(p)
        return acc
    }, {})

    const togglePerm = (id: string) => {
        setSelectedPerms((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleModule = (module: string) => {
        const modulePerms = byModule[module]?.map((p) => p.id) ?? []
        const allSelected = modulePerms.every((id) => selectedPerms.has(id))
        setSelectedPerms((prev) => {
            const next = new Set(prev)
            modulePerms.forEach((id) => {
                if (allSelected) next.delete(id)
                else next.add(id)
            })
            return next
        })
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    <div className="grid gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="role-name">Nome do Cargo *</Label>
                            <Input
                                id="role-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Diretor de Obra"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="role-desc">Descrição</Label>
                            <Input
                                id="role-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Breve descrição das responsabilidades"
                            />
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-medium mb-2">Permissões</p>
                        {loadingPerms ? (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                A carregar permissões...
                            </div>
                        ) : permissions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Nenhuma permissão configurada no sistema.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(byModule).map(([module, perms]) => {
                                    const allSelected = perms.every((p) => selectedPerms.has(p.id))
                                    const someSelected = perms.some((p) => selectedPerms.has(p.id))
                                    return (
                                        <div key={module} className="border rounded-lg p-3">
                                            <button
                                                type="button"
                                                className="flex items-center justify-between w-full"
                                                onClick={() => toggleModule(module)}
                                            >
                                                <span className="text-sm font-semibold capitalize">
                                                    {module}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {someSelected && (
                                                        <span className="text-xs text-primary">
                                                            {perms.filter((p) => selectedPerms.has(p.id)).length}
                                                            /{perms.length}
                                                        </span>
                                                    )}
                                                    <div
                                                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors
                                                        ${allSelected ? 'bg-primary border-primary' : someSelected ? 'border-primary' : 'border-muted-foreground'}`}
                                                    >
                                                        {allSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                                        {!allSelected && someSelected && (
                                                            <div className="h-1.5 w-1.5 bg-primary rounded-sm" />
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                            <div className="mt-2 space-y-1.5 pl-2">
                                                {perms.map((p) => (
                                                    <label
                                                        key={p.id}
                                                        className="flex items-center gap-2.5 cursor-pointer group"
                                                    >
                                                        <div
                                                            onClick={() => togglePerm(p.id)}
                                                            className={`h-4 w-4 rounded border flex items-center justify-center transition-colors cursor-pointer
                                                            ${selectedPerms.has(p.id) ? 'bg-primary border-primary' : 'border-muted-foreground group-hover:border-primary'}`}
                                                        >
                                                            {selectedPerms.has(p.id) && (
                                                                <Check className="h-2.5 w-2.5 text-white" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium">{p.key}</p>
                                                            {p.description && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {p.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={!name.trim() || saveMutation.isPending}
                    >
                        {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {isEdit ? 'Guardar' : 'Criar Cargo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function RolesTab() {
    const qc = useQueryClient()
    const [modalOpen, setModalOpen] = useState(false)
    const [editingRole, setEditingRole] = useState<Role | undefined>()

    const { data: roles = [], isLoading } = useQuery({
        queryKey: ['admin-roles'],
        queryFn: fetchRoles,
    })
    const { data: permissions = [] } = useQuery({
        queryKey: ['admin-permissions'],
        queryFn: fetchPermissions,
    })

    const deleteMutation = useMutation({
        mutationFn: deleteRole,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-roles'] }),
    })

    const openCreate = () => {
        setEditingRole(undefined)
        setModalOpen(true)
    }

    const openEdit = (role: Role) => {
        setEditingRole(role)
        setModalOpen(true)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">
                        Cargos definem conjuntos de permissões atribuídos a utilizadores.
                    </p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Novo Cargo
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : roles.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Shield className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="font-medium">Nenhum cargo criado</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Crie cargos para definir permissões de acesso.
                        </p>
                        <Button size="sm" className="mt-4 gap-1.5" onClick={openCreate}>
                            <Plus className="h-4 w-4" /> Criar primeiro cargo
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {roles.map((role) => (
                        <Card key={role.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="py-3 px-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{role.name}</p>
                                            {role.description && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {role.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {role.is_system_default && (
                                            <Badge variant="secondary" className="text-xs">
                                                Sistema
                                            </Badge>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => openEdit(role)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        {!role.is_system_default && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => {
                                                    if (confirm(`Eliminar o cargo "${role.name}"?`))
                                                        deleteMutation.mutate(role.id)
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <RoleFormModal
                role={editingRole}
                permissions={permissions}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
            />
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// INVITE USER MODAL
// ════════════════════════════════════════════════════════════════════════════

function InviteUserModal({
    roles,
    open,
    onClose,
}: {
    roles: Role[]
    open: boolean
    onClose: () => void
}) {
    const qc = useQueryClient()

    // Form state
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [roleId, setRoleId] = useState('')
    const [success, setSuccess] = useState(false)

    // Validation
    const selectedRole = roles.find((r) => r.id === roleId)
    const isValid = name.trim() && email.trim() && roleId !== ''

    const resetForm = () => {
        setName('')
        setEmail('')
        setRoleId('')
        setSuccess(false)
    }

    const createMutation = useMutation({
        mutationFn: () =>
            createManagedUser({ email: email.trim(), name: name.trim(), roleId }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-users'] })
            setSuccess(true)
            setTimeout(() => {
                resetForm()
                onClose()
            }, 2500)
        },
    })

    const handleClose = () => {
        if (!createMutation.isPending) {
            resetForm()
            onClose()
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserPlus className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>Convidar Utilizador</DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Será enviado um email de convite para o utilizador definir a palavra-passe.
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                        <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Check className="h-7 w-7 text-green-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-green-700">Convite enviado!</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                <strong>{name}</strong> receberá um email em{' '}
                                <span className="font-medium">{email}</span> para definir a palavra-passe.
                            </p>
                            {selectedRole && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Cargo atribuído: <strong>{selectedRole.name}</strong>
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="new-user-name">Nome Completo *</Label>
                            <Input
                                id="new-user-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="João Silva"
                                autoComplete="off"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <Label htmlFor="new-user-email">Email *</Label>
                            <Input
                                id="new-user-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="joao@empresa.com"
                                autoComplete="off"
                            />
                        </div>

                        {/* Role – MANDATORY */}
                        <div className="space-y-1.5">
                            <Label htmlFor="new-user-role">
                                Cargo *{' '}
                                <span className="text-xs font-normal text-muted-foreground">(define o que este utilizador pode ver)</span>
                            </Label>
                            <select
                                id="new-user-role"
                                className={`w-full border rounded-md px-3 py-2 text-sm bg-background ${!roleId ? 'text-muted-foreground' : ''
                                    }`}
                                value={roleId}
                                onChange={(e) => setRoleId(e.target.value)}
                            >
                                <option value="">Selecionar cargo obrigatório...</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}{r.is_system_default ? ' (padrão)' : ''}
                                    </option>
                                ))}
                            </select>
                            {selectedRole?.description && (
                                <p className="text-xs text-muted-foreground pl-1">
                                    {selectedRole.description}
                                </p>
                            )}
                        </div>

                        {/* Error */}
                        {createMutation.isError && (
                            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-destructive">
                                    {(createMutation.error as Error).message}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {!success && (
                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => createMutation.mutate()}
                            disabled={!isValid || createMutation.isPending}
                        >
                            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Enviar Convite
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// ASSIGN ROLE MODAL
// ════════════════════════════════════════════════════════════════════════════

function AssignRoleModal({
    user,
    roles,
    open,
    onClose,
}: {
    user: UserWithRoles
    roles: Role[]
    open: boolean
    onClose: () => void
}) {
    const qc = useQueryClient()
    const [selectedRoleId, setSelectedRoleId] = useState('')

    const assignMutation = useMutation({
        mutationFn: () => assignRoleToUser(user.id, selectedRoleId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-users'] })
            onClose()
        },
    })

    const removeMutation = useMutation({
        mutationFn: (userRoleId: string) => removeUserRole(userRoleId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    })

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Gerir Cargos</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        {user.full_name ?? user.email}
                    </p>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Current roles */}
                    <div>
                        <p className="text-sm font-medium mb-2">Cargos Actuais</p>
                        {user.roles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Nenhum cargo atribuído.
                            </p>
                        ) : (
                            <div className="space-y-1.5">
                                {user.roles.map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between bg-muted rounded px-3 py-1.5"
                                    >
                                        <span className="text-sm font-medium">{r.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                            onClick={() => removeMutation.mutate(r.id)}
                                            disabled={removeMutation.isPending}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add role */}
                    <div>
                        <p className="text-sm font-medium mb-2">Atribuir Cargo</p>
                        <div className="flex gap-2">
                            <select
                                className="flex-1 border rounded-md px-3 py-1.5 text-sm bg-background"
                                value={selectedRoleId}
                                onChange={(e) => setSelectedRoleId(e.target.value)}
                            >
                                <option value="">Selecionar cargo...</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                            <Button
                                size="sm"
                                disabled={!selectedRoleId || assignMutation.isPending}
                                onClick={() => assignMutation.mutate()}
                            >
                                {assignMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function UsersTab() {
    const qc = useQueryClient()
    const [managingUser, setManagingUser] = useState<UserWithRoles | null>(null)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [deletingUser, setDeletingUser] = useState<UserWithRoles | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: fetchUsersWithRoles,
    })
    const { data: roles = [] } = useQuery({
        queryKey: ['admin-roles'],
        queryFn: fetchRoles,
    })

    // Get current user ID to prevent self-deletion
    useState(() => {
        import('@/lib/supabase').then(({ supabase }) =>
            supabase.auth.getUser().then(({ data }) => {
                if (data.user) setCurrentUserId(data.user.id)
            }),
        )
    })

    const deleteMutation = useMutation({
        mutationFn: (userId: string) => deleteUser(userId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-users'] })
            setDeletingUser(null)
        },
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">
                        Todos os utilizadores registados no sistema.
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {users.length} no total
                        {users.filter(u => u.inCurrentTenant).length > 0 && (
                            <> · {users.filter(u => u.inCurrentTenant).length} na equipa</>
                        )}
                        {users.filter(u => u.status === 'pending').length > 0 && (
                            <> · {users.filter(u => u.status === 'pending').length} pendente{users.filter(u => u.status === 'pending').length !== 1 ? 's' : ''}</>
                        )}
                        {users.filter(u => !u.inCurrentTenant).length > 0 && (
                            <> · {users.filter(u => !u.inCurrentTenant).length} externo{users.filter(u => !u.inCurrentTenant).length !== 1 ? 's' : ''}</>
                        )}
                    </p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
                    <Plus className="h-4 w-4" /> Convidar Utilizador
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                                    Utilizador
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                                    Cargos
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                                    Estado
                                </th>
                                <th className="px-4 py-2.5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground text-sm">
                                        Nenhum utilizador encontrado. Convide alguém!
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className={`hover:bg-muted/20 transition-colors ${!u.inCurrentTenant ? 'opacity-60' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${u.inCurrentTenant ? 'bg-primary/10' : 'bg-muted'}`}>
                                                    <span className={`text-xs font-semibold ${u.inCurrentTenant ? 'text-primary' : 'text-muted-foreground'}`}>
                                                        {(u.name ?? u.email ?? '?')[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    {u.name && (
                                                        <p className="font-medium truncate">{u.name}</p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {u.email}
                                                    </p>
                                                    {!u.inCurrentTenant && (
                                                        <p className="text-[10px] text-orange-500">Externo (outro tenant)</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {!u.inCurrentTenant ? (
                                                    <span className="text-muted-foreground text-xs italic">sem acesso</span>
                                                ) : u.roles.length === 0 ? (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                ) : (
                                                    u.roles.map((r) => (
                                                        <Badge
                                                            key={r.id}
                                                            variant="secondary"
                                                            className="text-xs font-normal"
                                                        >
                                                            {r.name}
                                                        </Badge>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            {u.status === 'active' ? (
                                                <Badge variant="outline" className="text-xs font-normal border-green-500/30 text-green-600 bg-green-500/10">
                                                    Ativo
                                                </Badge>
                                            ) : u.status === 'orphan' ? (
                                                <Badge variant="outline" className="text-xs font-normal border-orange-500/30 text-orange-600 bg-orange-500/10">
                                                    Sem perfil
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs font-normal border-yellow-500/30 text-yellow-600 bg-yellow-500/10">
                                                    Pendente
                                                </Badge>
                                            )}
                                            {u.last_sign_in_at && (
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    Último acesso: {new Date(u.last_sign_in_at).toLocaleDateString('pt-PT')}
                                                </p>
                                            )}
                                            {u.created_at && !u.last_sign_in_at && (
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    Criado: {new Date(u.created_at).toLocaleDateString('pt-PT')}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {u.inCurrentTenant && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs gap-1"
                                                        onClick={() => setManagingUser(u)}
                                                    >
                                                        <Shield className="h-3 w-3" />
                                                        Cargos
                                                    </Button>
                                                )}
                                                {u.id !== currentUserId && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                                                        onClick={() => setDeletingUser(u)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        Remover
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <InviteUserModal
                roles={roles}
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
            />

            {managingUser && (
                <AssignRoleModal
                    user={managingUser}
                    roles={roles}
                    open={!!managingUser}
                    onClose={() => setManagingUser(null)}
                />
            )}

            <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover utilizador</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem a certeza que deseja remover <strong>{deletingUser?.name ?? deletingUser?.email}</strong> do sistema?
                            Esta ação é irreversível. O utilizador perderá todo o acesso e os seus dados de perfil serão apagados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {deleteMutation.isError && (
                        <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 border border-destructive/20">
                            Erro ao remover: {(deleteMutation.error as Error)?.message}
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteMutation.isPending}
                            onClick={(e) => {
                                e.preventDefault()
                                if (deletingUser) deleteMutation.mutate(deletingUser.id)
                            }}
                        >
                            {deleteMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    A remover...
                                </span>
                            ) : (
                                'Sim, remover utilizador'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// TENANT TAB
// ════════════════════════════════════════════════════════════════════════════

function TenantTab() {
    const qc = useQueryClient()
    const { data: tenant, isLoading } = useQuery({
        queryKey: ['admin-tenant'],
        queryFn: fetchTenantSettings,
    })

    const [form, setForm] = useState<Partial<TenantSettings>>({})
    const [dirty, setDirty] = useState(false)

    // Populate form when data loads
    if (tenant && !dirty && Object.keys(form).length === 0) {
        setForm({
            name: tenant.name,
            address: tenant.address,
            nif: tenant.nif,
            phone: tenant.phone,
            email: tenant.email,
        })
    }

    const updateMutation = useMutation({
        mutationFn: () => updateTenantSettings(tenant!.id, form),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-tenant'] })
            setDirty(false)
        },
    })

    const handleChange = (key: string, value: string) => {
        setDirty(true)
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!tenant) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="font-medium">Configurações da empresa não encontradas</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6 max-w-lg">
            <p className="text-sm text-muted-foreground">
                Informações e configurações gerais da sua empresa.
            </p>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Dados da Empresa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="tenant-name">Nome da Empresa *</Label>
                        <Input
                            id="tenant-name"
                            value={form.name ?? ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="tenant-nif">NIF / CNPJ</Label>
                        <Input
                            id="tenant-nif"
                            value={form.nif ?? ''}
                            onChange={(e) => handleChange('nif', e.target.value)}
                            placeholder="000.000.000-00"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="tenant-address">Endereço</Label>
                        <Input
                            id="tenant-address"
                            value={form.address ?? ''}
                            onChange={(e) => handleChange('address', e.target.value)}
                            placeholder="Rua, número, cidade"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="tenant-phone">Telefone</Label>
                            <Input
                                id="tenant-phone"
                                value={form.phone ?? ''}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="+55 11 99999-0000"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="tenant-email">Email</Label>
                            <Input
                                id="tenant-email"
                                type="email"
                                value={form.email ?? ''}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="empresa@email.com"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={() => updateMutation.mutate()}
                            disabled={!dirty || !form.name || updateMutation.isPending}
                            className="gap-2"
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Guardar Alterações
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Plano</CardTitle>
                    <CardDescription>Informações sobre o plano actual.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold capitalize">{tenant.plan ?? 'Padrão'}</p>
                            <p className="text-xs text-muted-foreground">
                                Conta criada em{' '}
                                {tenant.created_at
                                    ? new Date(tenant.created_at).toLocaleDateString('pt-PT')
                                    : '—'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// AUDIT TAB
// ════════════════════════════════════════════════════════════════════════════

function AuditTab() {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <History className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-semibold text-lg">Auditoria & Logs</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    O registo de todas as acções do sistema estará disponível em breve.
                </p>
            </CardContent>
        </Card>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// PLAN TAB
// ════════════════════════════════════════════════════════════════════════════

function UsageMeter({
    label,
    current,
    max,
}: {
    label: string
    current: number
    max: number | null
}) {
    const isUnlimited = max === null
    const pct = isUnlimited ? 0 : max > 0 ? Math.min(100, (current / max) * 100) : 0
    const isNearLimit = !isUnlimited && pct >= 80
    const isAtLimit = !isUnlimited && pct >= 100

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">
                    {current} / {isUnlimited ? 'Ilimitado' : max}
                </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${
                        isAtLimit
                            ? 'bg-destructive'
                            : isNearLimit
                              ? 'bg-amber-500'
                              : 'bg-primary'
                    }`}
                    style={{ width: isUnlimited ? '0%' : `${pct}%` }}
                />
            </div>
        </div>
    )
}

function PlanTab() {
    const { plan, subscription, usage, isTrialing, trialDaysRemaining, isLoading } = usePlan()

    const { data: allPlans = [], isLoading: plansLoading } = useQuery({
        queryKey: ['all-plans'],
        queryFn: fetchAllPlans,
        staleTime: 1000 * 60 * 10,
    })

    if (isLoading || plansLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                Informacoes sobre o plano e utilizacao actual da sua empresa.
            </p>

            {/* Trial Banner */}
            {isTrialing && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-semibold">Periodo de Teste</p>
                            <p className="text-sm text-muted-foreground">
                                O seu trial termina em <strong>{trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''}</strong>.
                                {subscription?.trial_ends_at && (
                                    <> ({new Date(subscription.trial_ends_at).toLocaleDateString('pt-PT')})</>
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Current Plan + Usage */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Plano Actual
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {plan ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Building2 className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">{plan.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {plan.price_eur > 0
                                                ? `${plan.price_eur} EUR / mes`
                                                : 'Gratuito'}
                                        </p>
                                    </div>
                                    <PlanBadge />
                                </div>
                                <div className="text-xs text-muted-foreground pt-2">
                                    Estado: <Badge variant="outline" className="text-xs ml-1">{subscription?.status ?? '---'}</Badge>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Nenhum plano configurado.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Utilizacao
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <UsageMeter
                            label="Utilizadores"
                            current={usage?.user_count ?? 0}
                            max={plan?.max_users ?? null}
                        />
                        <UsageMeter
                            label="Obras"
                            current={usage?.obra_count ?? 0}
                            max={plan?.max_obras ?? null}
                        />
                        <UsageMeter
                            label="Funcionarios"
                            current={usage?.employee_count ?? 0}
                            max={plan?.max_employees ?? null}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Plans Comparison */}
            {allPlans.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Comparar Planos</CardTitle>
                        <CardDescription>Veja as funcionalidades e limites de cada plano.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                            Recurso
                                        </th>
                                        {allPlans.map((p) => (
                                            <th
                                                key={p.id}
                                                className={`text-center px-3 py-2 font-medium ${
                                                    p.id === plan?.id
                                                        ? 'text-primary bg-primary/5'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                {p.name}
                                                {p.id === plan?.id && (
                                                    <span className="block text-[10px] font-normal">(actual)</span>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    <tr>
                                        <td className="px-3 py-2">Preco / mes</td>
                                        {allPlans.map((p) => (
                                            <td
                                                key={p.id}
                                                className={`text-center px-3 py-2 ${p.id === plan?.id ? 'bg-primary/5 font-medium' : ''}`}
                                            >
                                                {p.price_eur > 0 ? `${p.price_eur} EUR` : 'Gratis'}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2">Utilizadores</td>
                                        {allPlans.map((p) => (
                                            <td
                                                key={p.id}
                                                className={`text-center px-3 py-2 ${p.id === plan?.id ? 'bg-primary/5' : ''}`}
                                            >
                                                {p.max_users ?? 'Ilimitado'}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2">Obras</td>
                                        {allPlans.map((p) => (
                                            <td
                                                key={p.id}
                                                className={`text-center px-3 py-2 ${p.id === plan?.id ? 'bg-primary/5' : ''}`}
                                            >
                                                {p.max_obras ?? 'Ilimitado'}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2">Funcionarios</td>
                                        {allPlans.map((p) => (
                                            <td
                                                key={p.id}
                                                className={`text-center px-3 py-2 ${p.id === plan?.id ? 'bg-primary/5' : ''}`}
                                            >
                                                {p.max_employees ?? 'Ilimitado'}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2">Payroll</td>
                                        {allPlans.map((p) => (
                                            <td
                                                key={p.id}
                                                className={`text-center px-3 py-2 ${p.id === plan?.id ? 'bg-primary/5' : ''}`}
                                            >
                                                {p.features.payroll ? (
                                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                                ) : (
                                                    <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2">Imobiliario</td>
                                        {allPlans.map((p) => (
                                            <td
                                                key={p.id}
                                                className={`text-center px-3 py-2 ${p.id === plan?.id ? 'bg-primary/5' : ''}`}
                                            >
                                                {p.features.imobiliario ? (
                                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                                ) : (
                                                    <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2">Relatorios Avancados</td>
                                        {allPlans.map((p) => (
                                            <td
                                                key={p.id}
                                                className={`text-center px-3 py-2 ${p.id === plan?.id ? 'bg-primary/5' : ''}`}
                                            >
                                                {p.features.relatorios_avancados ? (
                                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                                ) : (
                                                    <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2">Acesso API</td>
                                        {allPlans.map((p) => (
                                            <td
                                                key={p.id}
                                                className={`text-center px-3 py-2 ${p.id === plan?.id ? 'bg-primary/5' : ''}`}
                                            >
                                                {p.features.api_access ? (
                                                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                                                ) : (
                                                    <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════

export function AdminPage() {
    // Support deep-linking to tabs via ?tab= query param (e.g. from UpgradeBanner)
    const params = new URLSearchParams(window.location.search)
    const defaultTab = params.get('tab') ?? 'users'

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Utilizadores, cargos, permissões e configurações da empresa
                </p>
            </div>

            <Tabs defaultValue={defaultTab}>
                <TabsList className="mb-4">
                    <TabsTrigger value="users" className="gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Utilizadores
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        Cargos
                    </TabsTrigger>
                    <TabsTrigger value="tenant" className="gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Empresa
                    </TabsTrigger>
                    <TabsTrigger value="plano" className="gap-1.5">
                        <CreditCard className="h-3.5 w-3.5" />
                        Plano
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="gap-1.5">
                        <History className="h-3.5 w-3.5" />
                        Auditoria
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <UsersTab />
                </TabsContent>
                <TabsContent value="roles">
                    <RolesTab />
                </TabsContent>
                <TabsContent value="tenant">
                    <TenantTab />
                </TabsContent>
                <TabsContent value="plano">
                    <PlanTab />
                </TabsContent>
                <TabsContent value="audit">
                    <AuditTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
