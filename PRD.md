# Product Requirements Document (PRD) - ConstruAP

## 1. Objetivo e Visao do Produto

O **ConstruAP** e uma aplicacao web (SPA - Single Page Application) no modelo SaaS (Software as a Service) focada na gestao de projetos de construcao e imobiliario para o mercado portugues.

**Visao:** Centralizar, organizar e automatizar a gestao de obras, financas, recursos humanos e controle imobiliario, fornecendo a gestores, engenheiros e administradores uma ferramenta unica para acompanhar dados operacionais em tempo real e reduzir o trabalho manual.

**Proposta de Valor:**
- Plataforma unica que substitui folhas de calculo, emails e software fragmentado
- Multi-tenancy nativo: cada empresa cliente opera num ambiente completamente isolado
- Interface 100% em Portugues com formatacao nativa de moeda (EUR), datas e NIF
- Acessivel via browser (desktop e mobile) sem instalacao

---

## 2. Publico-Alvo e Utilizadores

### 2.1. Modelo Multi-Tenant

O sistema suporta multiplos *tenants* (empresas clientes), garantindo isolamento total dos dados de cada empresa via Row Level Security (RLS) no Supabase. Cada tenant possui a sua propria configuracao, utilizadores, roles e dados.

### 2.2. Perfis de Utilizador (RBAC)

Os utilizadores internos de cada tenant sao geridos atraves de um sistema de permissoes granulares:

| Role | Descricao | Permissoes-Chave |
|------|-----------|------------------|
| **Admin** | Administrador do tenant | `admin.manage`, acesso total a configuracoes, utilizadores e aprovacoes |
| **Gestor** | Gestor de obra | `obras.manage`, gestao operacional de projetos, orcamentos, custos |
| **Encarregado** | Encarregado de obra | `obras.view`, diario de obra, tarefas, apontamentos em campo |
| **Financeiro** | Responsavel financeiro | `finance.manage`, custos, pagamentos, faturas, orcamentos |
| **Compras** | Departamento de compras | `compras.manage`, ordens de compra, fornecedores, materiais |
| **RH** | Recursos Humanos | `rh.manage`, folhas de pagamento, registo de horas, pessoal |
| **Leitura** | Apenas visualizacao | Visualizacao de dados sem poder de modificacao |

### 2.3. Sistema de Permissoes

As permissoes seguem o padrao `modulo.acao`:

- `dashboard.view` - Acesso ao dashboard
- `obras.view` / `obras.manage` - Visualizar / Gerir obras
- `finance.view` / `finance.manage` - Visualizar / Gerir financas
- `rh.view` / `rh.manage` - Visualizar / Gerir RH e payroll
- `compras.view` / `compras.manage` - Visualizar / Gerir compras
- `relatorios.view` - Gerar relatorios
- `admin.view` / `admin.manage` - Administracao do sistema
- `imobiliario.view` - Modulo imobiliario

Cada tenant pode criar **roles customizados** (`roles` table) com combinacoes especificas de permissoes, permitindo flexibilidade total na organizacao de acessos.

---

## 3. Arquitetura Tecnologica

### 3.1. Stack Tecnologico

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 19 + TypeScript + Vite 7 |
| **Styling** | Tailwind CSS 3 + shadcn/ui (New-York style) + CVA para variantes |
| **Formularios** | React Hook Form + Zod (validacao) |
| **Tabelas** | TanStack React Table |
| **Server State** | TanStack React Query (retry: 2, sem retry em 4xx) |
| **Client State** | Zustand (disponivel), React Context (auth) |
| **Notificacoes** | Sonner (toasts) |
| **Graficos** | Recharts |
| **Icones** | Lucide React |
| **Exportacao** | jsPDF + jsPDF-autotable (PDF), CSV nativo com UTF-8 BOM |
| **i18n** | i18next + react-i18next |
| **Backend** | Supabase (PostgreSQL) com RLS, Triggers, RPCs |
| **Autenticacao** | Supabase Auth (JWT) |
| **Storage** | Supabase Storage (4 buckets) |

### 3.2. Arquitetura de Pastas (Feature-Based)

```
src/
+-- app/                   # Providers (QueryClient, Auth), Router, AppLayout
+-- features/              # Modulos de negocio (self-contained)
|   +-- auth/              # Login, Registo, Reset Password, Guards
|   +-- dashboard/         # Dashboards por role (Admin, Obras, Finance, RH, Compras)
|   +-- obras/             # Gestao de obras completa
|   +-- imobiliario/       # Empreendimentos e fracoes
|   +-- finance/           # Contas a pagar/receber, cashflow
|   +-- rh/                # Funcionarios, apontamentos, aprovacoes
|   +-- payroll/           # Processamento de salarios
|   +-- compras/           # Fornecedores, materiais, POs, GRNs
|   +-- relatorios/        # Modulo de relatorios
|   +-- admin/             # Painel de administracao
+-- components/ui/         # Primitivas shadcn/ui
+-- services/              # Funcoes de query Supabase (1 ficheiro por dominio)
+-- lib/                   # Supabase clients, React Query config, export utils
+-- hooks/                 # Hooks partilhados (useProfile, usePermissions)
+-- types/                 # database.types.ts (gerado), declaracoes de tipos
+-- tests/                 # Setup de testes (jsdom, vitest globals)
```

