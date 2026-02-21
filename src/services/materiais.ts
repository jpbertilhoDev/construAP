// @ts-nocheck
import { supabase } from '@/lib/supabase'

async function getProfile() {
    const { data: profile } = await supabase.from('profiles').select('id, tenant_id').single()
    if (!profile) throw new Error('Perfil não encontrado')
    return profile
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Supplier {
    id: string
    tenant_id: string
    name: string
    nif?: string
    email?: string
    phone?: string
    morada?: string
    category?: string
    tipo: 'material' | 'servico' | 'ambos'
    condicoes_pagamento?: string
    estado: 'Ativo' | 'Inativo'
    created_at: string
    updated_at: string
}

export interface Material {
    id: string
    tenant_id: string
    codigo: string
    nome: string
    descricao?: string
    categoria?: string
    unidade: 'un' | 'kg' | 'm' | 'm2' | 'm3' | 'L' | 'ROL' | 'CX' | 'hr' | 'outro'
    iva_pct: number
    custo_medio: number
    estoque_atual: number
    estoque_minimo: number
    tipo: 'material' | 'servico'
    ativo: boolean
    created_at: string
    updated_at: string
}

export interface PurchaseOrder {
    id: string
    tenant_id: string
    supplier_id: string
    obra_id: string
    numero: string
    estado: 'Rascunho' | 'Submetido' | 'Aprovado' | 'Em Curso' | 'Parcialmente Recebido' | 'Recebido' | 'Cancelado'
    data_pedido: string
    data_entrega_prevista?: string
    total_sem_iva: number
    total_com_iva: number
    notas?: string
    motivo_cancelamento?: string
    aprovado_por?: string
    aprovado_em?: string
    created_by: string
    created_at: string
    updated_at: string
    suppliers?: { name: string } | null
    obras?: { name: string; ref?: string } | null
}

export interface PurchaseOrderLine {
    id: string
    tenant_id: string
    po_id: string
    material_id: string
    descricao?: string
    quantidade: number
    preco_unitario: number
    iva_pct: number
    total_sem_iva: number
    data_entrega_prevista?: string
    qtd_recebida: number
    notas?: string
    materials?: { nome: string; unidade: string } | null
}

export interface GoodsReceipt {
    id: string
    tenant_id: string
    po_id: string
    obra_id: string
    data_recepcao: string
    tem_divergencia: boolean
    notas?: string
    cost_entry_id?: string
    created_by: string
    created_at: string
    purchase_orders?: { numero: string } | null
}

export interface GoodsReceiptLine {
    id: string
    grn_id: string
    po_line_id: string
    material_id: string
    qtd_recebida: number
    preco_unitario?: number
    divergencia: boolean
    divergencia_nota?: string
    materials?: { nome: string; unidade: string } | null
}

export interface MaterialConsumption {
    id: string
    tenant_id: string
    obra_id: string
    material_id: string
    quantidade: number
    custo_unit?: number
    custo_total?: number
    data: string
    observacao?: string
    cost_entry_id?: string
    created_by: string
    created_at: string
    materials?: { nome: string; unidade: string } | null
    obras?: { name: string } | null
}

// ── Suppliers ──────────────────────────────────────────────────────────────────

export async function fetchSuppliers(includeInactive = false): Promise<Supplier[]> {
    const profile = await getProfile()
    let query = supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('name')
    if (!includeInactive) query = query.eq('estado', 'Ativo')
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as Supplier[]
}

export async function fetchSupplier(id: string): Promise<Supplier> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
    if (error) throw new Error(error.message)
    return data as unknown as Supplier
}

export async function createSupplier(payload: Pick<Supplier, 'name' | 'nif' | 'email' | 'phone' | 'morada' | 'tipo' | 'category' | 'condicoes_pagamento'>): Promise<Supplier> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...payload, tenant_id: profile.tenant_id, created_by: profile.id } as never)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as unknown as Supplier
}

export async function updateSupplier(id: string, payload: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabase
        .from('suppliers')
        .update(payload as never)
        .eq('id', id)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as unknown as Supplier
}

// ── Materials ──────────────────────────────────────────────────────────────────

export async function fetchMaterials(filters: { categoria?: string; tipo?: string; search?: string } = {}): Promise<Material[]> {
    const profile = await getProfile()
    let query = supabase
        .from('materials')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('ativo', true)
        .order('nome')
    if (filters.categoria) query = query.eq('categoria', filters.categoria)
    if (filters.tipo) query = query.eq('tipo', filters.tipo)
    if (filters.search) query = query.ilike('nome', `%${filters.search}%`)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as Material[]
}

export async function createMaterial(payload: Omit<Material, 'id' | 'tenant_id' | 'custo_medio' | 'estoque_atual' | 'created_at' | 'updated_at'>): Promise<Material> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('materials')
        .insert({ ...payload, tenant_id: profile.tenant_id, created_by: profile.id } as never)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as unknown as Material
}

