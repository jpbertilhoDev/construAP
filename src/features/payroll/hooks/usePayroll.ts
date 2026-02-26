import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    fetchPayrollConfig,
    upsertPayrollConfig,
    fetchPayrollRuns,
    fetchPayrollRun,
    fetchPayrollLines,
    previewPayroll,
    processPayroll,
    updatePayrollRunStatus,
    type PayrollProcessOptions,
    type PayrollConfig,
} from '@/services/payroll'

const CONFIG_KEY = ['payroll_config'] as const
const RUNS_KEY = ['payroll_runs'] as const
const RUN_KEY = (id: string) => ['payroll_runs', id] as const
const LINES_KEY = (runId: string) => ['payroll_lines', runId] as const
const PREVIEW_KEY = (opts: PayrollProcessOptions) => ['payroll_preview', opts] as const

// ── Config ──────────────────────────────────────────────────

export function usePayrollConfig() {
    return useQuery({
        queryKey: CONFIG_KEY,
        queryFn: fetchPayrollConfig,
    })
}

export function useUpdatePayrollConfig() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: Partial<Omit<PayrollConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>) =>
            upsertPayrollConfig(payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: CONFIG_KEY })
            toast.success('Configuração atualizada')
        },
        onError: (err: Error) => {
            toast.error(err.message)
        },
    })
}

// ── Runs ────────────────────────────────────────────────────

export function usePayrollRuns() {
    return useQuery({
        queryKey: RUNS_KEY,
        queryFn: fetchPayrollRuns,
    })
}

export function usePayrollRun(id: string) {
    return useQuery({
        queryKey: RUN_KEY(id),
        queryFn: () => fetchPayrollRun(id),
        enabled: !!id,
    })
}

// ── Lines ───────────────────────────────────────────────────

export function usePayrollRunLines(runId: string) {
    return useQuery({
        queryKey: LINES_KEY(runId),
        queryFn: () => fetchPayrollLines(runId),
        enabled: !!runId,
    })
}

// ── Preview ─────────────────────────────────────────────────

export function usePayrollPreview(options: PayrollProcessOptions | null) {
    return useQuery({
        queryKey: options ? PREVIEW_KEY(options) : ['payroll_preview_disabled'],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guarded by enabled: !!options
        queryFn: () => previewPayroll(options!),
        enabled: !!options,
    })
}

// ── Process ─────────────────────────────────────────────────

export function useProcessPayroll() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (opts: PayrollProcessOptions) => processPayroll(opts),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: RUNS_KEY })
            toast.success('Processamento salarial concluído')
        },
        onError: (err: Error) => {
            toast.error(err.message)
        },
    })
}

// ── Finalize ────────────────────────────────────────────────

export function useFinalizePayroll() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => updatePayrollRunStatus(id, 'Finalizado'),
        onSuccess: (_d, id) => {
            void qc.invalidateQueries({ queryKey: RUNS_KEY })
            void qc.invalidateQueries({ queryKey: RUN_KEY(id) })
            toast.success('Processamento finalizado')
        },
        onError: (err: Error) => {
            toast.error(err.message)
        },
    })
}

// ── Cancel ──────────────────────────────────────────────────

export function useCancelPayroll() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => updatePayrollRunStatus(id, 'Anulado'),
        onSuccess: (_d, id) => {
            void qc.invalidateQueries({ queryKey: RUNS_KEY })
            void qc.invalidateQueries({ queryKey: RUN_KEY(id) })
            toast.success('Processamento anulado')
        },
        onError: (err: Error) => {
            toast.error(err.message)
        },
    })
}
