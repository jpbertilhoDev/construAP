import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  Users,
  HardHat,
  Loader2,
  ShieldBan,
  ShieldCheck,
  CreditCard,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  fetchAllTenants,
  updateTenant,
  type PlatformTenant,
} from '@/services/platform'
import { fetchAllPlans } from '@/services/subscription'

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

export function PlatformTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const [confirmAction, setConfirmAction] = useState<'suspend' | 'activate' | null>(null)
  const [newPlanId, setNewPlanId] = useState<string | null>(null)

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: fetchAllTenants,
    staleTime: 1000 * 60 * 2,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['all-plans'],
    queryFn: fetchAllPlans,
    staleTime: 1000 * 60 * 10,
  })

  const tenant: PlatformTenant | undefined = tenants.find((t) => t.id === id)

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!tenant || !confirmAction) return
      await updateTenant(tenant.id, {
        status: confirmAction === 'suspend' ? 'suspended' : 'active',
        suspensionReason:
          confirmAction === 'suspend' ? 'Suspensao manual pelo platform admin' : undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
      setConfirmAction(null)
    },
  })

  const planMutation = useMutation({
    mutationFn: async () => {
      if (!tenant || !newPlanId) return
      await updateTenant(tenant.id, { planId: newPlanId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
      setNewPlanId(null)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/platform/tenants">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div className="text-center py-16 text-muted-foreground">
          Tenant nao encontrado.
        </div>
      </div>
    )
  }

  const currentPlanId = tenant.subscription?.plan_id ?? tenant.plan

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/platform/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight truncate">{tenant.name}</h1>
            <Badge
              variant={statusVariants[tenant.status] ?? 'outline'}
              className="text-xs"
            >
              {statusLabels[tenant.status] ?? tenant.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            ID: {tenant.id.slice(0, 8)}... | Criado em{' '}
            {new Date(tenant.created_at).toLocaleDateString('pt-PT')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Informacoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p className="font-medium">{tenant.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">NIF</p>
                <p className="font-medium">{tenant.nif ?? '---'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{tenant.email ?? '---'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado</p>
                <Badge
                  variant={statusVariants[tenant.status] ?? 'outline'}
                  className="text-xs"
                >
                  {statusLabels[tenant.status] ?? tenant.status}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {tenant.status === 'active' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setConfirmAction('suspend')}
                >
                  <ShieldBan className="h-3.5 w-3.5" />
                  Suspender
                </Button>
              ) : tenant.status === 'suspended' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-green-600 hover:text-green-600"
                  onClick={() => setConfirmAction('activate')}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Reactivar
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HardHat className="h-4 w-4" />
              Utilizacao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageStat label="Utilizadores" value={tenant.usage.user_count} icon={Users} />
            <UsageStat label="Obras" value={tenant.usage.obra_count} icon={HardHat} />
            <UsageStat
              label="Funcionarios"
              value={tenant.usage.employee_count}
              icon={Users}
            />
            <div className="text-xs text-muted-foreground pt-1">
              Storage: {(tenant.usage.storage_bytes / (1024 * 1024)).toFixed(1)} MB
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscricao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tenant.subscription ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Plano</p>
                  <p className="font-medium capitalize">{tenant.subscription.plan_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado Subscricao</p>
                  <Badge variant="outline" className="text-xs">
                    {tenant.subscription.status}
                  </Badge>
                </div>
                {tenant.subscription.trial_ends_at && (
                  <div>
                    <p className="text-muted-foreground">Trial ate</p>
                    <p className="font-medium">
                      {new Date(tenant.subscription.trial_ends_at).toLocaleDateString(
                        'pt-PT',
                      )}
                    </p>
                  </div>
                )}
                {tenant.subscription.current_period_end && (
                  <div>
                    <p className="text-muted-foreground">Periodo ate</p>
                    <p className="font-medium">
                      {new Date(
                        tenant.subscription.current_period_end,
                      ).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem subscricao registada.</p>
            )}
          </CardContent>
        </Card>

        {/* Change Plan Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alterar Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Plano actual: <span className="font-semibold capitalize">{currentPlanId ?? 'N/A'}</span></Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={newPlanId ?? ''}
                onChange={(e) => setNewPlanId(e.target.value || null)}
              >
                <option value="">Selecionar novo plano...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === currentPlanId}>
                    {p.name} ({p.price_eur > 0 ? `${p.price_eur} EUR/mes` : 'Gratuito'})
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              disabled={!newPlanId || planMutation.isPending}
              onClick={() => planMutation.mutate()}
            >
              {planMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Aplicar Plano
            </Button>
            {planMutation.isError && (
              <p className="text-sm text-destructive">
                {(planMutation.error as Error)?.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Action Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'suspend' ? 'Suspender Tenant' : 'Activar Tenant'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'suspend'
                ? `Tem a certeza que deseja suspender "${tenant.name}"? O tenant ficara com acesso apenas de leitura.`
                : `Tem a certeza que deseja reactivar "${tenant.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {statusMutation.isError && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 border border-destructive/20">
              Erro: {(statusMutation.error as Error)?.message}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmAction === 'suspend'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
              disabled={statusMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                statusMutation.mutate()
              }}
            >
              {statusMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A processar...
                </span>
              ) : confirmAction === 'suspend' ? (
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

function UsageStat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ElementType
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </div>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  )
}
