import { ArrowUpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

const featureLabels: Record<string, string> = {
  payroll: 'Folhas de Pagamento (Payroll)',
  imobiliario: 'Gestao Imobiliaria',
  relatorios_avancados: 'Relatorios Avancados',
  api_access: 'Acesso API',
}

const featurePlans: Record<string, string> = {
  payroll: 'Starter',
  imobiliario: 'Profissional',
  relatorios_avancados: 'Starter',
  api_access: 'Empresarial',
}

interface UpgradeBannerProps {
  /** Feature key that's not available */
  feature?: string
  /** Current plan name for display */
  currentPlan?: string
  /** Custom message override */
  message?: string
  /** For resource limits (obras, users, employees) */
  resource?: string
}

export function UpgradeBanner({ feature, currentPlan, message, resource }: UpgradeBannerProps) {
  const navigate = useNavigate()

  const featureLabel = feature ? featureLabels[feature] ?? feature : resource
  const requiredPlan = feature ? featurePlans[feature] ?? 'um plano superior' : 'um plano superior'

  const displayMessage =
    message ??
    (resource
      ? `Atingiu o limite de ${resource} no plano ${currentPlan ?? 'atual'}. Atualize para continuar.`
      : `A funcionalidade "${featureLabel}" nao esta disponivel no plano ${currentPlan ?? 'atual'}. Necessita do plano ${requiredPlan} ou superior.`)

  return (
    <div className="flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ArrowUpCircle className="h-7 w-7 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Funcionalidade Indisponivel</h3>
            <p className="text-sm text-muted-foreground">{displayMessage}</p>
          </div>

          <Button onClick={() => navigate('/admin?tab=plano')}>Ver Planos</Button>
        </CardContent>
      </Card>
    </div>
  )
}