### 3.3. Fluxo de Dados

```
Supabase DB (PostgreSQL + RLS)
    |
    v
Services (src/services/*.ts) -- chamadas directas ao Supabase
    |
    v
React Query Hooks (src/features/*/hooks/) -- cache, retry, invalidation
    |
    v
Page Components (src/features/*/pages/) -- render UI
```

### 3.4. Routing e Navegacao

React Router v7 com lazy-loading de paginas. Todas as rotas protegidas por:
1. `RequireAuth` - Verifica sessao JWT activa
2. `RequirePermission` - Verifica permissoes do utilizador para o modulo

**Mapa de Rotas:**

| Rota | Modulo | Permissao |
|------|--------|-----------|
| `/login`, `/forgot-password`, `/reset-password` | Auth | Publica |
| `/` | Dashboard | `dashboard.view` |
| `/obras`, `/obras/new`, `/obras/:id/*` | Obras | `obras.view` / `obras.manage` |
| `/imobiliario`, `/imobiliario/:id` | Imobiliario | `imobiliario.view` |
| `/finance` | Financas | `finance.view` |
| `/rh`, `/rh/funcionarios`, `/rh/funcionarios/:id` | RH | `rh.view` |
| `/rh/apontamentos`, `/rh/aprovacoes` | RH Timesheets | `rh.view` / `rh.manage` |
| `/rh/salarios`, `/rh/salarios/processar`, `/rh/salarios/:id` | Payroll | `rh.manage` |
| `/compras`, `/compras/fornecedores`, `/compras/materiais` | Compras | `compras.view` |
| `/compras/pedidos`, `/compras/pedidos/:id`, `/compras/consumo` | Compras POs | `compras.manage` |
| `/relatorios`, `/relatorios/obras`, `/relatorios/orcamentos`, `/relatorios/equipas` | Relatorios | `relatorios.view` |
| `/admin` | Administracao | `admin.manage` |

### 3.5. Storage (Supabase Buckets)

| Bucket | Limite | Tipos MIME | Uso |
|--------|--------|------------|-----|
| `documentos` | 50 MB | PDF, JPEG, PNG | Documentos de obra, diario, geral |
| `custos-anexos` | 10 MB | PDF, JPEG, PNG | Comprovativos de custos (faturas, recibos) |
| `avatares` | 5 MB (publico) | JPEG, PNG, WEBP | Fotos de perfil de funcionarios |
| `imobiliario` | -- | PDF, JPEG, PNG | Plantas, certificados, contratos imobiliarios |

Todos os buckets usam isolamento por `tenant_id` como prefixo de path no storage.

---

## 4. Requisitos Funcionais (Modulos do Sistema)

### 4.1. Modulo de Autenticacao e Onboarding

**Paginas:** Login, Registo, Esqueci Palavra-Passe, Redefinir Palavra-Passe.

**Fluxo de Registo:**
1. Utilizador regista-se com email e password via Supabase Auth
2. Trigger `handle_new_user()` cria automaticamente o `profile` e atribui roles
3. Se e o primeiro utilizador do tenant, recebe role `admin` e as roles de sistema sao criadas (Admin, RH, Financeiro, Compras, Obras)
4. Se e um utilizador convidado, recebe o role atribuido pelo admin

**Seguranca:**
- Sessoes JWT com refresh automatico
- `RequireAuth` guard em todas as rotas protegidas
- `RequirePermission` guard para controlo granular por modulo

---

### 4.2. Modulo de Obras (Gestao Operacional)

O modulo central do sistema. Gere todo o ciclo de vida de um projeto de construcao.

#### 4.2.1. Registo de Obras
- Criacao e listagem de projetos com atributos: Nome, Referencia, Cliente, Morada, Tipo, Datas (inicio, fim planeado, fim real), Valor do Contrato
- **Tipos de obra:** Construcao Nova, Remodelacao, Reabilitacao, Especialidades, Outro
- **Estados:** Em preparacao -> Em execucao -> Suspensa / Concluida -> Arquivada
- Cada obra pode ter orcamentos, custos, diario, tarefas, documentos e alocacoes de pessoal

