import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchSuppliers, fetchSupplier, createSupplier, updateSupplier,
    fetchMaterials, createMaterial, updateMaterial,
    fetchPurchaseOrders, fetchPurchaseOrder, createPurchaseOrder, updatePOStatus,
    createGoodsReceipt, fetchGoodsReceipts, fetchGoodsReceiptLines,
    fetchConsumptions, createConsumption,
    type NewPOLine, type NewGRNLine,
} from '@/services/materiais'

const SUPPLIERS_KEY = ['suppliers']
const MATERIALS_KEY = ['materials']
const PO_KEY = ['purchase_orders']
const poKey = (id: string) => [...PO_KEY, id]
const GRN_KEY = (poId: string) => ['goods_receipts', poId]
const CONSUMPTIONS_KEY = (f?: object) => ['material_consumptions', f ?? {}]

// ── Suppliers ──────────────────────────────────────────────────────────────────

export function useSuppliers(includeInactive = false) {
    return useQuery({
        queryKey: [...SUPPLIERS_KEY, { includeInactive }],
        queryFn: () => fetchSuppliers(includeInactive),
    })
}

export function useSupplier(id: string) {
    return useQuery({
        queryKey: [...SUPPLIERS_KEY, id],
        queryFn: () => fetchSupplier(id),
        enabled: !!id,
    })
}

export function useCreateSupplier() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: Parameters<typeof createSupplier>[0]) => createSupplier(p),
        onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
    })
}

export function useUpdateSupplier() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...p }: { id: string } & Parameters<typeof updateSupplier>[1]) => updateSupplier(id, p),
        onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
    })
}

// ── Materials ──────────────────────────────────────────────────────────────────

export function useMaterials(filters: Parameters<typeof fetchMaterials>[0] = {}) {
    return useQuery({
        queryKey: [...MATERIALS_KEY, filters],
        queryFn: () => fetchMaterials(filters),
    })
}

export function useCreateMaterial() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: Parameters<typeof createMaterial>[0]) => createMaterial(p),
        onSuccess: () => qc.invalidateQueries({ queryKey: MATERIALS_KEY }),
    })
}

export function useUpdateMaterial() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...p }: { id: string } & Parameters<typeof updateMaterial>[1]) => updateMaterial(id, p),
        onSuccess: () => qc.invalidateQueries({ queryKey: MATERIALS_KEY }),
    })
}

// ── Purchase Orders ────────────────────────────────────────────────────────────

export function usePurchaseOrders(filters: Parameters<typeof fetchPurchaseOrders>[0] = {}) {
    return useQuery({
        queryKey: [...PO_KEY, filters],
        queryFn: () => fetchPurchaseOrders(filters),
    })
}

export function usePurchaseOrder(id: string) {
    return useQuery({
        queryKey: poKey(id),
        queryFn: () => fetchPurchaseOrder(id),
        enabled: !!id,
    })
}

export function useCreatePurchaseOrder() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ po, lines }: { po: Parameters<typeof createPurchaseOrder>[0]; lines: NewPOLine[] }) =>
            createPurchaseOrder(po, lines),
        onSuccess: () => qc.invalidateQueries({ queryKey: PO_KEY }),
    })
}

export function useUpdatePOStatus() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, estado, extra }: { id: string; estado: Parameters<typeof updatePOStatus>[1]; extra?: Parameters<typeof updatePOStatus>[2] }) =>
            updatePOStatus(id, estado, extra),
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: PO_KEY })
            qc.invalidateQueries({ queryKey: poKey(v.id) })
        },
    })
}

// ── Goods Receipts ─────────────────────────────────────────────────────────────

export function useGoodsReceipts(poId: string) {
    return useQuery({
        queryKey: GRN_KEY(poId),
        queryFn: () => fetchGoodsReceipts(poId),
        enabled: !!poId,
    })
}

export function useGoodsReceiptLines(grnId: string) {
    return useQuery({
        queryKey: ['grn_lines', grnId],
        queryFn: () => fetchGoodsReceiptLines(grnId),
        enabled: !!grnId,
    })
}

export function useCreateGoodsReceipt(poId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ obraId, dataRecepcao, lines, notas }: { obraId: string; dataRecepcao: string; lines: NewGRNLine[]; notas?: string }) =>
            createGoodsReceipt(poId, obraId, dataRecepcao, lines, notas),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: GRN_KEY(poId) })
            qc.invalidateQueries({ queryKey: PO_KEY })
            qc.invalidateQueries({ queryKey: MATERIALS_KEY })
        },
    })
}

// ── Consumptions ───────────────────────────────────────────────────────────────

export function useConsumptions(filters: Parameters<typeof fetchConsumptions>[0] = {}) {
    return useQuery({
        queryKey: CONSUMPTIONS_KEY(filters),
        queryFn: () => fetchConsumptions(filters),
    })
}

export function useCreateConsumption() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: Parameters<typeof createConsumption>[0]) => createConsumption(p),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: CONSUMPTIONS_KEY() })
            qc.invalidateQueries({ queryKey: MATERIALS_KEY })
        },
    })
}
