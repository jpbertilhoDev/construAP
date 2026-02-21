import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchDocumentsByObra,
    createDocument,
    deleteDocument,
    getDocumentUrl,
} from '@/services/documents'
import { toast } from 'sonner'

export const DOCUMENTS_QUERY_KEY = ['documents'] as const

export function useDocumentsByObra(obraId: string) {
    return useQuery({
        queryKey: [...DOCUMENTS_QUERY_KEY, 'obra', obraId],
        queryFn: () => fetchDocumentsByObra(obraId),
        enabled: !!obraId,
    })
}

export function useCreateDocument() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ obraId, file, name, category }: { obraId: string; file: File; name: string; category?: string }) =>
            createDocument(obraId, file, name, category),
        onSuccess: (_, variables) => {
            void qc.invalidateQueries({ queryKey: [...DOCUMENTS_QUERY_KEY, 'obra', variables.obraId] })
            toast.success('Documento carregado com sucesso!')
        },
        onError: (error) => {
            toast.error(error.message || 'Erro ao carregar documento.')
        }
    })
}

export function useDeleteDocument() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, storagePath }: { id: string; storagePath: string; obraId: string }) =>
            deleteDocument(id, storagePath),
        onSuccess: (_, variables) => {
            void qc.invalidateQueries({ queryKey: [...DOCUMENTS_QUERY_KEY, 'obra', variables.obraId] })
            toast.success('Documento apagado com sucesso!')
        },
        onError: (error) => {
            toast.error(error.message || 'Erro ao apagar documento.')
        }
    })
}

// Hook that simply returns the async function (we don't cache signed URLs to avoid complexity, just fetch on demand)
export function useDocumentUrl() {
    return {
        getSignedUrl: getDocumentUrl
    }
}