#### 4.2.2. Orcamentos (Budgets)
- Orcamentos **versionados** com estrutura hierarquica: Capitulos (`obra_chapters`) -> Itens (`budget_items`)
- Capitulos hierarquicos com `parent_id` para sub-capitulos e `sort_order` para ordenacao
- Cada item: Descricao, Unidade, Quantidade, Preco Unitario, **Total calculado automaticamente** (`qty * unit_price`, coluna GENERATED)
- **Fluxo de aprovacao:** Rascunho -> Pendente Aprovacao -> Aprovado -> Historico
- Notificacao automatica a admins/gestores quando estado muda para "Pendente Aprovacao"
- View `vw_obra_financials`: calcula total orcado vs custos reais, desvio absoluto e percentual

#### 4.2.3. Custos Reais (Costs)
- Lancamento de despesas alocadas a obra, capitulo e rubrica especifica
- Atributos: Descricao, Valor, Data, Fornecedor, Nr. Documento, URL do comprovativo
- **Fluxo de aprovacao:** Rascunho -> Pendente Aprovacao -> Aprovado -> Anulado
- Upload de comprovativos para bucket `custos-anexos`
- **Automacao:** Quando um custo e Aprovado, cria automaticamente uma entrada em `accounts_payable` (trigger `trg_cost_approval_creates_ap`)

#### 4.2.4. Diario de Obra (Avancado)
- Registo diario unico por obra/data com:
  - **Clima:** Condicoes meteorologicas
  - **Trabalhadores por categoria:** JSONB com contagem por tipo de profissional (pedreiros, carpinteiros, electricistas, etc.)
  - **Equipamento utilizado:** JSONB com lista de equipamentos em uso
  - **Atividades estruturadas:** JSONB com descricao detalhada das atividades do dia
  - **Percentagem de progresso:** Campo `progress_pct` para acompanhamento do avanco fisico
  - **Notas livres:** Observacoes adicionais
- **Fotografias:** Upload de fotos com legenda (tabela `diario_photos`, bucket `documentos`)
- **Incidentes:** Tabela separada `diario_incidents` com:
  - Descricao do incidente
  - Nivel de severidade
  - Autor do registo
- **Timeline:** Visualizacao cronologica das entradas
- **Exportacao para PDF:** Exportacao do diario completo ou por intervalo de datas

#### 4.2.5. Gestao de Tarefas (Punch List)
- Criacao de tarefas com: Titulo, Descricao, Responsavel, Data Limite, Prioridade, Estado
- **Prioridades:** Baixa, Media, Alta, Critica
- **Estados:** Aberta -> Em Curso -> Concluida / Cancelada
- Anexos por tarefa (tabela `task_attachments`)
- Notificacao automatica quando tarefa e atribuida (trigger `notify_on_task_assignment`)

#### 4.2.6. Gestao de Documentos
- Repositorio centralizado por obra
- Atributos: Nome, Categoria (Geral, Planta, etc.), Versao, Tipo MIME, Tamanho
- Upload para bucket `documentos` com versionamento
- Signed URLs para acesso seguro

#### 4.2.7. Alocacoes de Pessoal
- Atribuicao de funcionarios a obras com data de inicio e fim
- Visibilidade nas tabs da obra para saber quem esta alocado
- Base para calculo de custos de mao-de-obra via timesheets

---

### 4.3. Modulo de Financas

#### 4.3.1. Contas a Pagar (Accounts Payable)
- Registo de faturas de fornecedores com: Descricao, Valor, Data de Vencimento, Fornecedor, Obra
- **Estados:** Pendente -> Parcial -> Pago -> Cancelado
- Ligacao opcional a custo (`cost_id`) para rastreabilidade
- **Automacao:** Entrada criada automaticamente quando custo e aprovado

#### 4.3.2. Contas a Receber (Accounts Receivable)
- Registo de faturas a clientes com: Descricao, Valor, Data de Vencimento, Cliente, Obra
- **Estados:** Pendente -> Parcial -> Pago -> Cancelado

#### 4.3.3. Transacoes Financeiras
- Registo de pagamentos/recebimentos efectivos
- Ligacao a AP ou AR (mutuamente exclusivos via CHECK constraint)
- Atributos: Valor, Data, Metodo (Transferencia, Numerario, Cheque), Comprovativo
- **Automacao:**
  - Quando AP passa a "Pago", cria transacao automaticamente (trigger `trg_ap_payment_creates_tx`)
  - Quando AR passa a "Pago", cria transacao automaticamente (trigger `trg_ar_receipt_creates_tx`)

#### 4.3.4. Cashflow Dashboard
- View `vw_cashflow`: Agregacao de entradas e saidas por data, obra e metodo
- Analise de aging (faturas vencidas)
- Posicao de caixa em tempo real

---

### 4.4. Modulo de Compras (Procurement)

#### 4.4.1. Gestao de Fornecedores
- Ficha completa: Nome, NIF, Email, Telefone, Morada, Categoria
- **Tipo:** Material, Servico, Ambos
- Condicoes de pagamento configuráveis
- **Estado:** Ativo / Inativo

