import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchReceivables,
    fetchReceivablesByObra,
    createReceivable,
    updateReceivableStatus,
    deleteReceivable,
    type ReceivableInsert,
} from '@/services/receivables'
import type { ReceivableStatus } from '@/types/database.types'

export const RECEIVABLES_QUERY_KEY = ['receivables'] as const

export function useReceivables() {
    return useQuery({
        queryKey: RECEIVABLES_QUERY_KEY,
        queryFn: fetchReceivables,
    })
}

export function useReceivablesByObra(obraId: string) {
    return useQuery({
        queryKey: [...RECEIVABLES_QUERY_KEY, 'obra', obraId],
        queryFn: () => fetchReceivablesByObra(obraId),
        enabled: !!obraId,
    })
}

export function useCreateReceivable() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: ReceivableInsert) => createReceivable(payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: RECEIVABLES_QUERY_KEY })

        },
    })
}

export function useUpdateReceivableStatus() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: ReceivableStatus }) =>
            updateReceivableStatus(id, status),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: RECEIVABLES_QUERY_KEY })
        },
    })
}

export function useDeleteReceivable() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteReceivable(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: RECEIVABLES_QUERY_KEY })
        },
    })
}
