import { useState } from 'react'
import { Plus, Search, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMaterials, useCreateMaterial } from './hooks/useCompras'
import { useForm } from 'react-hook-form'
import { formatCurrency } from '@/lib/utils'
import type { Material } from '@/services/materiais'
import { usePermissions } from '@/features/auth/usePermissions'

const UNIDADES = ['un', 'kg', 'm', 'm2', 'm3', 'L', 'ROL', 'CX', 'hr', 'outro']
const CATEGORIAS = ['Betão e Cimento', 'Alvenaria', 'Cofragem', 'Ferro e Aço', 'Madeira', 'Impermeabilização', 'Elétrico', 'Hidráulica', 'Acabamentos', 'EPI', 'Ferramentas', 'Outro']

type MaterialForm = Omit<Material, 'id' | 'tenant_id' | 'custo_medio' | 'estoque_atual' | 'created_at' | 'updated_at'>

export function MateriaisPage() {
    const { hasPermission } = usePermissions()
    const [search, setSearch] = useState('')
    const [categoria, setCategoria] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const { data: materials = [], isLoading } = useMaterials({
        search: search || undefined,
        categoria: categoria && categoria !== 'todas' ? categoria : undefined
    })
    const createMutation = useCreateMaterial()
    const form = useForm<MaterialForm>({ defaultValues: { unidade: 'un', iva_pct: 23, tipo: 'material', ativo: true, estoque_minimo: 0 } })

    const onSubmit = async (values: MaterialForm) => {
        await createMutation.mutateAsync(values)
        form.reset()
        setIsOpen(false)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Catálogo de Materiais</h1>
                    <p className="text-muted-foreground text-sm">{materials.length} referências • gestão de stock e custo médio</p>
                </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-44 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Pesquisar materiais..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    {hasPermission('compras.manage') && (
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-1.5 ml-auto"><Plus className="h-4 w-4" /> Novo Material</Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader><DialogTitle>Novo Material / Serviço</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-3 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Código *</label>
                                    <Input placeholder="MAT-001" {...form.register('codigo', { required: true })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Tipo</label>
                                    <Select defaultValue="material" onValueChange={v => form.setValue('tipo', v as any)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="material">Material</SelectItem>
                                            <SelectItem value="servico">Serviço</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium">Nome *</label>
                                    <Input placeholder="Ex: Cimento Portland CEM II" {...form.register('nome', { required: true })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Categoria</label>
                                    <Select onValueChange={v => form.setValue('categoria', v)}>
                                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Unidade *</label>
                                    <Select defaultValue="un" onValueChange={v => form.setValue('unidade', v as any)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">IVA (%)</label>
                                    <Select defaultValue="23" onValueChange={v => form.setValue('iva_pct', Number(v))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">Isento (0%)</SelectItem>
                                            <SelectItem value="6">Reduzida (6%)</SelectItem>
                                            <SelectItem value="13">Intermédia (13%)</SelectItem>
                                            <SelectItem value="23">Normal (23%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Stock mínimo</label>
                                    <Input type="number" step="0.001" min="0" {...form.register('estoque_minimo', { valueAsNumber: true })} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Criar Material
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : materials.length === 0 ? (
                <Card><CardContent className="py-16 text-center">
                    <Package className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum material no catálogo.</p>
                    {hasPermission('compras.manage') && (
                        <Button size="sm" className="mt-4 gap-1.5" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4" /> Adicionar Primeiro Material</Button>
                    )}
                </CardContent></Card>
            ) : (
                <div className="border rounded-md bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead className="text-right">Custo Médio</TableHead>
                                <TableHead>IVA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materials.map(m => (
                                <TableRow key={m.id}>
                                    <TableCell className="font-mono text-sm text-muted-foreground">{m.codigo}</TableCell>
                                    <TableCell className="font-medium">
                                        {m.nome}
                                        {m.tipo === 'servico' && <Badge variant="outline" className="ml-1.5 text-xs">Serviço</Badge>}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{m.categoria ?? '—'}</TableCell>
                                    <TableCell><Badge variant="outline">{m.unidade}</Badge></TableCell>
                                    <TableCell>
                                        <span className={m.estoque_atual <= m.estoque_minimo && m.estoque_minimo > 0 ? 'text-red-600 font-medium' : ''}>
                                            {m.estoque_atual} {m.unidade}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">{m.custo_medio > 0 ? formatCurrency(m.custo_medio) : '—'}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{m.iva_pct}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