#### 4.4.2. Catalogo de Materiais
- Ficha de material: Codigo (unico por tenant), Nome, Descricao, Categoria
- **Unidades:** un, kg, m, m2, m3, L, ROL, CX, hr, outro
- Taxa de IVA configuravel por material (default 23%)
- Custo medio (calculado automaticamente via media ponderada em recepcoes)
- **Gestao de Stock:** Estoque atual, estoque minimo (para alertas de reposicao)
- **Tipo:** Material ou Servico
- Estado ativo/inativo

#### 4.4.3. Ordens de Compra (Purchase Orders)
- Numeracao sequencial automatica: `PO-YYYY-NNN`
- Cabeçalho: Fornecedor, Obra, Data do Pedido, Data de Entrega Prevista, Notas
- **Linhas:** Material, Descricao, Quantidade, Preco Unitario, IVA%, Total s/ IVA, Data de Entrega, Qtd. Recebida
- Totais calculados: Total sem IVA, Total com IVA
- **Fluxo de estados:**
  ```
  Rascunho -> Submetido -> Aprovado -> Em Curso -> Parcialmente Recebido -> Recebido
                                    \-> Cancelado (com motivo obrigatorio)
  ```
- Aprovacao por utilizador com permissao (registo de `aprovado_por` e `aprovado_em`)

#### 4.4.4. Guias de Recepcao (Goods Receipt Notes - GRN)
- Recepcao parcial ou total de uma PO
- Linhas de GRN com: Quantidade recebida, Preco unitario efectivo
- **Detecao de divergencias:** Flag automatica se quantidade ou preco diferem da PO
- Notas de divergencia por linha
- **Automacoes:**
  - Actualiza `qtd_recebida` na linha da PO
  - Actualiza stock do material (trigger `update_material_stock_on_grn`) com calculo de custo medio ponderado
  - Gera registo de custo (`cost_entry_id`) para integracao financeira

#### 4.4.5. Consumo de Materiais
- Registo de consumo por obra/material/data
- Atributos: Quantidade, Custo Unitario, Custo Total, Observacao
- **Automacao:** Decrementa stock automaticamente (trigger `update_material_stock_on_consumption`)
- Gera entrada de custo (`cost_entry_id`) para rastreabilidade financeira

#### 4.4.6. Movimentos de Stock
- Registo auditavel de todas as movimentacoes: Entrada, Saida, Ajuste
- Referencia ao documento de origem (GRN, consumo, ajuste manual)
- Rastreabilidade por obra

---

### 4.5. Modulo Imobiliario (Empreendimentos)

#### 4.5.1. Empreendimentos
- Registo de empreendimentos imobiliarios com ligacao opcional a obra
- Atributos: Nome, Morada, Descricao, Concelho, Distrito, Promotor, Arquiteto, Ano de Construcao, Total de Unidades
- **Estados:** Em Construcao -> Em Comercializacao -> Concluido -> Suspenso -> Arquivado
- Configuracao de dias de reserva padrao por empreendimento

#### 4.5.2. Blocos
- Divisao do empreendimento em blocos/torres
- Nome unico por empreendimento
- Organiza as fracoes fisicamente

#### 4.5.3. Tipologias
- Definicao de tipos de unidade por empreendimento: T0, T1, T2, T3, T4+, Garagem, Arrecadacao, Comercial, Lote, Outro
- Atributos: Designacao, Area Bruta, Area Util, Quartos, Casas de Banho, Notas

#### 4.5.4. Fracoes (Unidades)
- Gestao granular de cada unidade dentro do empreendimento
- Atributos: Referencia, Tipo, Piso, Bloco, Tipologia, Area (bruta e util), Orientacao, Preco Atual, Designacao
- **Estado comercial:** Disponivel -> Reservado -> Vendido / Bloqueado (com motivo)
- Ligacao a cliente quando vendida
- **Importacao em massa via CSV** para criacao rapida de multiplas fracoes

#### 4.5.5. Historico de Precos
- Tabela append-only `fracao_preco_historico`
- Regista: Preco anterior, Preco novo, Delta percentual, Motivo da alteracao
- Auditoria completa de quem alterou e quando

#### 4.5.6. Reservas
- Gestao de reservas de fracoes com:
  - Dados do cliente: Nome, Email, Telefone, NIF
  - Valor do sinal e preco de venda
  - Data de inicio e expiracao
  - Contagem de extensoes
- **Estados:** Ativa -> Expirada / Cancelada (com motivo) / Confirmada
- Dias de reserva configuráveis por empreendimento

#### 4.5.7. Documentos Imobiliarios
- Documentos associados a empreendimento ou fracao especifica
- **Tipos:** Planta, Certificado, Caderneta, Regulamento, Contrato, Foto, Outro
- Versionamento e soft-delete (`deleted_at`)

#### 4.5.8. Auditoria Imobiliaria
- Registo automatico de todas as alteracoes em tabelas do modulo imobiliario
- Visualizacao na tab de Auditoria do empreendimento

---

### 4.6. Modulo de Recursos Humanos (RH)

