import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, TrendingUp, HandCoins } from 'lucide-react'

import { PayablesTab } from '@/features/finance/components/PayablesTab'
import { ReceivablesTab } from '@/features/finance/components/ReceivablesTab'
import { CashflowDashboard } from '@/features/finance/components/CashflowDashboard'

import { usePayables } from '@/features/finance/hooks/usePayables'
import { useReceivables } from '@/features/finance/hooks/useReceivables'
import { useCashflow } from '@/features/finance/hooks/useCashflow'
import { formatCurrency } from '@/lib/utils'


export function FinancePage() {
    const { data: payables } = usePayables()
    const { data: receivables } = useReceivables()
    const { data: cashflow } = useCashflow()

    const totalToPay = payables?.filter(p => p.status === 'Pendente' || p.status === 'Parcial').reduce((acc, curr) => acc + curr.amount, 0) || 0
    const totalToReceive = receivables?.filter(r => r.status === 'Pendente' || r.status === 'Parcial').reduce((acc, curr) => acc + curr.amount, 0) || 0
    const currentCash = cashflow?.reduce((acc, curr) => acc + Number(curr.net_amount), 0) || 0

    return (

        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Financeiro</h1>
                <p className="text-muted-foreground mt-1">
                    Gestão de tesouraria, contas a pagar e contas a receber.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Caixa (Real)</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{formatCurrency(currentCash)}</div>
                        <p className="text-xs text-muted-foreground">Será calculado com as transações</p>
                    </CardContent>

                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contas a Pagar</CardTitle>
                        <TrendingUp className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{formatCurrency(totalToPay)}</div>
                        <p className="text-xs text-muted-foreground">Valor pendente</p>
                    </CardContent>

                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contas a Receber</CardTitle>
                        <HandCoins className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{formatCurrency(totalToReceive)}</div>
                        <p className="text-xs text-muted-foreground">Valor pendente</p>
                    </CardContent>

                </Card>
            </div>

            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
                    <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-4">
                    <CashflowDashboard />
                </TabsContent>

                <TabsContent value="payables" className="mt-4">
                    <PayablesTab />
                </TabsContent>

                <TabsContent value="receivables" className="mt-4">
                    <ReceivablesTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
