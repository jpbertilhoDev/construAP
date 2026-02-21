import { Building2, Wallet, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const reports = [
    {
        id: 'budget-actual',
        title: 'Comparativo Orçado vs Real',
        description: 'Verifique a rentabilidade das obras, comparando o valor adjudicado com os custos reais lançados agrupados.',
        icon: Wallet,
        path: '/relatorios/orcamentos',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10'
    },
    {
        id: 'status-obras',
        title: 'Andamento Global de Obras',
        description: 'Verificação em tempo real do status das empreitadas ativas no portefólio.',
        icon: Building2,
        path: '/relatorios/obras',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
    }
]

export function RelatoriosPage() {
    return (
        <div className="space-y-6 animate-fade-in pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Relatórios & Analytics
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Centro de extração analítica. Selecione o relatório pretendido.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => {
                    const Icon = report.icon
                    return (
                        <Card key={report.id} className="group hover:border-primary/50 transition-colors flex flex-col">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className={`p-2.5 rounded-lg ${report.bg}`}>
                                        <Icon className={`h-6 w-6 ${report.color}`} />
                                    </div>
                                </div>
                                <CardTitle className="text-lg mt-4">{report.title}</CardTitle>
                                <CardDescription className="text-sm">
                                    {report.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto pt-4">
                                <Button asChild className="w-full justify-between" variant="outline">
                                    <Link to={report.path}>
                                        Visualizar Relatório
                                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
