import { Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function ImobiliarioPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Imobiliário</h1>
                <p className="text-muted-foreground text-sm mt-1">Empreendimentos e frações</p>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="font-semibold text-lg">Módulo em desenvolvimento</p>
                        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                            A gestão de empreendimentos e frações imobiliárias estará disponível em breve.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
