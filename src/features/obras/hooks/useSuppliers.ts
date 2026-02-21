import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSuppliers, createSupplier, type SupplierInsert } from '@/services/suppliers'

export const SUPPLIERS_QUERY_KEY = ['suppliers'] as const

export function useSuppliers() {
    return useQuery({
        queryKey: SUPPLIERS_QUERY_KEY,
        queryFn: fetchSuppliers,
    })
}

export function useCreateSupplier() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: SupplierInsert) => createSupplier(payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY })
        },
    })
}