export async function updateMaterial(id: string, payload: Partial<Material>): Promise<Material> {
    const { data, error } = await supabase
        .from('materials')
        .update(payload as never)
        .eq('id', id)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as unknown as Material
}

// ── Purchase Orders ────────────────────────────────────────────────────────────

/** Gera número PO sequencial: PO-YYYY-NNN */
async function generatePONumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear()
    const { count } = await supabase
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', `${year}-01-01`)
    return `PO-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`
}

export async function fetchPurchaseOrders(filters: { obra_id?: string; supplier_id?: string; estado?: string } = {}): Promise<PurchaseOrder[]> {
    const profile = await getProfile()
    let query = supabase
        .from('purchase_orders')
        .select('*, suppliers(name), obras(name, ref)')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
    if (filters.obra_id) query = query.eq('obra_id', filters.obra_id)
    if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id)
    if (filters.estado) query = query.eq('estado', filters.estado)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as PurchaseOrder[]
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrder & { lines: PurchaseOrderLine[] }> {
    const profile = await getProfile()
    const [poRes, linesRes] = await Promise.all([
        supabase.from('purchase_orders').select('*, suppliers(name), obras(name, ref)').eq('id', id).single(),
        supabase.from('purchase_order_lines').select('*, materials(nome, unidade)').eq('po_id', id).order('id'),
    ])
    if (poRes.error) throw new Error(poRes.error.message)
    if (linesRes.error) throw new Error(linesRes.error.message)
    return { ...(poRes.data as unknown as PurchaseOrder), lines: (linesRes.data ?? []) as unknown as PurchaseOrderLine[] }
}

export type NewPOLine = Pick<PurchaseOrderLine, 'material_id' | 'descricao' | 'quantidade' | 'preco_unitario' | 'iva_pct' | 'data_entrega_prevista' | 'notas'>

export async function createPurchaseOrder(po: Pick<PurchaseOrder, 'supplier_id' | 'obra_id' | 'data_entrega_prevista' | 'notas'>, lines: NewPOLine[]): Promise<PurchaseOrder> {
    const profile = await getProfile()
    const numero = await generatePONumber(profile.tenant_id)

    // Calcular totais
    const totalSemIva = lines.reduce((s, l) => s + l.quantidade * l.preco_unitario, 0)
    const totalComIva = lines.reduce((s, l) => s + l.quantidade * l.preco_unitario * (1 + (l.iva_pct ?? 23) / 100), 0)

    const { data: poData, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
            ...po,
            numero,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
            total_sem_iva: Math.round(totalSemIva * 100) / 100,
            total_com_iva: Math.round(totalComIva * 100) / 100,
        } as never)
        .select()
        .single()
    if (poErr) throw new Error(poErr.message)

    const poId = (poData as any).id
    const linePayloads = lines.map(l => ({
        ...l,
        po_id: poId,
        tenant_id: profile.tenant_id,
        total_sem_iva: Math.round(l.quantidade * l.preco_unitario * 100) / 100,
    }))
    const { error: linesErr } = await supabase.from('purchase_order_lines').insert(linePayloads as never)
    if (linesErr) throw new Error(linesErr.message)

    return poData as unknown as PurchaseOrder
}

export async function updatePOStatus(id: string, estado: PurchaseOrder['estado'], extra?: { motivo_cancelamento?: string; aprovado_por?: string; aprovado_em?: string }): Promise<void> {
    const { error } = await supabase
        .from('purchase_orders')
        .update({ estado, ...extra } as never)
        .eq('id', id)
    if (error) throw new Error(error.message)
}

// ── Goods Receipts ─────────────────────────────────────────────────────────────

export type NewGRNLine = Pick<GoodsReceiptLine, 'po_line_id' | 'material_id' | 'qtd_recebida' | 'preco_unitario' | 'divergencia' | 'divergencia_nota'>

