import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchObras,
    fetchObra,
    fetchObraFinancials,
    fetchAllObraFinancials,
    createObra,
    updateObra,
    deleteObra,

    type ObraInsert,
    type ObraUpdate,
} from '@/services/obras'

export const OBRAS_QUERY_KEY = ['obras'] as const

export function useObras() {
    return useQuery({
        queryKey: OBRAS_QUERY_KEY,
        queryFn: fetchObras,
    })
}

export function useObra(id: string) {
    return useQuery({
        queryKey: [...OBRAS_QUERY_KEY, id],
        queryFn: () => fetchObra(id),
        enabled: !!id,
    })
}

export function useObraFinancials(id: string) {
    return useQuery({
        queryKey: [...OBRAS_QUERY_KEY, id, 'financials'],
        queryFn: () => fetchObraFinancials(id),
        enabled: !!id,
    })
}


export function useAllObraFinancials() {
    return useQuery({
        queryKey: [...OBRAS_QUERY_KEY, 'financials-all'],
        queryFn: fetchAllObraFinancials,
    })
}

export function useCreateObra() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: ObraInsert) => createObra(payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: OBRAS_QUERY_KEY })
        },
    })
}

export function useUpdateObra(id: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: ObraUpdate) => updateObra(id, payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: OBRAS_QUERY_KEY })
            void qc.invalidateQueries({ queryKey: [...OBRAS_QUERY_KEY, id] })
        },
    })
}

export function useDeleteObra() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteObra(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: OBRAS_QUERY_KEY })
        },
    })
}
