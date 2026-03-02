import { AlertTriangle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

interface SuspendedPageProps {
  reason?: string | null
}

export function SuspendedPage({ reason }: SuspendedPageProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Conta Suspensa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            A sua conta foi suspensa e o acesso ao sistema esta temporariamente limitado.
          </p>

          {reason && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <strong>Motivo:</strong> {reason}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Os seus dados estao seguros e nao serao eliminados.
            Contacte o suporte para reactivar a sua conta.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" asChild>
              <a href="mailto:suporte@construap.pt">
                <Mail className="mr-2 h-4 w-4" />
                Contactar Suporte
              </a>
            </Button>

            <Button variant="ghost" onClick={handleLogout}>
              Terminar Sessao
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