export async function createGoodsReceipt(
    poId: string,
    obraId: string,
    dataRecepcao: string,
    lines: NewGRNLine[],
    notas?: string,
): Promise<GoodsReceipt> {
    const profile = await getProfile()
    const temDivergencia = lines.some(l => l.divergencia)

    // 1. Criar GRN
    const { data: grn, error: grnErr } = await supabase
        .from('goods_receipts')
        .insert({
            po_id: poId,
            obra_id: obraId,
            tenant_id: profile.tenant_id,
            data_recepcao: dataRecepcao,
            tem_divergencia: temDivergencia,
            notas,
            created_by: profile.id,
        } as never)
        .select()
        .single()
    if (grnErr) throw new Error(grnErr.message)

    const grnId = (grn as any).id

    // 2. Inserir linhas (trigger atualiza stock + custo_medio automaticamente)
    const linePayloads = lines.map(l => ({ ...l, grn_id: grnId, tenant_id: profile.tenant_id }))
    const { error: linesErr } = await supabase.from('goods_receipt_lines').insert(linePayloads as never)
    if (linesErr) throw new Error(linesErr.message)

    // 3. Atualizar qtd_recebida nas linhas do PO
    for (const l of lines) {
        await supabase.rpc('increment_po_line_received', {
            p_line_id: l.po_line_id,
            p_qty: l.qtd_recebida,
        }).then(() => { }) // RPC opcional; fallback com update:
        const { data: poLine } = await supabase
            .from('purchase_order_lines')
            .select('qtd_recebida')
            .eq('id', l.po_line_id)
            .single()
        if (poLine) {
            await supabase
                .from('purchase_order_lines')
                .update({ qtd_recebida: (poLine as any).qtd_recebida + l.qtd_recebida } as never)
                .eq('id', l.po_line_id)
        }
    }

    // 4. Verificar se PO está totalmente recebido
    const { data: allLines } = await supabase
        .from('purchase_order_lines')
        .select('quantidade, qtd_recebida')
        .eq('po_id', poId)
    const allReceived = (allLines ?? []).every((l: any) => l.qtd_recebida >= l.quantidade)
    await updatePOStatus(poId, allReceived ? 'Recebido' : 'Parcialmente Recebido')

    // 5. Gerar custo no Financeiro
    const totalRecebido = lines.reduce((s, l) => s + l.qtd_recebida * (l.preco_unitario ?? 0), 0)
    if (totalRecebido > 0) {
        const { data: cost } = await supabase
            .from('costs')
            .insert({
                obra_id: obraId,
                tenant_id: profile.tenant_id,
                description: `Materiais recebidos — GRN ${grnId.substring(0, 8)}`,
                amount: Math.round(totalRecebido * 100) / 100,
                cost_date: dataRecepcao,
                status: 'Aprovado',
                created_by: profile.id,
            } as never)
            .select('id')
            .single()
        if (cost) {
            await supabase.from('goods_receipts').update({ cost_entry_id: (cost as any).id } as never).eq('id', grnId)
        }
    }

    return grn as unknown as GoodsReceipt
}

export async function fetchGoodsReceipts(poId: string): Promise<GoodsReceipt[]> {
    const { data, error } = await supabase
        .from('goods_receipts')
        .select('*, purchase_orders(numero)')
        .eq('po_id', poId)
        .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as GoodsReceipt[]
}

export async function fetchGoodsReceiptLines(grnId: string): Promise<GoodsReceiptLine[]> {
    const { data, error } = await supabase
        .from('goods_receipt_lines')
        .select('*, materials(nome, unidade)')
        .eq('grn_id', grnId)
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as GoodsReceiptLine[]
}

// ── Material Consumptions ──────────────────────────────────────────────────────

export async function fetchConsumptions(filters: { obra_id?: string; material_id?: string } = {}): Promise<MaterialConsumption[]> {
    const profile = await getProfile()
    let query = supabase
        .from('material_consumptions')
        .select('*, materials(nome, unidade), obras(name)')
        .eq('tenant_id', profile.tenant_id)
        .order('data', { ascending: false })
    if (filters.obra_id) query = query.eq('obra_id', filters.obra_id)
    if (filters.material_id) query = query.eq('material_id', filters.material_id)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as MaterialConsumption[]
}

export async function createConsumption(payload: Omit<MaterialConsumption, 'id' | 'tenant_id' | 'created_at'>): Promise<MaterialConsumption> {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw new Error(userError.message)
    if (!user) throw new Error('User not logged in')

    const { data: profile, error: profileError } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (profileError) throw new Error(profileError.message)

    // Obter custo médio actual
    const { data: mat } = await supabase.from('materials').select('custo_medio, nome').eq('id', payload.material_id).single()
    const custoUnit = (mat as any)?.custo_medio ?? 0
    const custoTotal = payload.quantidade * custoUnit

    const { data, error } = await supabase
        .from('material_consumptions')
        .insert({
            ...payload,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
            custo_unit: custoUnit,
            custo_total: Math.round(custoTotal * 100) / 100,
        } as never)
        .select()
        .single()
    if (error) throw new Error(error.message)

    const consumo = data as any

    // Registar stock_movement de saída
    await supabase.from('stock_movements').insert({
        tenant_id: profile.tenant_id,
        material_id: payload.material_id,
        tipo: 'saida',
        quantidade: -payload.quantidade,
        referencia: consumo.id,
        obra_id: payload.obra_id,
        created_by: profile.id,
    } as never)

    // Gerar custo no Financeiro
    if (custoTotal > 0) {
        const { data: cost } = await supabase
            .from('costs')
            .insert({
                obra_id: payload.obra_id,
                tenant_id: profile.tenant_id,
                description: `Consumo de material — ${(mat as any)?.nome ?? ''}`,
                amount: Math.round(custoTotal * 100) / 100,
                cost_date: payload.data,
                status: 'Aprovado',
                created_by: profile.id,
            } as never)
            .select('id')
            .single()
        if (cost) {
            await supabase.from('material_consumptions').update({ cost_entry_id: (cost as any).id } as never).eq('id', consumo.id)
        }
    }

    return consumo as MaterialConsumption
}
