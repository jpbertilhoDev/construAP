import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from '@/app/layouts/AppLayout'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { LoginPage } from '@/features/auth/LoginPage'
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
                path: 'obras',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <ObrasListPage />
                    </Suspense>
                ),
            },
            {
                path: 'obras/new',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <ObraFormPage />
                    </Suspense>
                ),
            },
            {
                path: 'obras/:id/edit',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <ObraFormPage />
                    </Suspense>
                ),
            },
            {
                path: 'obras/:id/*',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <ObraDetailPage />
                    </Suspense>
                ),
            },
            {
                path: 'imobiliario',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <EmpreendimentosListPage />
                    </Suspense>
                ),
            },
            {
                path: 'relatorios',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <RelatoriosPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'obras',
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <ReportObrasPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'orcamentos',
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <ReportBudgetPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'equipas',
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <ReportTimesheetPage />
                            </Suspense>
                        ),
                    }
                ]
            },
            {
                path: 'imobiliario/:id',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <EmpreendimentoDetailPage />
                    </Suspense>
                ),
            },
            {
                path: 'admin',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <AdminPage />
                    </Suspense>
                ),
            },
            {
                path: 'finance',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <FinancePage />
                    </Suspense>
                ),
            },
            // ── RH ──────────────────────────────────────────────────
            {
                path: 'rh',
                element: (<Suspense fallback={<PageLoader />}><RHPage /></Suspense>),
            },
            {
                path: 'rh/funcionarios',
                element: (<Suspense fallback={<PageLoader />}><FuncionariosListPage /></Suspense>),
            },
            {
                path: 'rh/funcionarios/:id',
                element: (<Suspense fallback={<PageLoader />}><FuncionarioDetailPage /></Suspense>),
            },
            {
                path: 'rh/apontamentos',
                element: (<Suspense fallback={<PageLoader />}><ApontamentosPage /></Suspense>),
            },
            {
                path: 'rh/aprovacoes',
                element: (<Suspense fallback={<PageLoader />}><AprovacoesPage /></Suspense>),
            },
            // ── Compras ──────────────────────────────────────────────
            {
                path: 'compras',
                element: (<Suspense fallback={<PageLoader />}><ComprasPage /></Suspense>),
            },
            {
                path: 'compras/fornecedores',
                element: (<Suspense fallback={<PageLoader />}><FornecedoresListPage /></Suspense>),
            },
            {
                path: 'compras/materiais',
                element: (<Suspense fallback={<PageLoader />}><MateriaisPage /></Suspense>),
            },
            {
                path: 'compras/pedidos',
                element: (<Suspense fallback={<PageLoader />}><PedidosListPage /></Suspense>),
            },
            {
                path: 'compras/pedidos/:id',
                element: (<Suspense fallback={<PageLoader />}><PedidoDetailPage /></Suspense>),
            },
            {
                path: 'compras/consumo',
                element: (<Suspense fallback={<PageLoader />}><ConsumoPage /></Suspense>),
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
