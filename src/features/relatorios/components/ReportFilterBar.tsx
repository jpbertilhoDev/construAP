import { useState } from 'react'
import { Search, Filter, CalendarDays, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useObras } from '@/features/obras/hooks/useObras'
import type { ReportFilters } from '@/services/relatorios'

interface ReportFilterBarProps {
    onFilterChange: (filters: ReportFilters) => void
    showDates?: boolean
    showObras?: boolean
}

export function ReportFilterBar({ onFilterChange, showDates = true, showObras = true }: ReportFilterBarProps) {
    const { data: obras = [] } = useObras()

    const [filters, setFilters] = useState<ReportFilters>({})

    const handleApply = () => {
        onFilterChange(filters)
    }

    const handleClear = () => {
        setFilters({})
        onFilterChange({})
    }

    return (
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm mb-4 flex flex-col sm:flex-row gap-3 items-end">
            {showObras && (
                <div className="space-y-1.5 w-full sm:w-64">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Filter className="h-3 w-3" /> Obra Específica
                    </label>
                    <Select value={filters.obra_id || 'all'} onValueChange={v => setFilters(p => ({ ...p, obra_id: v === 'all' ? undefined : v }))}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Todas as obras" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as obras</SelectItem>
                            {obras.map(obra => (
                                <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {showDates && (
                <>
                    <div className="space-y-1.5 w-full sm:w-40">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <CalendarDays className="h-3 w-3" /> Data Início
                        </label>
                        <Input
                            type="date"
                            className="bg-background"
                            value={filters.start_date || ''}
                            onChange={e => setFilters(p => ({ ...p, start_date: e.target.value || undefined }))}
                        />
                    </div>
                    <div className="space-y-1.5 w-full sm:w-40">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <CalendarDays className="h-3 w-3" /> Data Fim
                        </label>
                        <Input
                            type="date"
                            className="bg-background"
                            value={filters.end_date || ''}
                            onChange={e => setFilters(p => ({ ...p, end_date: e.target.value || undefined }))}
                        />
                    </div>
                </>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button onClick={handleApply} className="gap-1.5 flex-1 sm:flex-none">
                    <Search className="h-4 w-4" /> Atualizar
                </Button>
                {Object.keys(filters).length > 0 && Object.values(filters).some(v => v !== undefined) && (
                    <Button variant="ghost" size="icon" onClick={handleClear} title="Limpar Filtros" className="text-muted-foreground">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
