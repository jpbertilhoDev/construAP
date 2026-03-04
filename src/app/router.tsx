import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from '@/app/layouts/AppLayout'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RequirePermission } from '@/features/auth/RequirePermission'
import { RequireFeature } from '@/features/auth/RequireFeature'
import { RequirePlatformAdmin } from '@/features/auth/RequirePlatformAdmin'
import { LoginPage } from '@/features/auth/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { RegisterPage } from '@/features/auth/RegisterPage'

// Lazy load feature pages
const DashboardPage = lazy(() =>
    import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const ObrasListPage = lazy(() =>
    import('@/features/obras/ObrasListPage').then((m) => ({ default: m.ObrasListPage })),
)
const ObraDetailPage = lazy(() =>
    import('@/features/obras/ObraDetailPage').then((m) => ({ default: m.ObraDetailPage })),
)
const ObraFormPage = lazy(() =>
    import('@/features/obras/ObraFormPage').then((m) => ({ default: m.ObraFormPage })),
)
const EmpreendimentosListPage = lazy(() =>
    import('@/features/imobiliario/EmpreendimentosListPage').then((m) => ({ default: m.EmpreendimentosListPage })),
)
const EmpreendimentoDetailPage = lazy(() =>
    import('@/features/imobiliario/EmpreendimentoDetailPage').then((m) => ({ default: m.EmpreendimentoDetailPage })),
)
const RelatoriosPage = lazy(() =>
    import('@/features/relatorios/RelatoriosPage').then((m) => ({ default: m.RelatoriosPage })),
)
const ReportObrasPage = lazy(() =>
    import('@/features/relatorios/executar/ReportObrasPage').then((m) => ({ default: m.ReportObrasPage })),
)
const ReportBudgetPage = lazy(() =>
    import('@/features/relatorios/executar/ReportBudgetPage').then((m) => ({ default: m.ReportBudgetPage })),
)
const ReportTimesheetPage = lazy(() =>
    import('@/features/relatorios/executar/ReportTimesheetPage').then((m) => ({ default: m.ReportTimesheetPage })),
)
const AdminPage = lazy(() =>
    import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage })),
)
const FinancePage = lazy(() =>
    import('@/features/finance/FinancePage').then((m) => ({ default: m.FinancePage })),
)
// ── Payroll ────────────────────────────────────────────────────
const PayrollPage = lazy(() =>
    import('@/features/payroll/PayrollPage').then((m) => ({ default: m.PayrollPage })),
)
const PayrollProcessPage = lazy(() =>
    import('@/features/payroll/PayrollProcessPage').then((m) => ({ default: m.PayrollProcessPage })),
)
const PayrollRunDetailPage = lazy(() =>
    import('@/features/payroll/PayrollRunDetailPage').then((m) => ({ default: m.PayrollRunDetailPage })),
)
// ── RH ──────────────────────────────────────────────────────────
const RHPage = lazy(() =>
    import('@/features/rh/RHPage').then((m) => ({ default: m.RHPage })),
)
const FuncionariosListPage = lazy(() =>
    import('@/features/rh/FuncionariosListPage').then((m) => ({ default: m.FuncionariosListPage })),
)
const FuncionarioDetailPage = lazy(() =>
    import('@/features/rh/FuncionarioDetailPage').then((m) => ({ default: m.FuncionarioDetailPage })),
)
const ApontamentosPage = lazy(() =>
    import('@/features/rh/ApontamentosPage').then((m) => ({ default: m.ApontamentosPage })),
)
const AprovacoesPage = lazy(() =>
    import('@/features/rh/AprovacoesPage').then((m) => ({ default: m.AprovacoesPage })),
)
// ── Compras ──────────────────────────────────────────────────────
const ComprasPage = lazy(() =>
    import('@/features/compras/ComprasPage').then((m) => ({ default: m.ComprasPage })),
)
const FornecedoresListPage = lazy(() =>
    import('@/features/compras/FornecedoresListPage').then((m) => ({ default: m.FornecedoresListPage })),
)
const MateriaisPage = lazy(() =>
    import('@/features/compras/MateriaisPage').then((m) => ({ default: m.MateriaisPage })),
)
const PedidosListPage = lazy(() =>
    import('@/features/compras/PedidosListPage').then((m) => ({ default: m.PedidosListPage })),
)
const PedidoDetailPage = lazy(() =>
    import('@/features/compras/PedidoDetailPage').then((m) => ({ default: m.PedidoDetailPage })),
)
const ConsumoPage = lazy(() =>
    import('@/features/compras/ConsumoPage').then((m) => ({ default: m.ConsumoPage })),
)
// ── Platform Admin ──────────────────────────────────────────────
const PlatformDashboardPage = lazy(() =>
    import('@/features/platform/PlatformDashboardPage').then((m) => ({ default: m.PlatformDashboardPage })),
)
const PlatformTenantsPage = lazy(() =>
    import('@/features/platform/PlatformTenantsPage').then((m) => ({ default: m.PlatformTenantsPage })),
)
const PlatformTenantDetailPage = lazy(() =>
    import('@/features/platform/PlatformTenantDetailPage').then((m) => ({ default: m.PlatformTenantDetailPage })),
)
const MinhaAreaPage = lazy(() =>
    import('@/features/minha-area/MinhaAreaPage').then((m) => ({ default: m.MinhaAreaPage })),
)


