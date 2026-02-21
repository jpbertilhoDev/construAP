// ============================================================
// database.types.ts — Tipos TypeScript alinhados com o schema PostgreSQL
// Gerado manualmente — executar `supabase gen types typescript` para atualizar
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ObraStatus = 'Em preparação' | 'Em execução' | 'Suspensa' | 'Concluída' | 'Arquivada'
export type ObraType = 'Construção Nova' | 'Remodelação' | 'Reabilitação' | 'Especialidades' | 'Outro'
export type BudgetStatus = 'Rascunho' | 'Pendente Aprovação' | 'Aprovado' | 'Histórico'
export type CostStatus = 'Rascunho' | 'Pendente Aprovação' | 'Aprovado' | 'Anulado'
export type TaskStatus = 'Aberta' | 'Em Curso' | 'Concluída' | 'Cancelada'
export type TaskPriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica'
export type FracaoStatus = 'Disponível' | 'Reservada' | 'Vendida' | 'Arrendada' | 'Indisponível'
export type UserRole = 'admin' | 'gestor' | 'encarregado' | 'financeiro' | 'compras' | 'leitura'
export type PurchaseOrderStatus = 'Rascunho' | 'Pendente Aprovação' | 'Aprovado' | 'Encomendado' | 'Recebido' | 'Cancelado'
export type PayableStatus = 'Pendente' | 'Parcial' | 'Pago' | 'Cancelado'
export type ReceivableStatus = 'Pendente' | 'Parcial' | 'Pago' | 'Cancelado'
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'


// ─── Database schema ───────────────────────────────────────────────────────────

