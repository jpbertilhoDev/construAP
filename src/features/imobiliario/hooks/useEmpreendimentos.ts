import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchEmpreendimentos,
    fetchEmpreendimento,
    createEmpreendimento,
    updateEmpreendimento,
    archiveEmpreendimento,
    deleteEmpreendimento,
    type EmpreendimentoInsert,
} from '@/services/empreendimentos'

export const EMPREENDIMENTOS_KEY = ['empreendimentos'] as const

export function useEmpreendimentos(includeArchived = false) {
    return useQuery({
        queryKey: [...EMPREENDIMENTOS_KEY, { includeArchived }],
        queryFn: () => fetchEmpreendimentos(includeArchived),
    })
}

export function useEmpreendimento(id: string) {
    return useQuery({
        queryKey: [...EMPREENDIMENTOS_KEY, id],
        queryFn: () => fetchEmpreendimento(id),
        enabled: !!id,
    })
}

export function useCreateEmpreendimento() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: EmpreendimentoInsert) => createEmpreendimento(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: EMPREENDIMENTOS_KEY }),
    })
}

export function useUpdateEmpreendimento(id: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: Partial<EmpreendimentoInsert>) => updateEmpreendimento(id, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: EMPREENDIMENTOS_KEY }),
    })
}

export function useArchiveEmpreendimento() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => archiveEmpreendimento(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: EMPREENDIMENTOS_KEY }),
    })
}

export function useDeleteEmpreendimento() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteEmpreendimento(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: EMPREENDIMENTOS_KEY }),
    })
}
