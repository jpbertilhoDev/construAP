import { useNavigate, useParams, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useCreateObra, useUpdateObra, useObra } from '@/features/obras/hooks/useObras'
import { type ObraType } from '@/types/database.types'

const OBRA_TYPES: ObraType[] = [
    'Construção Nova', 'Remodelação', 'Reabilitação', 'Especialidades', 'Outro',
]

const obraSchema = z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    ref: z.string().optional(),
    address: z.string().optional(),
    type: z.enum(['Construção Nova', 'Remodelação', 'Reabilitação', 'Especialidades', 'Outro']),
    contract_value: z.coerce.number().min(0, 'Valor não pode ser negativo'),
    start_date: z.string().optional(),
    end_date_planned: z.string().optional(),
})

type ObraForm = z.infer<typeof obraSchema>

export function ObraFormPage() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const isEditing = !!id

    const createMutation = useCreateObra()
    const updateMutation = useUpdateObra(id || '')
    const { data: obra, isLoading: isLoadingObra } = useObra(id || '')

    const isLoading = isEditing && isLoadingObra
    const isPending = createMutation.isPending || updateMutation.isPending
    const mutationError = createMutation.error || updateMutation.error

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ObraForm>({
        resolver: zodResolver(obraSchema) as any,
        defaultValues: {
            name: '',
            ref: '',
            address: '',
            type: 'Construção Nova',
            contract_value: 0,
            start_date: '',
            end_date_planned: '',
        },
    })

    useEffect(() => {
        if (isEditing && obra) {
            reset({
                name: obra.name,
                ref: obra.ref || '',
                address: obra.address || '',
                type: obra.type as ObraType,
                contract_value: obra.contract_value,
                start_date: obra.start_date || '',
                end_date_planned: obra.end_date_planned || '',
            })
        }
    }, [isEditing, obra, reset])

    const onSubmit = async (data: ObraForm) => {
        if (isEditing) {
            await updateMutation.mutateAsync({
                name: data.name,
                ref: data.ref || null,
                address: data.address || null,
                type: data.type,
                start_date: data.start_date || null,
                end_date_planned: data.end_date_planned || null,
                contract_value: data.contract_value || 0,
            })
            navigate(`/obras/${id}`, { replace: true })
        } else {
            const novaObra = await createMutation.mutateAsync({
                name: data.name,
                ref: data.ref || null,
                address: data.address || null,
                type: data.type,
                status: 'Em preparação',
                start_date: data.start_date || null,
                end_date_planned: data.end_date_planned || null,
                end_date_actual: null,
                contract_value: data.contract_value || 0,
                client_id: null,
            })
            navigate(`/obras/${novaObra.id}`, { replace: true })
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">A carregar obra...</div>
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild>
                    <Link to="/obras"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isEditing ? 'Editar Obra' : 'Nova Obra'}</h1>
                    <p className="text-muted-foreground text-sm">{isEditing ? 'Altere as informações desta obra' : 'Preencha os dados da nova obra'}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dados Gerais</CardTitle>
                    <CardDescription>Informações básicas da obra ou projeto</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={(e) => void handleSubmit(onSubmit as any)(e)} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* Name */}
                            <div className="sm:col-span-2 space-y-1">
                                <Label htmlFor="name">Nome da Obra *</Label>
                                <Input id="name" placeholder="ex: Moradia Unifamiliar — Lisboa" {...register('name')} />
                                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                            </div>

                            {/* Ref */}
                            <div className="space-y-1">
                                <Label htmlFor="ref">Referência interna</Label>
                                <Input id="ref" placeholder="ex: OBR-2026-001" {...register('ref')} />
                            </div>

                            {/* Type */}
                            <div className="space-y-1">
                                <Label htmlFor="type">Tipo *</Label>
                                <select
                                    id="type"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    {...register('type')}
                                >
                                    {OBRA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            {/* Contract Value */}
                            <div className="space-y-1">
                                <Label htmlFor="contract_value">Valor Adjudicado / Contrato (€)</Label>
                                <Input id="contract_value" type="number" step="0.01" {...register('contract_value')} />
                                {errors.contract_value && <p className="text-xs text-destructive">{errors.contract_value.message}</p>}
                            </div>

                            {/* Address */}
                            <div className="sm:col-span-2 space-y-1">
                                <Label htmlFor="address">Morada</Label>
                                <Input id="address" placeholder="Rua, Localidade, Código Postal" {...register('address')} />
                            </div>

                            {/* Dates */}
                            <div className="space-y-1">
                                <Label htmlFor="start_date">Data de início</Label>
                                <Input id="start_date" type="date" {...register('start_date')} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="end_date_planned">Data prevista de conclusão</Label>
                                <Input id="end_date_planned" type="date" {...register('end_date_planned')} />
                            </div>
                        </div>

                        {/* Mutation error */}
                        {mutationError && (
                            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
                                {mutationError instanceof Error
                                    ? mutationError.message
                                    : 'Erro ao guardar obra. Tente novamente.'}
                            </p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button type="submit" disabled={isPending}>
                                {isPending
                                    ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Guardar...</span>
                                    : (isEditing ? 'Guardar Obra' : 'Criar Obra')}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link to="/obras">Cancelar</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
