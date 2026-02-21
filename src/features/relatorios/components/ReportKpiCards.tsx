import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface ReportKpiData {
    id: string
    title: string
    value: string | number
    subtext?: string
    icon?: React.ReactNode
    colorHint?: 'default' | 'success' | 'warning' | 'danger'
}

interface ReportKpiCardsProps {
    data: ReportKpiData[]
}

export function ReportKpiCards({ data }: ReportKpiCardsProps) {
    if (!data || data.length === 0) return null

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {data.map((kpi) => {
                let textColor = 'text-foreground'
                switch (kpi.colorHint) {
                    case 'success': textColor = 'text-emerald-500'; break
                    case 'warning': textColor = 'text-amber-500'; break
                    case 'danger': textColor = 'text-red-500'; break
                }

                return (
                    <Card key={kpi.id} className="overflow-hidden">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground truncate max-w-[140px] sm:max-w-[200px]">
                                        {kpi.title}
                                    </p>
                                    <h4 className={cn('text-2xl font-bold mt-1 tracking-tight', textColor)}>
                                        {kpi.value}
                                    </h4>
                                    {kpi.subtext && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {kpi.subtext}
                                        </p>
                                    )}
                                </div>
                                {kpi.icon && (
                                    <div className="text-muted-foreground/30 ml-2">
                                        {kpi.icon}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
