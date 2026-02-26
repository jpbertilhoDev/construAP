import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/getProfile'
import { getActiveRateAtDate, type EmployeeRate } from './employees'

// ── Types ───────────────────────────────────────────────────

export interface PayrollConfig {
    id: string
    tenant_id: string
    ss_taxa_entidade: number
    ss_taxa_trabalhador: number
    subsidio_alimentacao_valor: number
    subsidio_alimentacao_tipo: 'cash' | 'card'
    overtime_1h: number
    overtime_subsequent: number
    overtime_rest_day: number
    overtime_holiday: number
    horas_diarias_padrao: number
    created_at: string
    updated_at: string
}

export type PayrollRunStatus = 'Rascunho' | 'Processado' | 'Finalizado' | 'Anulado'

export interface PayrollRun {
    id: string
    tenant_id: string
    periodo_mes: number
    periodo_ano: number
    status: PayrollRunStatus
    inclui_sub_ferias: boolean
    inclui_sub_natal: boolean
    total_bruto: number
    total_ss_entidade: number
    total_ss_trabalhador: number
    total_irs: number
    total_liquido: number
    total_subsidio_alimentacao: number
    num_funcionarios: number
    notas?: string
    processado_por?: string
    processado_em?: string
    finalizado_por?: string
    finalizado_em?: string
    created_by: string
    created_at: string
    updated_at: string
}

export interface PayrollLine {
    id: string
    tenant_id: string
    payroll_run_id: string
    employee_id: string
    dias_trabalhados: number
    horas_normais: number
    horas_extra: number
    salario_base: number
    valor_horas_extra: number
    subsidio_alimentacao: number
    subsidio_ferias: number
    subsidio_natal: number
    outros_abonos: number
    total_bruto: number
    desconto_ss: number
    desconto_irs: number
    outros_descontos: number
    ss_entidade: number
    total_liquido: number
    irs_tabela?: string
    irs_taxa_marginal?: number
    irs_deducao?: number
    taxa_tipo?: string
    taxa_valor?: number
    situacao_fiscal?: string
    numero_dependentes: number
    created_at: string
    employees?: {
        nome: string
        nif?: string
        niss?: string
        iban?: string
        employee_roles?: { nome: string } | null
    } | null
}

export interface TimesheetAggregate {
    employee_id: string
    employee_name: string
    employee_nif: string | null
    employee_niss: string | null
    employee_iban: string | null
    employee_role: string | null
    data_admissao: string | null
    situacao_fiscal: string
    numero_dependentes: number
    dias_trabalhados: number
    total_horas: number
    horas_por_dia: Record<string, number>
}

export interface PayrollProcessOptions {
    mes: number
    ano: number
    incluirSubFerias: boolean
    incluirSubNatal: boolean
}

export interface PayrollPreviewLine {
    employee_id: string
    employee_name: string
    employee_role: string | null
    dias_trabalhados: number
    horas_normais: number
    horas_extra: number
    salario_base: number
    valor_horas_extra: number
    subsidio_alimentacao: number
    subsidio_ferias: number
    subsidio_natal: number
    total_bruto: number
    desconto_ss: number
    desconto_irs: number
    ss_entidade: number
    total_liquido: number
    irs_tabela: string
    irs_taxa_marginal: number
    irs_deducao: number
    taxa_tipo: string
    taxa_valor: number
    situacao_fiscal: string
    numero_dependentes: number
}

// ── IRS Tables 2025 (AT - Autoridade Tributária) ────────────

interface IRSBracket {
    limiteSuperior: number
    taxaMarginal: number
    deducao: number
    deducaoPorDependente: number
}