function PageLoader() {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    )
}

const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
    },
    {
        path: '/reset-password',
        element: <ResetPasswordPage />,
    },
    {
        path: '/register',
        element: <RegisterPage />,
    },

    {
        path: '/',
        element: (
            <RequireAuth>
                <AppLayout />
            </RequireAuth>
        ),
        children: [
            {
                index: true,
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <DashboardPage />
                    </Suspense>
                ),
            },
            {
                path: 'minha-area',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <MinhaAreaPage />
                    </Suspense>
                ),
            },
            {
                path: 'obras',
                element: (
                    <RequirePermission permission="obras.view">
                        <Suspense fallback={<PageLoader />}><ObrasListPage /></Suspense>
                    </RequirePermission>
                ),
            },
            {
                path: 'obras/new',
                element: (
                    <RequirePermission permission="obras.manage">
                        <Suspense fallback={<PageLoader />}><ObraFormPage /></Suspense>
                    </RequirePermission>
                ),
            },
            {
                path: 'obras/:id/edit',
                element: (
                    <RequirePermission permission="obras.manage">
                        <Suspense fallback={<PageLoader />}><ObraFormPage /></Suspense>
                    </RequirePermission>
                ),
            },
            {
                path: 'obras/:id/*',
                element: (
                    <RequirePermission permission="obras.view">
                        <Suspense fallback={<PageLoader />}><ObraDetailPage /></Suspense>
                    </RequirePermission>
                ),
            },
            {
                path: 'imobiliario',
                element: (
                    <RequireFeature feature="imobiliario">
                        <Suspense fallback={<PageLoader />}>
                            <EmpreendimentosListPage />
                        </Suspense>
                    </RequireFeature>
                ),
            },
            {
                path: 'relatorios',
                children: [
                    {
                        index: true,
                        element: (<RequirePermission permission="relatorios.view"><Suspense fallback={<PageLoader />}><RelatoriosPage /></Suspense></RequirePermission>),
                    },
                    {
                        path: 'obras',
                        element: (<RequirePermission permission="relatorios.view"><Suspense fallback={<PageLoader />}><ReportObrasPage /></Suspense></RequirePermission>),
                    },
                    {
                        path: 'orcamentos',
                        element: (<RequirePermission permission="relatorios.view"><Suspense fallback={<PageLoader />}><ReportBudgetPage /></Suspense></RequirePermission>),
                    },
                    {
                        path: 'equipas',
                        element: (<RequirePermission permission="relatorios.view"><Suspense fallback={<PageLoader />}><ReportTimesheetPage /></Suspense></RequirePermission>),
                    }
                ]
            },
            {
                path: 'imobiliario/:id',
                element: (
                    <RequireFeature feature="imobiliario">
                        <Suspense fallback={<PageLoader />}>
                            <EmpreendimentoDetailPage />
                        </Suspense>
                    </RequireFeature>
                ),
            },
            {
                path: 'admin',
                element: (
                    <RequirePermission permission="admin.view">
                        <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>
                    </RequirePermission>
                ),
            },
            {
                path: 'finance',
                element: (
                    <RequirePermission permission="finance.view">
                        <Suspense fallback={<PageLoader />}><FinancePage /></Suspense>
                    </RequirePermission>
                ),
            },
            // ── RH ──────────────────────────────────────────────────
            {
                path: 'rh',
                element: (<RequirePermission permission="rh.view"><Suspense fallback={<PageLoader />}><RHPage /></Suspense></RequirePermission>),
            },
            {
                path: 'rh/funcionarios',
                element: (<RequirePermission permission="rh.view"><Suspense fallback={<PageLoader />}><FuncionariosListPage /></Suspense></RequirePermission>),
            },
            {
                path: 'rh/funcionarios/:id',
                element: (<RequirePermission permission="rh.view"><Suspense fallback={<PageLoader />}><FuncionarioDetailPage /></Suspense></RequirePermission>),
            },
            {
                path: 'rh/apontamentos',
                element: (<RequirePermission permission="rh.view"><Suspense fallback={<PageLoader />}><ApontamentosPage /></Suspense></RequirePermission>),
            },
            {
                path: 'rh/aprovacoes',
                element: (<RequirePermission permission="rh.manage"><Suspense fallback={<PageLoader />}><AprovacoesPage /></Suspense></RequirePermission>),
            },
            {
                path: 'rh/salarios',
                element: (<RequirePermission permission="rh.view"><RequireFeature feature="payroll"><Suspense fallback={<PageLoader />}><PayrollPage /></Suspense></RequireFeature></RequirePermission>),
            },
            {
                path: 'rh/salarios/processar',
                element: (<RequirePermission permission="rh.manage"><RequireFeature feature="payroll"><Suspense fallback={<PageLoader />}><PayrollProcessPage /></Suspense></RequireFeature></RequirePermission>),
            },
            {
                path: 'rh/salarios/:id',
                element: (<RequirePermission permission="rh.view"><RequireFeature feature="payroll"><Suspense fallback={<PageLoader />}><PayrollRunDetailPage /></Suspense></RequireFeature></RequirePermission>),
            },
            // ── Compras ──────────────────────────────────────────────
            {
                path: 'compras',
                element: (<RequirePermission permission="compras.view"><Suspense fallback={<PageLoader />}><ComprasPage /></Suspense></RequirePermission>),
            },
            {
                path: 'compras/fornecedores',
                element: (<RequirePermission permission="compras.view"><Suspense fallback={<PageLoader />}><FornecedoresListPage /></Suspense></RequirePermission>),
            },
            {
                path: 'compras/materiais',
                element: (<RequirePermission permission="compras.view"><Suspense fallback={<PageLoader />}><MateriaisPage /></Suspense></RequirePermission>),
            },
            {
                path: 'compras/pedidos',
                element: (<RequirePermission permission="compras.view"><Suspense fallback={<PageLoader />}><PedidosListPage /></Suspense></RequirePermission>),
            },
            {
                path: 'compras/pedidos/:id',
                element: (<RequirePermission permission="compras.view"><Suspense fallback={<PageLoader />}><PedidoDetailPage /></Suspense></RequirePermission>),
            },
            {
                path: 'compras/consumo',
                element: (<RequirePermission permission="compras.view"><Suspense fallback={<PageLoader />}><ConsumoPage /></Suspense></RequirePermission>),
            },
            // ── Platform Admin ──────────────────────────────────────────
            {
                path: 'platform',
                element: (<RequirePlatformAdmin><Suspense fallback={<PageLoader />}><PlatformDashboardPage /></Suspense></RequirePlatformAdmin>),
            },
            {
                path: 'platform/tenants',
                element: (<RequirePlatformAdmin><Suspense fallback={<PageLoader />}><PlatformTenantsPage /></Suspense></RequirePlatformAdmin>),
            },
            {
                path: 'platform/tenants/:id',
                element: (<RequirePlatformAdmin><Suspense fallback={<PageLoader />}><PlatformTenantDetailPage /></Suspense></RequirePlatformAdmin>),
            },
        ]
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    }
])

export function AppRouter() {
    return <RouterProvider router={router} />
}
