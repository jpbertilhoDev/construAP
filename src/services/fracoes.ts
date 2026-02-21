import { supabase } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────

export type EstadoComercial = 'Disponível' | 'Reservado' | 'Vendido' | 'Bloqueado'
export type TipologiaTipo = 'T0' | 'T1' | 'T2' | 'T3' | 'T4+' | 'Garagem' | 'Arrecadação' | 'Comercial' | 'Lote' | 'Outro'
export type TipoDocumento = 'Planta' | 'Certificado' | 'Caderneta' | 'Regulamento' | 'Contrato' | 'Foto' | 'Outro'

export type Tipologia = {
    id: string
    tenant_id: string
    empreendimento_id: string
    tipo: TipologiaTipo
    designacao: string | null
    area_bruta_m2: number | null
    area_util_m2: number | null
    quartos: number | null
    casas_banho: number | null
    notas: string | null
    created_at: string
}

export type Fracao = {
    id: string
    tenant_id: string
    empreendimento_id: string
    bloco_id: string | null
    tipologia_id: string | null
    ref: string
    designacao: string | null
    type: string
    floor: number | null
    piso: number | null
    area_m2: number | null
    area_bruta_m2: number | null
    area_util_m2: number | null
    orientation: string | null
    status: string            // old fracao_status enum
    estado_comercial: EstadoComercial
    sale_price: number | null
    preco_atual: number | null
    motivo_bloqueio: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    // joins
    tipologias?: { tipo: TipologiaTipo; designacao: string | null } | null
    blocos?: { nome: string } | null
}

export type FracaoInsert = {
    empreendimento_id: string
    tipologia_id?: string | null
    bloco_id?: string | null
    ref: string
    designacao?: string | null
    type?: string
    floor?: number | null
    piso?: number | null
    area_m2?: number | null
    area_bruta_m2?: number | null
    area_util_m2?: number | null
    orientation?: string | null
    preco_atual: number
    sale_price?: number | null
    notes?: string | null
}

export type PrecoHistorico = {
    id: string
    fracao_id: string
    tenant_id: string
    preco_anterior: number
    preco_novo: number
    delta_pct: number | null
    motivo: string
    created_by: string
    created_at: string
}

export type Reserva = {
    id: string
    tenant_id: string
    fracao_id: string
    empreendimento_id: string
    cliente_nome: string
    cliente_email: string | null
    cliente_telefone: string | null
    cliente_nif: string | null
    valor_sinal: number | null
    preco_venda: number | null
    data_inicio: string
    data_expiracao: string
    extensoes_count: number
    estado: 'Ativa' | 'Expirada' | 'Cancelada' | 'Confirmada'
    motivo_cancelamento: string | null
    notas: string | null
    created_by: string
    created_at: string
    updated_at: string
    fracoes?: { designacao: string | null; ref: string } | null
}

export type ImobDocumento = {
    id: string
    tenant_id: string
    empreendimento_id: string
    fracao_id: string | null
    nome_ficheiro: string
    storage_path: string
    tipo_documento: TipoDocumento
    descricao: string | null
    tamanho_bytes: number | null
    mime_type: string | null
    version: number
    deleted_at: string | null
    created_by: string
    created_at: string
}

// ─── Helper ──────────────────────────────────────────────────

async function getProfile() {
    const { data } = await supabase.from('profiles').select('id, tenant_id').single()
    const p = data as { id: string; tenant_id: string } | null
    if (!p) throw new Error('Perfil não encontrado')
    return p
}

// ─── Tipologias ──────────────────────────────────────────────

export async function fetchTipologias(empreendimentoId: string): Promise<Tipologia[]> {
    const { data, error } = await supabase
        .from('tipologias')
        .select('*')
        .eq('empreendimento_id', empreendimentoId)
        .order('tipo')

    if (error) throw new Error(error.message)
    return (data as unknown as Tipologia[]) ?? []
}

export async function createTipologia(payload: Omit<Tipologia, 'id' | 'tenant_id' | 'created_at'>): Promise<Tipologia> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('tipologias')
        .insert({ ...payload, tenant_id: profile.tenant_id } as unknown as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Tipologia
}

