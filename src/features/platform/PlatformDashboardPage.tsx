import { useQuery } from '@tanstack/react-query'
import { Building2, Users, HardHat, CreditCard, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { fetchPlatformStats } from '@/services/platform'

export function PlatformDashboardPage() {
  const navigate = useNavigate()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: fetchPlatformStats,
    staleTime: 1000 * 60 * 2,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Nao foi possivel carregar as estatisticas.
      </div>
    )
  }

  const kpiCards = [
    {
      label: 'Total Tenants',
      value: stats.total_tenants,
      icon: Building2,
      color: 'text-blue-600 bg-blue-500/10',
    },
    {
      label: 'Total Utilizadores',
      value: stats.total_users,
      icon: Users,
      color: 'text-green-600 bg-green-500/10',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestao global de tenants, planos e utilizacao
          </p>
        </div>
        <Button onClick={() => navigate('/platform/tenants')}>Ver Tenants</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${kpi.color}`}>
                <kpi.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Tenants por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.tenants_by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        status === 'active'
                          ? 'default'
                          : status === 'suspended'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {status === 'active'
                        ? 'Activo'
                        : status === 'suspended'
                          ? 'Suspenso'
                          : status === 'archived'
                            ? 'Arquivado'
                            : status}
                    </Badge>
                  </div>
                  <span className="text-lg font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscricoes por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.subscriptions_by_plan).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{plan}</span>
                  <span className="text-lg font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            Subscricoes por Estado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(stats.subscriptions_by_status).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 rounded-lg border px-4 py-3"
              >
                <Badge
                  variant={
                    status === 'active'
                      ? 'default'
                      : status === 'trialing'
                        ? 'secondary'
                        : status === 'suspended'
                          ? 'destructive'
                          : 'outline'
                  }
                  className="text-xs"
                >
                  {status === 'active'
                    ? 'Activo'
                    : status === 'trialing'
                      ? 'Trial'
                      : status === 'past_due'
                        ? 'Em atraso'
                        : status === 'suspended'
                          ? 'Suspenso'
                          : status === 'canceled'
                            ? 'Cancelado'
                            : status}
                </Badge>
                <span className="text-lg font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
