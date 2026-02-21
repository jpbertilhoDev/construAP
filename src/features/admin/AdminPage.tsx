import { Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function AdminPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
                <p className="text-muted-foreground text-sm mt-1">Utilizadores, empresa e auditoria</p>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Settings className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="font-semibold text-lg">Módulo em desenvolvimento</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
