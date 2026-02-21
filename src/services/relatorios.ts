import { supabase } from '@/lib/supabase'

export interface ObraStatusReport {
    obra_id: string
    tenant_id: string
    obra_name: string
    obra_ref: string | null
    status: string
    type: string
    start_date: string | null
    end_date_planned: string | null
    end_date_actual: string | null
    contract_value: number
}

export interface BudgetVsActualReport {
    obra_id: string
    obra_name: string
    obra_status: string
    contract_value: number
    total_costs: number
    profit_margin: number
    profit_percentage: number
}

export interface TimesheetAggregateReport {
    obra_id: string
    obra_name: string
    employee_id: string
    employee_name: string
    total_horas: number
    total_presencas: number
    total_cost_calculated: number
}

export interface ReportFilters {
    obra_id?: string
    start_date?: string
    end_date?: string
}

export async function fetchObrasStatus(): Promise<ObraStatusReport[]> {
    const { data, error } = await supabase.from('vw_report_obra_status').select('*')
    if (error) throw new Error(error.message)
    return data as ObraStatusReport[]
}

export async function fetchBudgetVsActual(filters: ReportFilters = {}): Promise<BudgetVsActualReport[]> {
    const { data, error } = await supabase.rpc('get_report_budget_vs_actual', {
        p_obra_id: filters.obra_id || undefined,
        p_start_date: filters.start_date || undefined,
        p_end_date: filters.end_date || undefined
    } as any)
    if (error) throw new Error(error.message)
    return data as BudgetVsActualReport[]
}

export async function fetchTimesheetAggregate(filters: ReportFilters = {}): Promise<TimesheetAggregateReport[]> {
    const { data, error } = await supabase.rpc('get_report_timesheet_aggregate', {
        p_obra_id: filters.obra_id || undefined,
        p_start_date: filters.start_date || undefined,
        p_end_date: filters.end_date || undefined
    } as any)
    if (error) throw new Error(error.message)
    return data as TimesheetAggregateReport[]
}

export async function logReportExport(reportName: string, format: string, filters: Record<string, any> = {}): Promise<void> {
    const { error } = await supabase.rpc('log_report_export', {
        p_report_name: reportName,
        p_format: format,
        p_filters: filters || {}
    } as any)
    if (error) console.error('Failed to log report export:', error)
}
