import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchDiarioEntries,
    createDiarioEntry,
    updateDiarioEntry,
    deleteDiarioEntry,
    type DiarioEntryInsert,
} from '@/services/diario'

export function useDiarioEntries(obraId: string) {
    return useQuery({
        queryKey: ['diario', obraId],
        queryFn: () => fetchDiarioEntries(obraId),
        enabled: !!obraId,
    })
}

export function useCreateDiarioEntry() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createDiarioEntry,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['diario', data.obra_id] })
        },
    })
}

export function useUpdateDiarioEntry(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<DiarioEntryInsert> }) =>
            updateDiarioEntry(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diario', obraId] })
        },
    })
}

export function useDeleteDiarioEntry(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteDiarioEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diario', obraId] })
        },
    })
}
