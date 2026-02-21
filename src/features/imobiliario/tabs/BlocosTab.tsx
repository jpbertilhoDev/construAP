import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useBlocos, useCreateBloco, useDeleteBloco } from '../hooks/useFracoes'

export function BlocosTab({ empreendimentoId }: { empreendimentoId: string }) {
    const { data: blocos = [] } = useBlocos(empreendimentoId)
    const createMutation = useCreateBloco(empreendimentoId)
    const deleteMutation = useDeleteBloco(empreendimentoId)
    const [isOpen, setIsOpen] = useState(false)
    const [nome, setNome] = useState('')
    const [descricao, setDescricao] = useState('')

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nome) return
        await createMutation.mutateAsync({ nome, descricao })
        setNome(''); setDescricao(''); setIsOpen(false)
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                    <CardTitle className="text-base">Blocos / Torres</CardTitle>
                    <CardDescription>Subdivisões opcionais do empreendimento</CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Novo Bloco</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[360px]">
                        <DialogHeader><DialogTitle>Novo Bloco / Torre</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3 mt-2">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Nome *</label>
                                <Input placeholder="Bloco A / Torre 1" value={nome} onChange={e => setNome(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Descrição</label>
                                <Input placeholder="Opcional" value={descricao} onChange={e => setDescricao(e.target.value)} />
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending || !nome}>
                                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Criar Bloco
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {blocos.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Nenhum bloco definido.</div>
                ) : (
                    <div className="divide-y">
                        {blocos.map((b) => (
                            <div key={b.id} className="flex items-center justify-between py-3">
                                <div>
                                    <p className="text-sm font-medium">{b.nome}</p>
                                    {b.descricao && <p className="text-xs text-muted-foreground">{b.descricao}</p>}
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => void deleteMutation.mutateAsync(b.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