#### 4.6.1. Gestao de Funcionarios
- Ficha completa: Nome, NIF (unico por tenant), NISS, Email, Telefone, Morada, Data de Nascimento, Data de Admissao, IBAN
- **Funcao:** Ligacao a `employee_roles` (categorias profissionais customizaveis por tenant)
- **Estado:** Ativo, Inativo, Suspenso
- Foto de perfil (bucket `avatares`)
- **Dados fiscais:** Situacao fiscal (solteiro, casado 2 titulares, casado unico titular), Numero de dependentes

#### 4.6.2. Categorias Profissionais (Employee Roles)
- Definicao customizada por tenant (Ex: Engenheiro, Pedreiro, Electricista, Administrativo)
- Associacao a cada funcionario

#### 4.6.3. Taxas Salariais (Employee Rates)
- Registo de taxas com intervalo de validade (data inicio / data fim)
- **Tipos:** Hora (hourly), Dia (daily), Mes (monthly)
- Historico append-only para auditoria

#### 4.6.4. Equipas (Teams)
- Criacao de equipas com ligacao a obra
- Membros com datas de entrada e saida

#### 4.6.5. Alocacoes
- Atribuicao de funcionarios a obras com periodo definido
- Restricao: data fim >= data inicio
- Base para apontamentos e payroll

#### 4.6.6. Apontamentos (Timesheets)
- Registo diario por funcionario/obra: Data, Horas, Presenca, Observacao
- Restricao de unicidade: 1 entrada por funcionario/obra/dia
- **Fluxo de aprovacao:**
  ```
  Rascunho -> Submetido -> Aprovado (com custo calculado automaticamente)
                        \-> Rejeitado (com motivo obrigatorio)
  ```
- Quando aprovado:
  - Calcula `custo_calculado` com base na taxa salarial activa do funcionario
  - Gera entrada de custo na obra (`cost_entry_id`)
- Paginas dedicadas: Submissao de apontamentos e Painel de aprovacoes

---

### 4.7. Modulo de Payroll (Folhas de Pagamento)

#### 4.7.1. Configuracao de Payroll (por tenant)
Parametros configuraveis:

| Parametro | Default | Descricao |
|-----------|---------|-----------|
| SS Taxa Entidade | 23.75% | Contribuicao patronal Seguranca Social |
| SS Taxa Trabalhador | 11.00% | Desconto SS do funcionario |
| Subsidio de Alimentacao | 6.00 EUR | Valor diario |
| Tipo Sub. Alimentacao | Cash | Cash ou Cartao (impacto fiscal diferente) |
| Horas Extra 1a hora | 1.25x | Multiplicador primeira hora extra (dia util) |
| Horas Extra subsequentes | 1.375x | Multiplicador horas seguintes (dia util) |
| Horas Extra dia descanso | 1.50x | Multiplicador dia de descanso |
| Horas Extra feriado | 2.00x | Multiplicador feriado |
| Horas Diarias Padrao | 8.0h | Horas normais por dia |

#### 4.7.2. Processamento Mensal
1. Selecao de periodo (mes/ano) e opcoes (incluir subsidio de ferias e/ou Natal)
2. **Agregacao automatica** de timesheets aprovados via RPC `get_payroll_timesheet_aggregate`:
   - Dias trabalhados, total de horas, horas por dia (JSONB detalhado)
3. **Calculo por funcionario:**
   - **Salario base:** Taxa mensal ou (taxa horaria/diaria * horas/dias trabalhados)
   - **Horas extra:** Calculo diferenciado por tipo de dia (util, descanso, feriado)
   - **Subsidio de alimentacao:** Valor diario * dias trabalhados
   - **Subsidio de ferias:** Proporcional (se incluido)
   - **Subsidio de Natal:** Proporcional (se incluido)
   - **Total Bruto:** Salario + Extras + Subsidios + Outros abonos
   - **Desconto SS trabalhador:** Total bruto * 11%
   - **Desconto IRS:** Calculo segundo tabelas AT 2025 (Tabela I para solteiros/casados 2 titulares, Tabela III para casados unico titular), com deducao por dependente
   - **SS Entidade:** Total bruto * 23.75%
   - **Total Liquido:** Total bruto - SS trabalhador - IRS - Outros descontos

#### 4.7.3. Fluxo de Estados
```
Rascunho -> Processado (preview com calculos) -> Finalizado (bloqueado para edicao)
                                               \-> Anulado
```

#### 4.7.4. Detalhes do Payroll Run
- Totais agregados: Bruto, SS Entidade, SS Trabalhador, IRS, Liquido, Sub. Alimentacao
- Numero de funcionarios processados
- Detalhamento por funcionario (payroll lines) com todos os campos calculados
- Registo de quem processou e finalizou, com timestamps

#### 4.7.5. Exportacao
- **PDF detalhado** via `payrollExportPdf.ts` com:
  - Cabeçalho do tenant e periodo
  - Tabela de funcionarios com breakdown completo
  - Totais e resumos