// Tabela I — Solteiro / Casado dois titulares
const IRS_TABELA_I: IRSBracket[] = [
    { limiteSuperior: 870, taxaMarginal: 0, deducao: 0, deducaoPorDependente: 21.43 },
    { limiteSuperior: 960, taxaMarginal: 0.1325, deducao: 115.28, deducaoPorDependente: 21.43 },
    { limiteSuperior: 1008, taxaMarginal: 0.18, deducao: 160.94, deducaoPorDependente: 21.43 },
    { limiteSuperior: 1147, taxaMarginal: 0.18, deducao: 160.94, deducaoPorDependente: 21.43 },
    { limiteSuperior: 1459, taxaMarginal: 0.26, deducao: 252.72, deducaoPorDependente: 21.43 },
    { limiteSuperior: 1767, taxaMarginal: 0.3275, deducao: 351.26, deducaoPorDependente: 21.43 },
    { limiteSuperior: 2076, taxaMarginal: 0.37, deducao: 426.41, deducaoPorDependente: 21.43 },
    { limiteSuperior: 2422, taxaMarginal: 0.3875, deducao: 462.73, deducaoPorDependente: 21.43 },
    { limiteSuperior: 2904, taxaMarginal: 0.4005, deducao: 494.21, deducaoPorDependente: 21.43 },
    { limiteSuperior: 3484, taxaMarginal: 0.41, deducao: 521.79, deducaoPorDependente: 21.43 },
    { limiteSuperior: 4400, taxaMarginal: 0.435, deducao: 608.88, deducaoPorDependente: 21.43 },
    { limiteSuperior: 5500, taxaMarginal: 0.45, deducao: 674.88, deducaoPorDependente: 21.43 },
    { limiteSuperior: Infinity, taxaMarginal: 0.4717, deducao: 794.23, deducaoPorDependente: 21.43 },
]

// Tabela III — Casado único titular
const IRS_TABELA_III: IRSBracket[] = [
    { limiteSuperior: 991, taxaMarginal: 0, deducao: 0, deducaoPorDependente: 42.86 },
    { limiteSuperior: 1119, taxaMarginal: 0.125, deducao: 123.88, deducaoPorDependente: 42.86 },
    { limiteSuperior: 1432, taxaMarginal: 0.1272, deducao: 98.64, deducaoPorDependente: 42.86 },
    { limiteSuperior: 1962, taxaMarginal: 0.157, deducao: 141.32, deducaoPorDependente: 42.86 },
    { limiteSuperior: 2240, taxaMarginal: 0.1938, deducao: 213.53, deducaoPorDependente: 42.86 },
    { limiteSuperior: 2773, taxaMarginal: 0.2277, deducao: 289.47, deducaoPorDependente: 42.86 },
    { limiteSuperior: 3389, taxaMarginal: 0.257, deducao: 370.72, deducaoPorDependente: 42.86 },
    { limiteSuperior: 5965, taxaMarginal: 0.2881, deducao: 476.12, deducaoPorDependente: 42.86 },
    { limiteSuperior: 20265, taxaMarginal: 0.3843, deducao: 1049.96, deducaoPorDependente: 42.86 },
    { limiteSuperior: Infinity, taxaMarginal: 0.4717, deducao: 2821.13, deducaoPorDependente: 42.86 },
]

function getIRSTable(situacao: string): { tabela: string; brackets: IRSBracket[] } {
    if (situacao === 'casado_unico_titular') {
        return { tabela: 'III', brackets: IRS_TABELA_III }
    }
    // solteiro + casado_2_titulares usam Tabela I
    return { tabela: 'I', brackets: IRS_TABELA_I }
}

export function calculateIRS(
    grossMensal: number,
    situacaoFiscal: string,
    numeroDependentes: number,
): { retencao: number; tabela: string; taxaMarginal: number; deducao: number } {
    const { tabela, brackets } = getIRSTable(situacaoFiscal)
    const bracket = brackets.find((b) => grossMensal <= b.limiteSuperior)
    if (!bracket || bracket.taxaMarginal === 0) {
        return { retencao: 0, tabela, taxaMarginal: 0, deducao: 0 }
    }
    const retencaoBruta =
        grossMensal * bracket.taxaMarginal -
        bracket.deducao -
        numeroDependentes * bracket.deducaoPorDependente
    return {
        retencao: Math.max(0, Math.round(retencaoBruta * 100) / 100),
        tabela,
        taxaMarginal: bracket.taxaMarginal,
        deducao: bracket.deducao,
    }
}

// ── Overtime Calculation ────────────────────────────────────