export async function deleteTipologia(id: string): Promise<void> {
    const { error } = await supabase.from('tipologias').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ─── Frações ─────────────────────────────────────────────────

export async function fetchFracoes(empreendimentoId: string): Promise<Fracao[]> {
    const { data, error } = await supabase
        .from('fracoes')
        .select(`*, tipologias(tipo, designacao), blocos(nome)`)
        .eq('empreendimento_id', empreendimentoId)
        .order('designacao', { ascending: true })

    if (error) throw new Error(error.message)
    return (data as unknown as Fracao[]) ?? []
}

export async function fetchFracao(id: string): Promise<Fracao> {
    const { data, error } = await supabase
        .from('fracoes')
        .select(`*, tipologias(tipo, designacao), blocos(nome)`)
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Fracao
}

export async function createFracao(payload: FracaoInsert): Promise<Fracao> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('fracoes')
        .insert({
            ...payload,
            designacao: payload.designacao || payload.ref,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
            estado_comercial: 'Disponível',
        } as unknown as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Fracao
}

export async function updateFracao(id: string, payload: Partial<FracaoInsert>): Promise<Fracao> {
    const { data, error } = await supabase
        .from('fracoes')
        .update(payload as unknown as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Fracao
}

export async function updateFracaoEstado(id: string, estado: EstadoComercial, motivo?: string): Promise<Fracao> {
    const { data, error } = await supabase
        .from('fracoes')
        .update({ estado_comercial: estado, motivo_bloqueio: motivo || null } as unknown as never)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as Fracao
}

export async function deleteFracao(id: string): Promise<void> {
    const { error } = await supabase.from('fracoes').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ─── Preço Histórico ─────────────────────────────────────────

export async function fetchPrecoHistorico(fracaoId: string): Promise<PrecoHistorico[]> {
    const { data, error } = await supabase
        .from('fracao_preco_historico')
        .select('*')
        .eq('fracao_id', fracaoId)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as unknown as PrecoHistorico[]) ?? []
}

export async function updateFracaoPreco(fracaoId: string, precoNovo: number, motivo: string): Promise<void> {
    const profile = await getProfile()

    // Fetch current price
    const fracao = await fetchFracao(fracaoId)
    const precoAnterior = fracao.preco_atual ?? 0
    const deltaPct = precoAnterior > 0 ? ((precoNovo - precoAnterior) / precoAnterior) * 100 : null

    // Insert history record
    const { error: histError } = await supabase.from('fracao_preco_historico').insert({
        tenant_id: profile.tenant_id,
        fracao_id: fracaoId,
        preco_anterior: precoAnterior,
        preco_novo: precoNovo,
        delta_pct: deltaPct ? Math.round(deltaPct * 100) / 100 : null,
        motivo,
        created_by: profile.id,
    } as unknown as never)
    if (histError) throw new Error(histError.message)

    // Update current price
    const { error: updateError } = await supabase
        .from('fracoes')
        .update({ preco_atual: precoNovo, sale_price: precoNovo } as unknown as never)
        .eq('id', fracaoId)
    if (updateError) throw new Error(updateError.message)
}

// ─── Reservas ────────────────────────────────────────────────

export async function fetchReservas(empreendimentoId: string): Promise<Reserva[]> {
    const { data, error } = await supabase
        .from('reservas')
        .select(`*, fracoes(designacao, ref)`)
        .eq('empreendimento_id', empreendimentoId)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as unknown as Reserva[]) ?? []
}

export type ReservaInsert = {
    fracao_id: string
    empreendimento_id: string
    cliente_nome: string
    cliente_email?: string | null
    cliente_telefone?: string | null
    cliente_nif?: string | null
    valor_sinal?: number | null
    preco_venda?: number | null
    dias_reserva: number
    notas?: string | null
}

export async function createReserva(payload: ReservaInsert): Promise<Reserva> {
    const profile = await getProfile()
    const dataInicio = new Date()
    const dataExpiracao = new Date()
    dataExpiracao.setDate(dataExpiracao.getDate() + payload.dias_reserva)

    const { data, error } = await supabase
        .from('reservas')
        .insert({
            tenant_id: profile.tenant_id,
            fracao_id: payload.fracao_id,
            empreendimento_id: payload.empreendimento_id,
            cliente_nome: payload.cliente_nome,
            cliente_email: payload.cliente_email,
            cliente_telefone: payload.cliente_telefone,
            cliente_nif: payload.cliente_nif,
            valor_sinal: payload.valor_sinal,
            preco_venda: payload.preco_venda,
            data_inicio: dataInicio.toISOString().substring(0, 10),
            data_expiracao: dataExpiracao.toISOString().substring(0, 10),
            estado: 'Ativa',
            notas: payload.notas,
            created_by: profile.id,
        } as unknown as never)
        .select()
        .single()

    if (error) throw new Error(error.message)

    // Update fracao estado
    await updateFracaoEstado(payload.fracao_id, 'Reservado')

    return data as unknown as Reserva
}

export async function cancelarReserva(id: string, fracao_id: string, motivo: string): Promise<void> {
    const { error } = await supabase
        .from('reservas')
        .update({ estado: 'Cancelada', motivo_cancelamento: motivo } as unknown as never)
        .eq('id', id)
    if (error) throw new Error(error.message)

    await updateFracaoEstado(fracao_id, 'Disponível')
}

export async function confirmarVenda(id: string, fracao_id: string): Promise<void> {
    const { error } = await supabase
        .from('reservas')
        .update({ estado: 'Confirmada' } as unknown as never)
        .eq('id', id)
    if (error) throw new Error(error.message)

    await updateFracaoEstado(fracao_id, 'Vendido')
}

// ─── Documentos ──────────────────────────────────────────────

export async function fetchImobDocumentos(empreendimentoId: string, fracaoId?: string): Promise<ImobDocumento[]> {
    let query = supabase
        .from('imob_documentos')
        .select('*')
        .eq('empreendimento_id', empreendimentoId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (fracaoId) {
        query = query.eq('fracao_id', fracaoId)
    } else {
        query = query.is('fracao_id', null)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data as unknown as ImobDocumento[]) ?? []
}

export async function uploadImobDocumento(
    empreendimentoId: string,
    file: File,
    tipo: TipoDocumento,
    descricao: string,
    fracaoId?: string
): Promise<ImobDocumento> {
    const profile = await getProfile()
    const ext = file.name.split('.').pop()
    const path = fracaoId
        ? `${profile.tenant_id}/fracoes/${fracaoId}/${Date.now()}.${ext}`
        : `${profile.tenant_id}/empreendimentos/${empreendimentoId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
        .from('imobiliario')
        .upload(path, file, { upsert: false })
    if (uploadError) throw new Error(uploadError.message)

    const { data, error } = await supabase
        .from('imob_documentos')
        .insert({
            tenant_id: profile.tenant_id,
            empreendimento_id: empreendimentoId,
            fracao_id: fracaoId || null,
            nome_ficheiro: file.name,
            storage_path: path,
            tipo_documento: tipo,
            descricao: descricao || null,
            tamanho_bytes: file.size,
            mime_type: file.type,
            version: 1,
            created_by: profile.id,
        } as unknown as never)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as unknown as ImobDocumento
}

export async function deleteImobDocumento(id: string, storagePath: string): Promise<void> {
    await supabase.storage.from('imobiliario').remove([storagePath])
    const { error } = await supabase
        .from('imob_documentos')
        .update({ deleted_at: new Date().toISOString() } as unknown as never)
        .eq('id', id)
    if (error) throw new Error(error.message)
}

export async function getImobDocumentoUrl(storagePath: string): Promise<string> {
    const { data } = await supabase.storage
        .from('imobiliario')
        .createSignedUrl(storagePath, 3600)
    return data?.signedUrl ?? ''
}

// ─── Blocos ──────────────────────────────────────────────────

export type Bloco = {
    id: string
    tenant_id: string
    empreendimento_id: string
    nome: string
    descricao: string | null
    created_at: string
}

export async function fetchBlocos(empreendimentoId: string): Promise<Bloco[]> {
    const { data, error } = await supabase
        .from('blocos')
        .select('*')
        .eq('empreendimento_id', empreendimentoId)
        .order('nome')
    if (error) throw new Error(error.message)
    return (data as unknown as Bloco[]) ?? []
}

export async function createBloco(empreendimentoId: string, nome: string, descricao?: string): Promise<Bloco> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('blocos')
        .insert({ tenant_id: profile.tenant_id, empreendimento_id: empreendimentoId, nome, descricao: descricao || null } as unknown as never)
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as unknown as Bloco
}

export async function deleteBloco(id: string): Promise<void> {
    const { error } = await supabase.from('blocos').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

// ─── Extend Reservation ──────────────────────────────────────

export async function estenderReserva(id: string, novaDataExpiracao: string): Promise<void> {
    const { data: reserva, error: fetchErr } = await supabase
        .from('reservas').select('extensoes_count').eq('id', id).single()
    if (fetchErr) throw new Error(fetchErr.message)
    const count = ((reserva as any)?.extensoes_count ?? 0) + 1
    const { error } = await supabase
        .from('reservas')
        .update({ data_expiracao: novaDataExpiracao, extensoes_count: count } as unknown as never)
        .eq('id', id)
    if (error) throw new Error(error.message)
}

// ─── CSV Batch Import ────────────────────────────────────────

export type FracaoCSVRow = {
    designacao: string
    tipologia_tipo: string
    piso?: number
    area_util_m2?: number
    preco_atual: number
    orientation?: string
    notes?: string
}

export type CSVImportResult = {
    created: number
    errors: { row: number; msg: string }[]
}

export async function importFracoesCSV(
    empreendimentoId: string,
    rows: FracaoCSVRow[],
    tipologias: Tipologia[]
): Promise<CSVImportResult> {
    const profile = await getProfile()
    const errors: { row: number; msg: string }[] = []
    const CHUNK = 50
    let created = 0

    // Map tipologia name to id
    const tipMap: Record<string, string> = {}
    for (const t of tipologias) {
        const key = (t.designacao || t.tipo).toLowerCase()
        tipMap[key] = t.id
    }
    // Also map by tipo directly
    for (const t of tipologias) {
        tipMap[t.tipo.toLowerCase()] = t.id
    }

    const toInsert: any[] = []
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row.designacao) { errors.push({ row: i + 2, msg: 'Designação em falta' }); continue }
        if (!row.preco_atual || row.preco_atual <= 0) { errors.push({ row: i + 2, msg: 'Preço inválido' }); continue }
        const tipId = tipMap[(row.tipologia_tipo || '').toLowerCase()] || null
        toInsert.push({
            tenant_id: profile.tenant_id,
            empreendimento_id: empreendimentoId,
            ref: row.designacao,
            designacao: row.designacao,
            tipologia_id: tipId,
            piso: row.piso || null,
            area_util_m2: row.area_util_m2 || null,
            area_m2: row.area_util_m2 || null,
            preco_atual: row.preco_atual,
            sale_price: row.preco_atual,
            orientation: row.orientation || null,
            notes: row.notes || null,
            estado_comercial: 'Disponível',
            created_by: profile.id,
        })
    }

    for (let i = 0; i < toInsert.length; i += CHUNK) {
        const chunk = toInsert.slice(i, i + CHUNK)
        const { error } = await supabase.from('fracoes').insert(chunk as unknown as never)
        if (error) {
            errors.push({ row: i + 2, msg: error.message })
        } else {
            created += chunk.length
        }
    }

    return { created, errors }
}

// ─── Audit Log ───────────────────────────────────────────────

export type AuditEntry = {
    id: string
    tenant_id: string
    table_name: string
    record_id: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    old_value: any
    new_value: any
    changed_by: string | null
    changed_at: string
}

export async function fetchAuditLog(tableNames: string[], recordId?: string): Promise<AuditEntry[]> {
    let query = supabase
        .from('audit_log')
        .select('*')
        .in('table_name', tableNames)
        .order('changed_at', { ascending: false })
        .limit(200)

    if (recordId) {
        query = query.eq('record_id', recordId)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data as unknown as AuditEntry[]) ?? []
}

