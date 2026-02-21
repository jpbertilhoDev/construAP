import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchPayables,
    createPayable,
    updatePayableStatus,
    deletePayable,
    type PayableInsert,
} from '@/services/payables'
import type { PayableStatus } from '@/types/database.types'

export const PAYABLES_QUERY_KEY = ['payables'] as const

export function usePayables() {
    return useQuery({
        queryKey: PAYABLES_QUERY_KEY,
        queryFn: fetchPayables,
    })
}

export function useCreatePayable() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: PayableInsert) => createPayable(payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: PAYABLES_QUERY_KEY })
        },
    })
}

export function useUpdatePayableStatus() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: PayableStatus }) =>
            updatePayableStatus(id, status),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: PAYABLES_QUERY_KEY })
        },
    })
}

export function useDeletePayable() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deletePayable(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: PAYABLES_QUERY_KEY })
        },
    })
}