export function calculateOvertime(
    horasPorDia: Record<string, number>,
    horasPadrao: number,
    config: PayrollConfig,
    taxaHoraria: number,
): { horasExtra: number; valorExtra: number } {
    let horasExtra = 0
    let valorExtra = 0

    for (const [dateStr, totalHoras] of Object.entries(horasPorDia)) {
        const date = new Date(dateStr)
        const dayOfWeek = date.getDay() // 0=Sunday, 6=Saturday

        if (totalHoras <= horasPadrao && dayOfWeek !== 0 && dayOfWeek !== 6) {
            continue
        }

        // Weekend: all hours at rest day rate
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            horasExtra += totalHoras
            valorExtra += totalHoras * taxaHoraria * (config.overtime_rest_day - 1)
            continue
        }

        // Weekday overtime
        const excess = totalHoras - horasPadrao
        if (excess > 0) {
            horasExtra += excess
            // First hour at 1.25x premium, rest at 1.375x premium
            const firstHour = Math.min(excess, 1)
            const subsequentHours = Math.max(0, excess - 1)
            valorExtra +=
                firstHour * taxaHoraria * (config.overtime_1h - 1) +
                subsequentHours * taxaHoraria * (config.overtime_subsequent - 1)
        }
    }

    return {
        horasExtra: Math.round(horasExtra * 100) / 100,
        valorExtra: Math.round(valorExtra * 100) / 100,
    }
}

// ── CRUD: PayrollConfig ─────────────────────────────────────

export async function fetchPayrollConfig(): Promise<PayrollConfig | null> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('payroll_config')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle()
    if (error) throw new Error(error.message)
    return data as PayrollConfig | null
}

export async function upsertPayrollConfig(
    payload: Partial<
        Omit<PayrollConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
    >,
): Promise<PayrollConfig> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('payroll_config')
        .upsert(
            { ...payload, tenant_id: profile.tenant_id } as unknown as never,
            { onConflict: 'tenant_id' },
        )
        .select()
        .single()
    if (error) throw new Error(error.message)
    return data as unknown as PayrollConfig
}

// ── CRUD: PayrollRuns ───────────────────────────────────────

export async function fetchPayrollRuns(): Promise<PayrollRun[]> {
    const profile = await getProfile()
    const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('periodo_ano', { ascending: false })
        .order('periodo_mes', { ascending: false })
    if (error) throw new Error(error.message)
    return data as unknown as PayrollRun[]
}

export async function fetchPayrollRun(id: string): Promise<PayrollRun> {
    const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', id)
        .single()
    if (error) throw new Error(error.message)
    return data as unknown as PayrollRun
}

export async function updatePayrollRunStatus(
    id: string,
    status: PayrollRunStatus,
): Promise<void> {
    const profile = await getProfile()
    const updates: Record<string, unknown> = { status }
    if (status === 'Finalizado') {
        updates.finalizado_por = profile.id
        updates.finalizado_em = new Date().toISOString()
    }
    const { error } = await supabase
        .from('payroll_runs')
        .update(updates as unknown as never)
        .eq('id', id)
    if (error) throw new Error(error.message)
}

// ── CRUD: PayrollLines ──────────────────────────────────────

const LINES_SELECT = `
    *,
    employees(nome, nif, niss, iban, employee_roles(nome))
`

export async function fetchPayrollLines(runId: string): Promise<PayrollLine[]> {
    const { data, error } = await supabase
        .from('payroll_lines')
        .select(LINES_SELECT)
        .eq('payroll_run_id', runId)
        .order('created_at')
    if (error) throw new Error(error.message)
    return data as unknown as PayrollLine[]
}

// ── RPC: Timesheet Aggregate ────────────────────────────────

async function fetchTimesheetAggregate(
    mes: number,
    ano: number,
): Promise<TimesheetAggregate[]> {
    const { data, error } = await supabase.rpc('get_payroll_timesheet_aggregate' as never, {
        p_mes: mes,
        p_ano: ano,
    } as never)
    if (error) throw new Error(error.message)
    return data as unknown as TimesheetAggregate[]
}

// ── Helpers ─────────────────────────────────────────────────

function rateToHourly(rate: EmployeeRate, horasPadrao: number): number {
    if (rate.tipo === 'hourly') return rate.valor
    if (rate.tipo === 'daily') return rate.valor / horasPadrao
    // monthly: valor / (22 dias * horas por dia)
    return rate.valor / (22 * horasPadrao)
}

