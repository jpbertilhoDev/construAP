import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, HardHat, Building2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useObras } from '@/features/obras/hooks/useObras'
import { formatDate } from '@/lib/utils'
import type { ObraType } from '@/types/database.types'


const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'outline' | 'destructive'> = {
    'Em preparação': 'outline',
    'Em execução': 'success',
    'Suspensa': 'warning',
    'Concluída': 'default',
    'Arquivada': 'outline',
}


const typeIcon: Record<ObraType, string> = {
    'Construção Nova': '🏗️',
    'Remodelação': '🔨',
    'Reabilitação': '♻️',
    'Especialidades': '⚡',
    'Outro': '📋',
}

export function ObrasListPage() {
    const [search, setSearch] = useState('')
    const { data: obras = [], isLoading, isError, refetch } = useObras()


    const filtered = obras.filter(
        (o) =>
            o.name.toLowerCase().includes(search.toLowerCase()) ||
            (o.ref ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (o.address ?? '').toLowerCase().includes(search.toLowerCase()),
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Obras</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {isLoading ? '...' : `${obras.length} obra${obras.length !== 1 ? 's' : ''} no total`}
                    </p>
                </div>
                <Button asChild>
                    <Link to="/obras/new">
                        <Plus className="h-4 w-4" />
                        Nova Obra
                    </Link>
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Pesquisar obras..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Error */}
            {isError && (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="pt-4 flex items-center gap-3">
                        <p className="text-sm text-destructive flex-1">Erro ao carregar obras.</p>
                        <Button size="sm" variant="outline" onClick={() => void refetch()}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Loading skeleton */}
            {isLoading && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardContent className="pt-5 pb-5">
                                <div className="animate-pulse space-y-2">
                                    <div className="h-4 bg-muted rounded w-1/3" />
                                    <div className="h-3 bg-muted rounded w-1/4" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && filtered.length === 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                {search ? (
                                    <Search className="h-8 w-8 text-muted-foreground" />
                                ) : (
                                    <HardHat className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                            <p className="font-semibold text-lg">
                                {search ? 'Sem resultados' : 'Nenhuma obra criada'}
                            </p>
                            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                                {search
                                    ? `Nenhuma obra corresponde a "${search}".`
                                    : 'Crie a sua primeira obra para começar a controlar orçamentos e custos.'}
                            </p>
                            {!search && (
                                <Button className="mt-6" asChild>
                                    <Link to="/obras/new">
                                        <Plus className="h-4 w-4" />
                                        Criar Primeira Obra
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Obras list with Tabs */}
            {!isLoading && !isError && filtered.length > 0 && (
                <Tabs defaultValue="ativas" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="ativas">Obras Ativas</TabsTrigger>
                        <TabsTrigger value="arquivadas">Arquivadas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="ativas" className="space-y-3">
                        {filtered.filter(o => o.status !== 'Arquivada').length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center italic">Não existem obras ativas correspondentes à pesquisa.</p>
                        ) : (
                            filtered.filter(o => o.status !== 'Arquivada').map((obra) => (
                                <Link key={obra.id} to={`/obras/${obra.id}`} className="block group">
                                    <Card className="transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
                                        <CardContent className="pt-4 pb-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                                                        {typeIcon[obra.type as keyof typeof typeIcon] ?? '📋'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold truncate group-hover:text-primary transition-colors">
                                                            {obra.name}
                                                        </p>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                                            {obra.ref && (
                                                                <span className="text-xs text-muted-foreground">{obra.ref}</span>
                                                            )}
                                                            {obra.address && (
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Building2 className="h-3 w-3" />
                                                                    {obra.address}
                                                                </span>
                                                            )}
                                                            {obra.start_date && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Início: {formatDate(obra.start_date)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant={statusVariant[obra.status] as never} className="shrink-0">
                                                    {obra.status}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="arquivadas" className="space-y-3">
                        {filtered.filter(o => o.status === 'Arquivada').length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center italic">Não existem obras arquivadas correspondentes à pesquisa.</p>
                        ) : (
                            filtered.filter(o => o.status === 'Arquivada').map((obra) => (
                                <Link key={obra.id} to={`/obras/${obra.id}`} className="block group">
                                    <Card className="transition-all hover:shadow-md hover:border-primary/30 cursor-pointer opacity-70 group-hover:opacity-100">
                                        <CardContent className="pt-4 pb-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-lg grayscale">
                                                        {typeIcon[obra.type as keyof typeof typeIcon] ?? '📋'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold truncate group-hover:text-primary transition-colors">
                                                            {obra.name}
                                                        </p>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                                            {obra.ref && (
                                                                <span className="text-xs text-muted-foreground">{obra.ref}</span>
                                                            )}
                                                            {obra.address && (
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Building2 className="h-3 w-3" />
                                                                    {obra.address}
                                                                </span>
                                                            )}
                                                            {obra.start_date && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Início: {formatDate(obra.start_date)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant={statusVariant[obra.status] as never} className="shrink-0">
                                                    {obra.status}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}