---

### 4.8. Dashboards

Dashboards role-based que se adaptam ao perfil do utilizador autenticado:

#### 4.8.1. Dashboard Admin
- Visao geral financeira agregada de todas as obras
- Desvios totais de orcamento (via `vw_obra_financials`)
- Alertas pendentes e notificacoes
- KPIs de performance global

#### 4.8.2. Dashboard Obras
- Metricas individuais da obra: progresso fisico, orcado vs real
- Lista de obras activas com estado
- Ultimas entradas do diario

#### 4.8.3. Dashboard Financas
- Posicao de caixa (cashflow)
- Faturas pendentes (AP e AR)
- Analise de aging

#### 4.8.4. Dashboard RH
- Visao geral de funcionarios activos
- Apontamentos pendentes de aprovacao
- Resumo de payroll

#### 4.8.5. Dashboard Compras
- Ordens de compra em aberto
- Alertas de stock minimo
- Recepcoes pendentes

---

### 4.9. Modulo de Relatorios

#### 4.9.1. Relatorios Disponiveis

| Relatorio | Dados | Fonte |
|-----------|-------|-------|
| **Estado das Obras** | Lista de obras com estado, datas, valor contratual | View `vw_report_obra_status` |
| **Orcamento vs Real** | Por obra: valor contratual, custos reais, margem de lucro, % lucro | RPC `get_report_budget_vs_actual` |
| **Equipas (Timesheets)** | Por funcionario/obra: total horas, presencas, custo calculado | RPC `get_report_timesheet_aggregate` |

#### 4.9.2. Funcionalidades Comuns
- **Filtros:** Intervalo de datas, obra especifica
- **Componentes reutilizaveis:** `ReportFilterBar`, `ReportDataTable`, `ReportKpiCards`
- **Exportacao:** CSV (com UTF-8 BOM para compatibilidade Excel) e PDF
- **Auditoria de exportacao:** Cada exportacao e registada no `audit_log` via RPC `log_report_export`

---

### 4.10. Modulo de Administracao

#### 4.10.1. Gestao de Utilizadores
- Criar/convidar utilizadores (via Supabase Admin API com service role key)
- Eliminar utilizadores com cascade
- Atribuir roles (globais ou scoped a obra)
- Visualizacao de estado: Ativo, Pendente, Orfao

#### 4.10.2. Gestao de Roles
- Roles de sistema pre-definidos: Admin, RH, Financeiro, Compras, Obras
- Criacao de roles customizados por tenant
- Matriz de permissoes: associar permissoes a cada role

#### 4.10.3. Configuracoes do Tenant
- Nome da empresa, NIF, Email de contacto
- Logo da empresa
- Outras configuracoes especificas

---

## 5. Modelo de Dados

### 5.1. Enumeracoes (Enums)

| Enum | Valores |
|------|---------|
| `obra_status` | Em preparacao, Em execucao, Suspensa, Concluida, Arquivada |
| `obra_type` | Construcao Nova, Remodelacao, Reabilitacao, Especialidades, Outro |
| `budget_status` | Rascunho, Pendente Aprovacao, Aprovado, Historico |
| `cost_status` | Rascunho, Pendente Aprovacao, Aprovado, Anulado |
| `task_status` | Aberta, Em Curso, Concluida, Cancelada |
| `task_priority` | Baixa, Media, Alta, Critica |
| `fracao_status` | Disponivel, Reservada, Vendida, Arrendada, Indisponivel |
| `user_role` | admin, gestor, encarregado, financeiro, compras, leitura, custom, Admin do Tenant, Super Admin, Administrativo |
| `payable_status` | Pendente, Parcial, Pago, Cancelado |
| `receivable_status` | Pendente, Parcial, Pago, Cancelado |
| `audit_action` | INSERT, UPDATE, DELETE, EXPORT_REPORT |

### 5.2. Diagrama de Entidades (Resumido)

```
tenants (raiz)
  +-- profiles (auth.users)
  +-- user_roles
  +-- roles (custom RBAC)
  |     +-- role_permissions -> permissions
  +-- clients
  +-- suppliers
  +-- employees
  |     +-- employee_roles
  |     +-- employee_rates
  |     +-- allocations -> obras
  |     +-- timesheets -> obras
  +-- obras
  |     +-- obra_chapters (hierarquicos)
  |     +-- budgets -> budget_items
  |     +-- costs
  |     +-- diario_entries -> diario_photos, diario_incidents
  |     +-- tasks -> task_attachments
  |     +-- documents
  +-- empreendimentos
  |     +-- blocos
  |     +-- tipologias
  |     +-- fracoes -> fracao_preco_historico
  |     +-- reservas
  |     +-- imob_documentos
  +-- materials
  +-- purchase_orders -> purchase_order_lines
  +-- goods_receipts -> goods_receipt_lines
  +-- material_consumptions
  +-- stock_movements
  +-- accounts_payable -> financial_transactions
  +-- accounts_receivable -> financial_transactions
  +-- payroll_config
  +-- payroll_runs -> payroll_lines
  +-- notifications
  +-- audit_log (append-only)
```