function rateToMonthlyBase(
    rate: EmployeeRate,
    diasTrabalhados: number,
    horasNormais: number,
): number {
    if (rate.tipo === 'monthly') return rate.valor
    if (rate.tipo === 'daily') return rate.valor * diasTrabalhados
    // hourly
    return rate.valor * horasNormais
}

function monthsDiff(admissao: string, refDate: Date): number {
    const d = new Date(admissao)
    const months =
        (refDate.getFullYear() - d.getFullYear()) * 12 +
        (refDate.getMonth() - d.getMonth())
    return Math.max(0, Math.min(12, months))
}

// ── Preview Payroll ─────────────────────────────────────────

export async function previewPayroll(
    options: PayrollProcessOptions,
): Promise<PayrollPreviewLine[]> {
    const config = await fetchPayrollConfig()
    if (!config) throw new Error('Configuração de payroll não encontrada')

    const aggregates = await fetchTimesheetAggregate(options.mes, options.ano)
    if (aggregates.length === 0) return []

    const horasPadrao = config.horas_diarias_padrao
    const endOfMonth = new Date(options.ano, options.mes, 0)
    const endOfMonthStr = endOfMonth.toISOString().substring(0, 10)

    const lines: PayrollPreviewLine[] = []

    for (const agg of aggregates) {
        // Get rate for this employee
        const rate = await getActiveRateAtDate(agg.employee_id, endOfMonthStr)
        if (!rate) continue // Skip employees without active rate

        const taxaHoraria = rateToHourly(rate, horasPadrao)

        // Normal hours (cap at horasPadrao per day for weekdays)
        let horasNormais = 0
        for (const [dateStr, h] of Object.entries(agg.horas_por_dia)) {
            const dow = new Date(dateStr).getDay()
            if (dow === 0 || dow === 6) continue // weekend = all overtime
            horasNormais += Math.min(h, horasPadrao)
        }

        // Salary base
        const salarioBase = rateToMonthlyBase(
            rate,
            agg.dias_trabalhados,
            horasNormais,
        )

        // Overtime
        const { horasExtra, valorExtra } = calculateOvertime(
            agg.horas_por_dia,
            horasPadrao,
            config,
            taxaHoraria,
        )

        // Meal allowance
        const subAlimentacao = agg.dias_trabalhados * config.subsidio_alimentacao_valor

        // Subsidies
        let subFerias = 0
        let subNatal = 0
        const mesesTrabalho = agg.data_admissao
            ? monthsDiff(agg.data_admissao, endOfMonth)
            : 12
        const proporcionalidade = mesesTrabalho / 12

        if (options.incluirSubFerias) {
            subFerias = Math.round(
                (rate.tipo === 'monthly'
                    ? rate.valor
                    : salarioBase) * proporcionalidade * 100,
            ) / 100
        }
        if (options.incluirSubNatal) {
            subNatal = Math.round(
                (rate.tipo === 'monthly'
                    ? rate.valor
                    : salarioBase) * proporcionalidade * 100,
            ) / 100
        }

        // Gross (meal allowance is separate for tax purposes)
        const totalBruto = Math.round(
            (salarioBase + valorExtra + subFerias + subNatal) * 100,
        ) / 100

        // SS employee deduction
        const descontoSS = Math.round(totalBruto * config.ss_taxa_trabalhador) / 100

        // IRS
        const irs = calculateIRS(
            totalBruto,
            agg.situacao_fiscal,
            agg.numero_dependentes,
        )

        // SS employer cost
        const ssEntidade = Math.round(totalBruto * config.ss_taxa_entidade) / 100

        // Net = gross - SS - IRS + meal allowance (exempt)
        const totalLiquido = Math.round(
            (totalBruto - descontoSS - irs.retencao + subAlimentacao) * 100,
        ) / 100

        lines.push({
            employee_id: agg.employee_id,
            employee_name: agg.employee_name,
            employee_role: agg.employee_role,
            dias_trabalhados: agg.dias_trabalhados,
            horas_normais: Math.round(horasNormais * 100) / 100,
            horas_extra: horasExtra,
            salario_base: Math.round(salarioBase * 100) / 100,
            valor_horas_extra: valorExtra,
            subsidio_alimentacao: subAlimentacao,
            subsidio_ferias: subFerias,
            subsidio_natal: subNatal,
            total_bruto: totalBruto,
            desconto_ss: descontoSS,
            desconto_irs: irs.retencao,
            ss_entidade: ssEntidade,
            total_liquido: totalLiquido,
            irs_tabela: irs.tabela,
            irs_taxa_marginal: irs.taxaMarginal,
            irs_deducao: irs.deducao,
            taxa_tipo: rate.tipo,
            taxa_valor: rate.valor,
            situacao_fiscal: agg.situacao_fiscal,
            numero_dependentes: agg.numero_dependentes,
        })
    }

    return lines
}

