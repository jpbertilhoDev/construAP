import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    fetchDiarioEntries,
    fetchDiarioEntriesByDateRange,
    createDiarioEntry,
    updateDiarioEntry,
    deleteDiarioEntry,
    createDiarioIncident,
    deleteDiarioIncident,
    uploadDiarioPhoto,
    deleteDiarioPhoto,
    type DiarioEntryInsert,
} from '@/services/diario'

// ── Diary Entries ───────────────────────────────────────────

export function useDiarioEntries(obraId: string) {
    return useQuery({
        queryKey: ['diario', obraId],
        queryFn: () => fetchDiarioEntries(obraId),
        enabled: !!obraId,
    })
}

export function useDiarioEntriesByRange(obraId: string, startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['diario', obraId, 'range', startDate, endDate],
        queryFn: () => fetchDiarioEntriesByDateRange(obraId, startDate, endDate),
        enabled: !!obraId && !!startDate && !!endDate,
    })
}

export function useCreateDiarioEntry() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createDiarioEntry,
        onSuccess: (data) => {
            void queryClient.invalidateQueries({ queryKey: ['diario', data.obra_id] })
        },
    })
}

export function useUpdateDiarioEntry(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<DiarioEntryInsert> }) =>
            updateDiarioEntry(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['diario', obraId] })
        },
    })
}

export function useDeleteDiarioEntry(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteDiarioEntry,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['diario', obraId] })
        },
    })
}

// ── Incidents ───────────────────────────────────────────────

export function useCreateDiarioIncident(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({
            entryId,
            description,
            severity,
        }: {
            entryId: string
            description: string
            severity: string
        }) => createDiarioIncident(entryId, description, severity),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['diario', obraId] })
            toast.success('Ocorrência registada.')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao registar ocorrência.')
        },
    })
}

export function useDeleteDiarioIncident(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteDiarioIncident,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['diario', obraId] })
            toast.success('Ocorrência removida.')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao apagar ocorrência.')
        },
    })
}

// ── Photos ──────────────────────────────────────────────────

export function useUploadDiarioPhoto(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({
            entryId,
            file,
            caption,
        }: {
            entryId: string
            file: File
            caption?: string
        }) => uploadDiarioPhoto(entryId, obraId, file, caption),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['diario', obraId] })
            toast.success('Foto adicionada.')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao carregar foto.')
        },
    })
}

export function useDeleteDiarioPhoto(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) =>
            deleteDiarioPhoto(id, storagePath),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['diario', obraId] })
            toast.success('Foto removida.')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao apagar foto.')
        },
    })
}