### 5.3. Tabelas Principais

**Contagem total: ~48 tabelas + 3 views + 7 RPCs**

As tabelas organizam-se em 8 dominios:

1. **Core (6):** tenants, profiles, user_roles, clients, suppliers, notifications
2. **RBAC (3):** permissions, roles, role_permissions
3. **Obras (8):** obras, obra_chapters, budgets, budget_items, costs, diario_entries, diario_photos, diario_incidents, tasks, task_attachments, documents
4. **Imobiliario (7):** empreendimentos, blocos, tipologias, fracoes, fracao_preco_historico, reservas, imob_documentos
5. **RH (6):** employees, employee_roles, employee_rates, teams, team_members, allocations, timesheets
6. **Payroll (3):** payroll_config, payroll_runs, payroll_lines
7. **Compras (6):** materials, purchase_orders, purchase_order_lines, goods_receipts, goods_receipt_lines, material_consumptions, stock_movements
8. **Financas (3):** accounts_payable, accounts_receivable, financial_transactions
9. **Auditoria (2):** audit_log, conflict_log

---

## 6. Automacoes e Triggers

O sistema utiliza triggers PostgreSQL para manter a consistencia dos dados e automatizar fluxos:

### 6.1. Fluxo Financeiro Automatizado
```
Custo Aprovado --trigger--> Cria Conta a Pagar (AP)
AP marcado Pago --trigger--> Cria Transacao Financeira
AR marcado Pago --trigger--> Cria Transacao Financeira
```

### 6.2. Gestao de Stock Automatizada
```
GRN recebida --trigger--> Actualiza stock + custo medio ponderado
Consumo registado --trigger--> Decrementa stock
```

### 6.3. Custos de Mao-de-Obra
```
Timesheet aprovado --logica aplicacional--> Calcula custo + Cria entrada em costs
```

### 6.4. Notificacoes Automaticas
- Tarefa atribuida -> Notificacao ao responsavel
- Orcamento "Pendente Aprovacao" -> Notificacao a admins/gestores

### 6.5. Auditoria
- INSERT/UPDATE/DELETE em budgets, budget_items, costs, obras -> Registo em `audit_log`
- Exportacao de relatorios -> Registo via `log_report_export`
- Alteracoes em fracoes -> Registo na auditoria imobiliaria

### 6.6. Timestamps
- `update_updated_at()` trigger em todas as tabelas editaveis

### 6.7. Onboarding
- `handle_new_user()` trigger em `auth.users` para auto-criacao de profiles e roles

---

## 7. Requisitos Nao Funcionais

### 7.1. Idioma e Localizacao
- Interface 100% em Portugues (PT-PT / PT-BR)
- Formatacao de moeda: Euros (EUR / EUR)
- Formatacao de datas: DD/MM/YYYY
- NIF (9 digitos), NISS (11 digitos), IBAN portugues
- Tabelas de IRS conforme AT 2025

### 7.2. Seguranca e Multi-Tenancy
- **Isolamento total:** tenant_id em todas as tabelas com RLS enforced a nivel de BD
- **RLS nao-contornavel:** Mesmo que o frontend tenha bugs, a BD recusa acessos cross-tenant
- **Storage isolado:** Prefixo tenant_id em todos os paths de ficheiros
- **Audit log append-only:** Sem UPDATE/DELETE permitido via RLS
- **Funcoes SECURITY DEFINER:** `get_tenant_id()`, `has_permission()` executam com privilegios elevados para evitar recursao RLS

### 7.3. Performance
- SPA com React Router e lazy-loading de paginas (code splitting)
- React Query com cache local (staleTime configuravel, retry: 2)
- Indices em todas as colunas de lookup frequente (tenant_id, obra_id, status, datas)
- Views materializadas para relatorios pesados (`vw_obra_financials`, `vw_cashflow`, `vw_report_obra_status`)

### 7.4. Auditoria e Compliance
- Tabela `audit_log` com registo automatico de todas as alteracoes criticas
- Campos `created_by`, `created_at`, `updated_at` em todas as tabelas
- Registo de exportacoes de relatorios
- Historico de precos imobiliarios (append-only)
- Taxas salariais com historico temporal

### 7.5. Responsividade
- Layout responsivo com sidebar colapsavel (desktop) e hamburger menu (mobile)
- Diario de obra optimizado para uso em tablet/smartphone no estaleiro
- Tabelas com scroll horizontal em ecras pequenos

### 7.6. Exportacao de Dados
- CSV com UTF-8 BOM para compatibilidade com Excel
- PDF via jsPDF + jsPDF-autotable para relatorios formatados
- Print via browser para relatorios rapidos

