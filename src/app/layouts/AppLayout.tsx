import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    HardHat,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    Wallet,
    Users,
    ShoppingCart,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import logoApp from '@/assets/logoapp.png'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/obras', icon: HardHat, label: 'Obras' },
    { to: '/finance', icon: Wallet, label: 'Financeiro' },
    { to: '/rh', icon: Users, label: 'RH' },
    { to: '/compras', icon: ShoppingCart, label: 'Compras' },
    // { to: '/imobiliario', icon: Building2, label: 'Imobiliário' }, // oculto temporariamente
    { to: '/relatorios', icon: FileText, label: 'Relatórios' },
    { to: '/admin', icon: Settings, label: 'Administração' },
]


export function AppLayout() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleSignOut = async () => {
        await signOut()
        navigate('/login', { replace: true })
    }

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/60 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:static lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
                    <img src={logoApp} alt="ConstruAP Logo" className="h-8" />
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                                )
                            }
                        >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* User */}
                <div className="px-3 py-4 border-t border-sidebar-border">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">
                                {user?.email?.[0]?.toUpperCase() ?? 'U'}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-sidebar-foreground truncate">
                                {user?.email ?? ''}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-sidebar-foreground hover:text-destructive"
                        onClick={() => void handleSignOut()}
                    >
                        <LogOut className="h-4 w-4" />
                        Sair
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top bar (mobile) */}
                <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background lg:hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                    <img src={logoApp} alt="ConstruAP Logo" className="h-6" />
                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                    </Button>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
