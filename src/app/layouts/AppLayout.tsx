// @ts-nocheck
import { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
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
    Crown,
    UserCircle2,
    AlertTriangle,
    Check,
    Clock,
    Receipt,
    Hammer,
    Users2,
    CalendarDays,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePermissions, type PermissionKey } from '@/features/auth/usePermissions'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PlanBadge } from '@/components/PlanBadge'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import logoApp from '@/assets/logoapp.png'

interface NavItem {
    to: string
    icon: React.ElementType
    label: string
    permission: PermissionKey
}

const navItems: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard.view' },
    { to: '/obras', icon: HardHat, label: 'Obras', permission: 'obras.view' },
    { to: '/agenda', icon: CalendarDays, label: 'Agenda', permission: 'obras.view' },
    { to: '/clientes', icon: Users2, label: 'Clientes', permission: 'clientes.view' },
    { to: '/finance', icon: Wallet, label: 'Financeiro', permission: 'finance.view' },
    { to: '/rh', icon: Users, label: 'RH', permission: 'rh.view' },
    { to: '/compras', icon: ShoppingCart, label: 'Compras', permission: 'compras.view' },
    { to: '/relatorios', icon: FileText, label: 'Relatórios', permission: 'relatorios.view' },
    { to: '/admin', icon: Settings, label: 'Administração', permission: 'admin.view' },
]

const notifIcons = {
    cost: Hammer,
    task: Check,
    payable: Wallet,
    receivable: Receipt,
    timesheet: Clock,
}

export function AppLayout() {
    const { user, signOut } = useAuth()
    const { hasPermission, isLoading: permsLoading } = usePermissions()
    const { isPlatformAdmin } = usePlatformAdmin()
    const { data: notifications = [] } = useNotifications()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)

    // Filter nav items the current user has access to
    const visibleNavItems = navItems.filter((item) => {
        if (permsLoading) return item.permission === 'dashboard.view'
        return hasPermission(item.permission)
    })

    const handleSignOut = async () => {
        await signOut()
        navigate('/login', { replace: true })
    }

    const unreadCount = notifications.length

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
                <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
                    <img src={logoApp} alt="ConstruAP Logo" className="h-8" />
                    <PlanBadge />
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {/* Minha Área — visible to all authenticated users */}
                    <NavLink
                        to="/minha-area"
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
                        <UserCircle2 className="h-4 w-4 flex-shrink-0" />
                        Minha Área
                    </NavLink>

                    <div className="my-1 border-t border-sidebar-border/40" />

                    {visibleNavItems.map(({ to, icon: Icon, label }) => (
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

                    {/* Platform Admin link */}
                    {isPlatformAdmin && (
                        <>
                            <div className="my-2 border-t border-sidebar-border" />
                            <NavLink
                                to="/platform"
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                            : 'text-amber-600 dark:text-amber-500 hover:bg-amber-500/10',
                                    )
                                }
                            >
                                <Crown className="h-4 w-4 flex-shrink-0" />
                                Platform Admin
                            </NavLink>
                        </>
                    )}
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
                {/* Top bar */}
                <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
                    {/* Mobile: hamburger */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>

                    <img src={logoApp} alt="ConstruAP Logo" className="h-6 lg:hidden" />

                    <div className="flex-1 hidden lg:block" />

                    {/* Notification Bell */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-80 p-0" align="end">
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <Bell className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-semibold text-sm">Notificações</p>
                                </div>
                                {unreadCount > 0 && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
                                        {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mb-3">
                                            <Check className="h-5 w-5 text-green-600" />
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground">Tudo em dia!</p>
                                        <p className="text-xs text-muted-foreground mt-1">Sem pendências de momento.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {notifications.map((notif) => {
                                            const Icon = notifIcons[notif.type] ?? AlertTriangle
                                            const iconColors = {
                                                cost: 'text-amber-500 bg-amber-500/10',
                                                task: 'text-blue-500 bg-blue-500/10',
                                                payable: 'text-red-500 bg-red-500/10',
                                                receivable: 'text-orange-500 bg-orange-500/10',
                                                timesheet: 'text-purple-500 bg-purple-500/10',
                                            }
                                            const iconClass = iconColors[notif.type] ?? 'text-muted-foreground bg-muted'
                                            return (
                                                <Link
                                                    key={notif.id}
                                                    to={notif.link}
                                                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                                                >
                                                    <div className={cn('mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0', iconClass)}>
                                                        <Icon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold leading-tight mb-0.5">{notif.title}</p>
                                                        <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">{notif.description}</p>
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {notifications.length > 0 && (
                                <div className="border-t px-4 py-2">
                                    <p className="text-[11px] text-muted-foreground text-center">
                                        Atualizado automaticamente a cada 30s
                                    </p>
                                </div>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

