import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchCosts,
    createCost,
    updateCost,
    deleteCost,
    type CostInsert,
} from '@/services/costs'

export function useCosts(obraId: string) {
    return useQuery({
        queryKey: ['costs', obraId],
        queryFn: () => fetchCosts(obraId),
        enabled: !!obraId,
    })
}

export function useCreateCost() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createCost,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['costs', data.obra_id] })
        },
    })
}

export function useUpdateCost(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<CostInsert> }) =>
            updateCost(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['costs', obraId] })
        },
    })
}

export function useDeleteCost(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteCost,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['costs', obraId] })
        },
    })
}
