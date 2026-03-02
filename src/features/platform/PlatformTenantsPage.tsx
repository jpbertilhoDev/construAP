import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  ArrowLeft,
  Loader2,
  Search,
  ShieldBan,
  ShieldCheck,
  Eye,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Link, useNavigate } from 'react-router-dom'
import { fetchAllTenants, updateTenant, type PlatformTenant } from '@/services/platform'

const statusLabels: Record<string, string> = {
  active: 'Activo',
  suspended: 'Suspenso',
  archived: 'Arquivado',
}

const statusVariants: Record<string, 'default' | 'destructive' | 'secondary'> = {
  active: 'default',
  suspended: 'destructive',
  archived: 'secondary',
}

export function PlatformTenantsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [actionTenant, setActionTenant] = useState<{
    tenant: PlatformTenant
    action: 'suspend' | 'activate'
  } | null>(null)

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: fetchAllTenants,
    staleTime: 1000 * 60 * 2,
  })

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!actionTenant) return
      const { tenant, action } = actionTenant
      await updateTenant(tenant.id, {
        status: action === 'suspend' ? 'suspended' : 'active',
        suspensionReason:
          action === 'suspend' ? 'Suspensao manual pelo platform admin' : undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
      qc.invalidateQueries({ queryKey: ['platform-stats'] })
      setActionTenant(null)
    },
  })

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.nif?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/platform">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground text-sm">
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} registados
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, email ou NIF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Nenhum tenant encontrado</p>
            {search && (
              <p className="text-sm text-muted-foreground mt-1">
                Tente alterar os filtros de pesquisa.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Empresa
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                  Plano
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                  Estado
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                  Utilizacao
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {tenant.name[0]?.toUpperCase() ?? 'T'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{tenant.name}</p>
                        {tenant.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {tenant.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs capitalize">
                      {tenant.subscription?.plan_id ?? tenant.plan ?? 'N/A'}
                    </Badge>
                    {tenant.subscription?.status === 'trialing' && (
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Trial
                        {tenant.subscription.trial_ends_at &&
                          ` ate ${new Date(tenant.subscription.trial_ends_at).toLocaleDateString('pt-PT')}`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge
                      variant={statusVariants[tenant.status] ?? 'outline'}
                      className="text-xs"
                    >
                      {statusLabels[tenant.status] ?? tenant.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{tenant.usage.user_count} users</span>
                      <span>{tenant.usage.obra_count} obras</span>
                      <span>{tenant.usage.employee_count} func.</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => navigate(`/platform/tenants/${tenant.id}`)}
                      >
                        <Eye className="h-3 w-3" />
                        Ver
                      </Button>
                      {tenant.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                          onClick={() =>
                            setActionTenant({ tenant, action: 'suspend' })
                          }
                        >
                          <ShieldBan className="h-3 w-3" />
                          Suspender
                        </Button>
                      ) : tenant.status === 'suspended' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-green-600 hover:text-green-600 hover:bg-green-500/10 border-green-500/30"
                          onClick={() =>
                            setActionTenant({ tenant, action: 'activate' })
                          }
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Activar
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action confirmation dialog */}
      <AlertDialog
        open={!!actionTenant}
        onOpenChange={(open) => !open && setActionTenant(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTenant?.action === 'suspend'
                ? 'Suspender Tenant'
                : 'Activar Tenant'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTenant?.action === 'suspend'
                ? `Tem a certeza que deseja suspender "${actionTenant?.tenant.name}"? O tenant ficara com acesso apenas de leitura.`
                : `Tem a certeza que deseja reactivar "${actionTenant?.tenant.name}"? O tenant voltara a ter acesso completo.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionMutation.isError && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 border border-destructive/20">
              Erro: {(actionMutation.error as Error)?.message}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                actionTenant?.action === 'suspend'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
              disabled={actionMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                actionMutation.mutate()
              }}
            >
              {actionMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A processar...
                </span>
              ) : actionTenant?.action === 'suspend' ? (
                'Sim, suspender'
              ) : (
                'Sim, activar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