// ── Process Payroll (persist) ───────────────────────────────

export async function processPayroll(
    options: PayrollProcessOptions,
): Promise<PayrollRun> {
    const profile = await getProfile()
    const previewLines = await previewPayroll(options)

    if (previewLines.length === 0) {
        throw new Error('Sem funcionários com timesheets aprovados neste período')
    }

    // Calculate totals
    const totals = previewLines.reduce(
        (acc, l) => ({
            bruto: acc.bruto + l.total_bruto,
            ssEntidade: acc.ssEntidade + l.ss_entidade,
            ssTrabalhador: acc.ssTrabalhador + l.desconto_ss,
            irs: acc.irs + l.desconto_irs,
            liquido: acc.liquido + l.total_liquido,
            subAlimentacao: acc.subAlimentacao + l.subsidio_alimentacao,
        }),
        { bruto: 0, ssEntidade: 0, ssTrabalhador: 0, irs: 0, liquido: 0, subAlimentacao: 0 },
    )

    // Insert run
    const { data: run, error: runError } = await supabase
        .from('payroll_runs')
        .insert({
            tenant_id: profile.tenant_id,
            periodo_mes: options.mes,
            periodo_ano: options.ano,
            status: 'Processado',
            inclui_sub_ferias: options.incluirSubFerias,
            inclui_sub_natal: options.incluirSubNatal,
            total_bruto: Math.round(totals.bruto * 100) / 100,
            total_ss_entidade: Math.round(totals.ssEntidade * 100) / 100,
            total_ss_trabalhador: Math.round(totals.ssTrabalhador * 100) / 100,
            total_irs: Math.round(totals.irs * 100) / 100,
            total_liquido: Math.round(totals.liquido * 100) / 100,
            total_subsidio_alimentacao: Math.round(totals.subAlimentacao * 100) / 100,
            num_funcionarios: previewLines.length,
            processado_por: profile.id,
            processado_em: new Date().toISOString(),
            created_by: profile.id,
        } as unknown as never)
        .select()
        .single()

    if (runError) throw new Error(runError.message)
    const payrollRun = run as unknown as PayrollRun

    // Bulk insert lines
    const lineInserts = previewLines.map((l) => ({
        tenant_id: profile.tenant_id,
        payroll_run_id: payrollRun.id,
        employee_id: l.employee_id,
        dias_trabalhados: l.dias_trabalhados,
        horas_normais: l.horas_normais,
        horas_extra: l.horas_extra,
        salario_base: l.salario_base,
        valor_horas_extra: l.valor_horas_extra,
        subsidio_alimentacao: l.subsidio_alimentacao,
        subsidio_ferias: l.subsidio_ferias,
        subsidio_natal: l.subsidio_natal,
        outros_abonos: 0,
        total_bruto: l.total_bruto,
        desconto_ss: l.desconto_ss,
        desconto_irs: l.desconto_irs,
        outros_descontos: 0,
        ss_entidade: l.ss_entidade,
        total_liquido: l.total_liquido,
        irs_tabela: l.irs_tabela,
        irs_taxa_marginal: l.irs_taxa_marginal,
        irs_deducao: l.irs_deducao,
        taxa_tipo: l.taxa_tipo,
        taxa_valor: l.taxa_valor,
        situacao_fiscal: l.situacao_fiscal,
        numero_dependentes: l.numero_dependentes,
    }))

    const { error: linesError } = await supabase
        .from('payroll_lines')
        .insert(lineInserts as unknown as never)

    if (linesError) throw new Error(linesError.message)

    return payrollRun
}
