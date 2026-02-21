import { useQuery } from '@tanstack/react-query'
import { fetchCashflow } from '@/services/cashflow'

export const CASHFLOW_QUERY_KEY = ['cashflow'] as const

export function useCashflow() {
    return useQuery({
        queryKey: CASHFLOW_QUERY_KEY,
        queryFn: fetchCashflow,
    })
}
