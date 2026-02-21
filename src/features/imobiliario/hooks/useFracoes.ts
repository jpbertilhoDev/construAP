import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchFracoes, fetchFracao, createFracao, updateFracao, updateFracaoEstado, deleteFracao,
    fetchPrecoHistorico, updateFracaoPreco,
    fetchReservas, createReserva, cancelarReserva, confirmarVenda, estenderReserva,
    fetchImobDocumentos, uploadImobDocumento, deleteImobDocumento, getImobDocumentoUrl,
    fetchTipologias, createTipologia, deleteTipologia,
    fetchBlocos, createBloco, deleteBloco,
    importFracoesCSV, fetchAuditLog,
    type FracaoInsert, type ReservaInsert, type EstadoComercial, type TipoDocumento, type FracaoCSVRow, type Tipologia,
} from '@/services/fracoes'

// ─── Tipologias ──────────────────────────────────────────────

export function useTipologias(empreendimentoId: string) {
    return useQuery({
        queryKey: ['tipologias', empreendimentoId],
        queryFn: () => fetchTipologias(empreendimentoId),
        enabled: !!empreendimentoId,
    })
}

export function useCreateTipologia(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: createTipologia,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tipologias', empreendimentoId] }),
    })
}

export function useDeleteTipologia(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: deleteTipologia,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tipologias', empreendimentoId] }),
    })
}

// ─── Frações ─────────────────────────────────────────────────

export function useFracoes(empreendimentoId: string) {
    return useQuery({
        queryKey: ['fracoes', empreendimentoId],
        queryFn: () => fetchFracoes(empreendimentoId),
        enabled: !!empreendimentoId,
    })
}

export function useFracao(id: string) {
    return useQuery({
        queryKey: ['fracao', id],
        queryFn: () => fetchFracao(id),
        enabled: !!id,
    })
}

export function useCreateFracao(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: FracaoInsert) => createFracao(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['fracoes', empreendimentoId] }),
    })
}

export function useUpdateFracao(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<FracaoInsert> }) => updateFracao(id, payload),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: ['fracoes', empreendimentoId] })
            qc.invalidateQueries({ queryKey: ['fracao', id] })
        },
    })
}

export function useUpdateFracaoEstado(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, estado, motivo }: { id: string; estado: EstadoComercial; motivo?: string }) =>
            updateFracaoEstado(id, estado, motivo),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['fracoes', empreendimentoId] }),
    })
}

export function useDeleteFracao(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: deleteFracao,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['fracoes', empreendimentoId] }),
    })
}

// ─── Histórico de Preços ─────────────────────────────────────

export function usePrecoHistorico(fracaoId: string) {
    return useQuery({
        queryKey: ['preco-historico', fracaoId],
        queryFn: () => fetchPrecoHistorico(fracaoId),
        enabled: !!fracaoId,
    })
}

export function useUpdateFracaoPreco(empreendimentoId: string, fracaoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ precoNovo, motivo }: { precoNovo: number; motivo: string }) =>
            updateFracaoPreco(fracaoId, precoNovo, motivo),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['fracoes', empreendimentoId] })
            qc.invalidateQueries({ queryKey: ['fracao', fracaoId] })
            qc.invalidateQueries({ queryKey: ['preco-historico', fracaoId] })
        },
    })
}

// ─── Reservas ────────────────────────────────────────────────

export function useReservas(empreendimentoId: string) {
    return useQuery({
        queryKey: ['reservas', empreendimentoId],
        queryFn: () => fetchReservas(empreendimentoId),
        enabled: !!empreendimentoId,
    })
}

export function useCreateReserva(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: ReservaInsert) => createReserva(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['reservas', empreendimentoId] })
            qc.invalidateQueries({ queryKey: ['fracoes', empreendimentoId] })
        },
    })
}

export function useCancelarReserva(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, fracao_id, motivo }: { id: string; fracao_id: string; motivo: string }) =>
            cancelarReserva(id, fracao_id, motivo),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['reservas', empreendimentoId] })
            qc.invalidateQueries({ queryKey: ['fracoes', empreendimentoId] })
        },
    })
}

export function useConfirmarVenda(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, fracao_id }: { id: string; fracao_id: string }) => confirmarVenda(id, fracao_id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['reservas', empreendimentoId] })
            qc.invalidateQueries({ queryKey: ['fracoes', empreendimentoId] })
        },
    })
}

// ─── Documentos ──────────────────────────────────────────────

export function useImobDocumentos(empreendimentoId: string, fracaoId?: string) {
    return useQuery({
        queryKey: ['imob-docs', empreendimentoId, fracaoId ?? 'empreendimento'],
        queryFn: () => fetchImobDocumentos(empreendimentoId, fracaoId),
        enabled: !!empreendimentoId,
    })
}

export function useUploadImobDocumento(empreendimentoId: string, fracaoId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ file, tipo, descricao }: { file: File; tipo: TipoDocumento; descricao: string }) =>
            uploadImobDocumento(empreendimentoId, file, tipo, descricao, fracaoId),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ['imob-docs', empreendimentoId, fracaoId ?? 'empreendimento'] }),
    })
}

export function useDeleteImobDocumento(empreendimentoId: string, fracaoId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) =>
            deleteImobDocumento(id, storagePath),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ['imob-docs', empreendimentoId, fracaoId ?? 'empreendimento'] }),
    })
}

export { getImobDocumentoUrl }

// ─── Blocos ──────────────────────────────────────────────────

export function useBlocos(empreendimentoId: string) {
    return useQuery({
        queryKey: ['blocos', empreendimentoId],
        queryFn: () => fetchBlocos(empreendimentoId),
        enabled: !!empreendimentoId,
    })
}

export function useCreateBloco(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ nome, descricao }: { nome: string; descricao?: string }) =>
            createBloco(empreendimentoId, nome, descricao),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['blocos', empreendimentoId] }),
    })
}

export function useDeleteBloco(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: deleteBloco,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['blocos', empreendimentoId] }),
    })
}

// ─── Extend Reservation ──────────────────────────────────────

export function useEstenderReserva(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, novaDataExpiracao }: { id: string; novaDataExpiracao: string }) =>
            estenderReserva(id, novaDataExpiracao),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['reservas', empreendimentoId] }),
    })
}

// ─── CSV Import ───────────────────────────────────────────────

export function useImportFracoesCSV(empreendimentoId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ rows, tipologias }: { rows: FracaoCSVRow[]; tipologias: Tipologia[] }) =>
            importFracoesCSV(empreendimentoId, rows, tipologias),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['fracoes', empreendimentoId] }),
    })
}

// ─── Audit Log ────────────────────────────────────────────────

export function useAuditLog(empreendimentoId: string) {
    return useQuery({
        queryKey: ['audit-log', empreendimentoId],
        queryFn: () => fetchAuditLog(['empreendimentos', 'fracoes', 'blocos', 'tipologias', 'reservas', 'fracao_preco_historico', 'imob_documentos']),
        enabled: !!empreendimentoId,
    })
}