---

## 8. Fluxos de Trabalho Integrados

### 8.1. Ciclo de Vida de uma Obra
```
1. Criar Obra (Em preparacao)
2. Definir orcamento (capitulos + itens)
3. Submeter orcamento para aprovacao
4. Alocar funcionarios
5. Iniciar obra (Em execucao)
6. Registar diario diariamente (campo)
7. Registar custos e compras
8. Aprovar timesheets -> gerar custos de mao-de-obra
9. Monitorizar desvio orcamental (Dashboard)
10. Gerar relatorios periodicos
11. Concluir obra
12. Arquivar
```

### 8.2. Ciclo de Compra
```
1. Registar fornecedor + materiais no catalogo
2. Criar PO (Rascunho)
3. Submeter PO -> Aprovar PO
4. Receber material (GRN) -> Stock actualizado automaticamente
5. Verificar divergencias (quantidade, preco)
6. Custo gerado automaticamente -> Fluxo financeiro activado
7. Registar consumo por obra -> Stock decrementado
```

### 8.3. Ciclo de Payroll Mensal
```
1. Funcionarios registam horas (apontamentos) ao longo do mes
2. Gestor/RH aprova apontamentos
3. RH configura parametros de payroll (se necessario)
4. RH processa payroll do mes:
   a. Agregacao automatica de timesheets
   b. Calculo de salario base + extras
   c. Calculo de IRS (tabelas AT)
   d. Calculo de SS (entidade + trabalhador)
   e. Subsidios (alimentacao, ferias, Natal)
5. Preview e validacao
6. Finalizar payroll
7. Exportar PDF para contabilidade
```

### 8.4. Ciclo Imobiliario
```
1. Criar empreendimento (ligado a obra se aplicavel)
2. Definir blocos e tipologias
3. Criar fracoes (individual ou bulk CSV)
4. Definir precos (com historico automatico)
5. Gerir pipeline comercial:
   - Disponivel -> Reservar (com sinal e expiracao)
   - Reserva -> Confirmar venda / Expirar / Cancelar
   - Venda -> Associar cliente, contrato, documentos
6. Acompanhar auditoria de todas as alteracoes
```

---

## 9. Criterios de Sucesso e KPIs

Para que o software seja considerado um sucesso:

### 9.1. Usabilidade
1. **Adopcao do Diario de Obra:** Engenheiros preenchem o diario num tablet/smartphone no estaleiro de forma rapida e intuitiva
2. **Tempo de onboarding:** Novo utilizador operacional em menos de 30 minutos sem formacao presencial

### 9.2. Precisao
3. **Precisao Financeira:** Relatorios de "Desvio de Orcamento" 100% consistentes com o calculo da view `vw_obra_financials`
4. **Payroll correcto:** Calculos de IRS e SS validados contra as tabelas oficiais da AT 2025

### 9.3. Seguranca
5. **Zero incidentes de vazamento:** Inviolabilidade do isolamento multi-tenant
6. **Auditoria completa:** 100% das alteracoes em dados criticos registadas no audit_log

### 9.4. Performance
7. **Tempo de carregamento:** Dashboard carrega em < 3 segundos
8. **Navegacao fluida:** Transicoes entre paginas em < 1 segundo (lazy-loading)

---

## 10. Glossario

| Termo | Significado |
|-------|------------|
| **Obra** | Projeto de construcao |
| **Empreendimento** | Desenvolvimento imobiliario (edificio, urbanizacao) |
| **Fracao** | Unidade individual dentro de um empreendimento (apartamento, loja, garagem) |
| **Tipologia** | Tipo de fracao (T0, T1, T2, T3, T4+, Garagem, etc.) |
| **Bloco** | Divisao fisica de um empreendimento (torre, bloco) |
| **Diario de Obra** | Registo diario de atividades, recursos e condicoes no estaleiro |
| **Punch List** | Lista de tarefas/deficiencias a corrigir numa obra |
| **PO** | Purchase Order / Ordem de Compra |
| **GRN** | Goods Receipt Note / Guia de Recepcao de Material |
| **AP** | Accounts Payable / Contas a Pagar |
| **AR** | Accounts Receivable / Contas a Receber |
| **Apontamento** | Timesheet / Registo de horas de trabalho |
| **Payroll** | Processamento de folhas de pagamento |
| **Tenant** | Empresa cliente no modelo SaaS |
| **RLS** | Row Level Security (isolamento de dados a nivel de BD) |
| **RBAC** | Role-Based Access Control (controlo de acesso baseado em roles) |
| **NIF** | Numero de Identificacao Fiscal |
| **NISS** | Numero de Identificacao da Seguranca Social |
| **SS** | Seguranca Social |
| **IRS** | Imposto sobre Rendimento de Pessoas Singulares |
| **AT** | Autoridade Tributaria e Aduaneira |
| **IVA** | Imposto sobre Valor Acrescentado |