export interface Database {
    public: {
        Tables: {
            tenants: {
                Row: {
                    id: string
                    name: string
                    nif: string | null
                    email: string | null
                    logo_url: string | null
                    plan: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['tenants']['Insert']>
            }
            profiles: {
                Row: {
                    id: string
                    tenant_id: string
                    name: string
                    phone: string | null
                    avatar_url: string | null
                    consent_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
                Update: Partial<Pick<Database['public']['Tables']['profiles']['Row'], 'name' | 'phone' | 'avatar_url'>>
            }
            user_roles: {
                Row: {
                    id: string
                    tenant_id: string
                    profile_id: string
                    obra_id: string | null
                    role: UserRole
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['user_roles']['Row'], 'id' | 'created_at'>
                Update: Partial<Pick<Database['public']['Tables']['user_roles']['Row'], 'role'>>
            }
            clients: {
                Row: {
                    id: string
                    tenant_id: string
                    name: string
                    nif: string | null
                    email: string | null
                    phone: string | null
                    type: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['clients']['Insert']>
            }
            suppliers: {
                Row: {
                    id: string
                    tenant_id: string
                    name: string
                    nif: string | null
                    email: string | null
                    phone: string | null
                    category: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
            }
            obras: {
                Row: {
                    id: string
                    tenant_id: string
                    name: string
                    ref: string | null
                    client_id: string | null
                    address: string | null
                    type: ObraType
                    status: ObraStatus
                    start_date: string | null
                    end_date_planned: string | null
                    end_date_actual: string | null
                    contract_value: number
                    created_by: string
                    created_at: string

                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['obras']['Row'], 'id' | 'created_at' | 'updated_at'> & { contract_value?: number }
                Update: Partial<Omit<Database['public']['Tables']['obras']['Row'], 'id' | 'tenant_id' | 'created_by' | 'created_at' | 'updated_at'>>
            }

            budgets: {
                Row: {
                    id: string
                    obra_id: string
                    tenant_id: string
                    version: number
                    status: BudgetStatus
                    notes: string | null
                    approved_by: string | null
                    approved_at: string | null
                    created_by: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Pick<Database['public']['Tables']['budgets']['Row'], 'status' | 'notes' | 'approved_by' | 'approved_at'>>
            }
            budget_items: {
                Row: {
                    id: string
                    budget_id: string
                    tenant_id: string
                    chapter_id: string | null
                    description: string
                    unit: string
                    qty: number
                    unit_price: number
                    total: number
                    sort_order: number
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['budget_items']['Row'], 'id' | 'total' | 'created_at' | 'updated_at'>
                Update: Partial<Pick<Database['public']['Tables']['budget_items']['Row'], 'description' | 'unit' | 'qty' | 'unit_price' | 'sort_order'>>
            }
            costs: {
                Row: {
                    id: string
                    obra_id: string
                    tenant_id: string
                    budget_item_id: string | null
                    chapter_id: string | null
                    supplier_id: string | null
                    description: string
                    amount: number
                    cost_date: string
                    doc_url: string | null
                    doc_number: string | null
                    status: CostStatus
                    notes: string | null
                    approved_by: string | null
                    approved_at: string | null
                    created_by: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['costs']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Pick<Database['public']['Tables']['costs']['Row'], 'description' | 'amount' | 'cost_date' | 'status' | 'notes'>>
            }
            diario_entries: {
                Row: {
                    id: string
                    obra_id: string
                    tenant_id: string
                    entry_date: string
                    weather: string | null
                    resources_count: number
                    activities: string | null
                    notes: string | null
                    created_by: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['diario_entries']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Pick<Database['public']['Tables']['diario_entries']['Row'], 'weather' | 'resources_count' | 'activities' | 'notes'>>
            }
            tasks: {
                Row: {
                    id: string
                    obra_id: string
                    tenant_id: string
                    title: string
                    description: string | null
                    assignee_id: string | null
                    due_date: string | null
                    status: TaskStatus
                    priority: TaskPriority
                    created_by: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Pick<Database['public']['Tables']['tasks']['Row'], 'title' | 'description' | 'assignee_id' | 'due_date' | 'status' | 'priority'>>
            }
            documents: {
                Row: {
                    id: string
                    obra_id: string
                    tenant_id: string
                    name: string
                    category: string
                    version: number
                    storage_path: string
                    mime_type: string | null
                    size_bytes: number | null
                    uploaded_by: string
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at'>
                Update: never
            }
            notifications: {
                Row: {
                    id: string
                    tenant_id: string
                    user_id: string
                    type: string
                    title: string
                    message: string | null
                    link: string | null
                    read_at: string | null
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
                Update: Pick<Database['public']['Tables']['notifications']['Row'], 'read_at'>
            }
            empreendimentos: {
                Row: {
                    id: string
                    tenant_id: string
                    obra_id: string | null
                    name: string
                    address: string | null
                    total_units: number
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['empreendimentos']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['empreendimentos']['Insert']>
            }
            accounts_payable: {
                Row: {
                    id: string
                    tenant_id: string
                    obra_id: string | null
                    supplier_id: string | null
                    cost_id: string | null
                    description: string
                    amount: number
                    due_date: string
                    status: PayableStatus
                    notes: string | null
                    created_by: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['accounts_payable']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['accounts_payable']['Insert']>
            }
            accounts_receivable: {
                Row: {
                    id: string
                    tenant_id: string
                    obra_id: string | null
                    client_id: string | null
                    description: string
                    amount: number
                    due_date: string
                    status: ReceivableStatus
                    notes: string | null
                    created_by: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['accounts_receivable']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['accounts_receivable']['Insert']>
            }
            financial_transactions: {
                Row: {
                    id: string
                    tenant_id: string
                    ap_id: string | null
                    ar_id: string | null
                    amount: number
                    transaction_date: string
                    method: string
                    receipt_url: string | null
                    notes: string | null
                    created_by: string
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['financial_transactions']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['financial_transactions']['Insert']>
            }
            fracoes: {

                Row: {
                    id: string
                    empreendimento_id: string
                    tenant_id: string
                    ref: string
                    type: string
                    floor: number | null
                    area_m2: number | null
                    orientation: string | null
                    status: FracaoStatus
                    sale_price: number | null
                    client_id: string | null
                    contract_date: string | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['fracoes']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Database['public']['Tables']['fracoes']['Row'], 'id' | 'tenant_id' | 'empreendimento_id' | 'created_at' | 'updated_at'>>
            }
        }
        Views: {
            vw_obra_financials: {
                Row: {
                    obra_id: string
                    tenant_id: string
                    obra_name: string
                    status: ObraStatus
                    total_budgeted: number
                    total_costs: number
                    deviation: number
                    deviation_pct: number | null
                }
            }
        }
        Functions: Record<string, never>
        Enums: {
            obra_status: ObraStatus
            obra_type: ObraType
            user_role: UserRole
            task_status: TaskStatus
            task_priority: TaskPriority
            cost_status: CostStatus
            budget_status: BudgetStatus
            fracao_status: FracaoStatus
        }
    }
}
