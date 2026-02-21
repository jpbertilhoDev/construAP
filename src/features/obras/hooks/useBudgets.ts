import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchBudget,
    createBudget,
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    type BudgetItemInsert,
} from '@/services/budgets'

export function useBudget(obraId: string) {
    return useQuery({
        queryKey: ['budgets', obraId],
        queryFn: () => fetchBudget(obraId),
        enabled: !!obraId,
    })
}

export function useCreateBudget() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createBudget,
        onSuccess: (data) => {
            queryClient.setQueryData(['budgets', data.obra_id], data)
        },
    })
}

export function useAddBudgetItem() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: addBudgetItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] })

            // Ideally we would optimistically update, but invalidate is safer due to DB generated values (total)
        },
    })
}

export function useUpdateBudgetItem() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<BudgetItemInsert> }) =>
            updateBudgetItem(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] })
        },
    })
}

export function useDeleteBudgetItem() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteBudgetItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] })
        },
    })
}
