import { useQuery, useMutation } from '@tanstack/react-query'
import {
    fetchObrasStatus,
    fetchBudgetVsActual,
    fetchTimesheetAggregate,
    logReportExport,
    type ReportFilters
} from '@/services/relatorios'

export const REPORTS_KEYS = {
    all: ['relatorios'] as const,
    obrasStatus: () => [...REPORTS_KEYS.all, 'obras-status'] as const,
    budgetActual: (filters: ReportFilters) => [...REPORTS_KEYS.all, 'budget-actual', filters] as const,
    timesheetAgg: (filters: ReportFilters) => [...REPORTS_KEYS.all, 'timesheet-aggregate', filters] as const,
}

export function useReportObrasStatus() {
    return useQuery({
        queryKey: REPORTS_KEYS.obrasStatus(),
        queryFn: fetchObrasStatus,
    })
}

export function useReportBudgetActual(filters: ReportFilters = {}) {
    return useQuery({
        queryKey: REPORTS_KEYS.budgetActual(filters),
        queryFn: () => fetchBudgetVsActual(filters),
    })
}

export function useReportTimesheetAggregate(filters: ReportFilters = {}) {
    return useQuery({
        queryKey: REPORTS_KEYS.timesheetAgg(filters),
        queryFn: () => fetchTimesheetAggregate(filters),
    })
}

export function useLogReportExport() {
    return useMutation({
        mutationFn: ({ reportName, format, filters }: { reportName: string, format: string, filters?: Record<string, any> }) => logReportExport(reportName, format, filters),
        // No invalidation needed usually, maybe invalidate audit log if we had it
    })
}
