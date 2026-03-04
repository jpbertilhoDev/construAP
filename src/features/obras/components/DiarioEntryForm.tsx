import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Trash2, Loader2, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { offlineSync } from '@/lib/offlineSync'
import type { DiarioEntry } from '@/services/diario'

// ── Constants ───────────────────────────────────────────────

const WEATHER_OPTIONS = [
    'Limpo / Sol',
    'Nublado',
    'Chuva Ligeira',
    'Chuva Forte',
    'Vento Forte',
] as const

const SHIFT_OPTIONS = ['Manhã', 'Tarde', 'Noite', 'Dia Inteiro'] as const

const WORKER_CATEGORIES = [
    'Pedreiros',
    'Serventes',
    'Carpinteiros',
    'Armadores de Ferro',
    'Eletricistas',
    'Canalizadores',
    'Pintores',
    'Serralheiros',
    'Outros',
] as const

// ── Schema ──────────────────────────────────────────────────

const workerRowSchema = z.object({
    category: z.string().min(1, 'Categoria obrigatória'),
    count: z.coerce.number().min(0, 'Mín. 0'),
})

const equipmentRowSchema = z.object({
    name: z.string().min(1, 'Nome obrigatório'),
    hours: z.coerce.number().min(0, 'Mín. 0'),
})

const activityRowSchema = z.object({
    description: z.string().min(1, 'Descrição obrigatória'),
    chapter: z.string().optional(),
})

const diarioAdvancedSchema = z.object({
    entry_date: z.string().min(10, 'Data obrigatória'),
    work_shift: z.string().default('Dia Inteiro'),
    weather: z.string().optional(),
    temp_min: z.coerce.number().optional().nullable(),
    temp_max: z.coerce.number().optional().nullable(),
    workers: z.array(workerRowSchema).default([]),
    equipment: z.array(equipmentRowSchema).default([]),
    structured_activities: z.array(activityRowSchema).default([]),
    activities: z.string().optional(),
    progress_pct: z.coerce.number().min(0).max(100).default(0),
    notes: z.string().optional(),
})

type DiarioFormValues = z.infer<typeof diarioAdvancedSchema>

// ── Props ───────────────────────────────────────────────────

interface DiarioEntryFormProps {
    obraId: string
    initialData?: DiarioEntry
    onSuccess: () => void
    onSubmit: (payload: Record<string, unknown>) => Promise<unknown>
    isPending: boolean
}

// ── Helpers ─────────────────────────────────────────────────

function workersObjectToArray(obj: Record<string, number> | undefined) {
    if (!obj || Object.keys(obj).length === 0) return []
    return Object.entries(obj).map(([category, count]) => ({ category, count }))
}

// ── Component ───────────────────────────────────────────────

export function DiarioEntryForm({
    obraId,
    initialData,
    onSuccess,
    onSubmit,
    isPending,
}: DiarioEntryFormProps) {
    const isEditing = !!initialData

    const form = useForm<DiarioFormValues>({
        resolver: zodResolver(diarioAdvancedSchema) as never,
        defaultValues: {
            entry_date: initialData
                ? new Date(initialData.entry_date).toISOString().substring(0, 10)
                : new Date().toISOString().substring(0, 10),
            work_shift: initialData?.work_shift || 'Dia Inteiro',
            weather: initialData?.weather || 'Limpo / Sol',
            temp_min: initialData?.temp_min ?? null,
            temp_max: initialData?.temp_max ?? null,
            workers: workersObjectToArray(initialData?.workers_by_category),
            equipment: initialData?.equipment_used ?? [],
            structured_activities: initialData?.structured_activities ?? [],
            activities: initialData?.activities || '',
            progress_pct: initialData?.progress_pct ?? 0,
            notes: initialData?.notes || '',
        },
    })

    const workersField = useFieldArray({ control: form.control, name: 'workers' })
    const equipmentField = useFieldArray({ control: form.control, name: 'equipment' })
    const activitiesField = useFieldArray({
        control: form.control,
        name: 'structured_activities',
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                entry_date: new Date(initialData.entry_date).toISOString().substring(0, 10),
                work_shift: initialData.work_shift || 'Dia Inteiro',
                weather: initialData.weather || 'Limpo / Sol',
                temp_min: initialData.temp_min ?? null,
                temp_max: initialData.temp_max ?? null,
                workers: workersObjectToArray(initialData.workers_by_category),
                equipment: initialData.equipment_used,
                structured_activities: initialData.structured_activities,
                activities: initialData.activities || '',
                progress_pct: initialData.progress_pct,
                notes: initialData.notes || '',
            })
        }
    }, [initialData, form])

    const watchedWorkers = form.watch('workers')
    const totalWorkers = watchedWorkers.reduce((sum, w) => sum + (w.count || 0), 0)

    const handleFormSubmit = async (values: DiarioFormValues) => {
        const workersByCategory: Record<string, number> = {}
        for (const w of values.workers) {
            if (w.category && w.count > 0) {
                workersByCategory[w.category] =
                    (workersByCategory[w.category] || 0) + w.count
            }
        }

        const payloadData = {
            obra_id: obraId,
            entry_date: values.entry_date,
            work_shift: values.work_shift,
            weather: values.weather,
            temp_min: values.temp_min,
            temp_max: values.temp_max,
            workers_by_category: workersByCategory,
            equipment_used: values.equipment.filter((e) => e.name),
            structured_activities: values.structured_activities.filter(
                (a) => a.description,
            ),
            activities: values.activities,
            progress_pct: values.progress_pct,
            notes: values.notes,
        }

        if (!navigator.onLine && !isEditing) {
            // Guardar em cache se estiver offline e for novo
            try {
                await offlineSync.addToQueue('SYNC_DIARIO_OBRA', payloadData)
                toast.success('Offline: Registo guardado para sincronizar mais tarde.', { duration: 6000 })
                form.reset()
                onSuccess()
            } catch (err: any) {
                toast.error('Erro ao guardar offline: ' + err.message)
            }
            return
        }

        try {
            await onSubmit(payloadData)
            form.reset()
            onSuccess()
        } catch {
            // error handled by caller
        }
    }

    return (
        <form
            onSubmit={(e) => void form.handleSubmit(handleFormSubmit as never)(e)}
            className="space-y-5 pt-2 max-h-[70vh] overflow-y-auto pr-1"
        >
            {/* ── Data + Turno ───────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label>Data *</Label>
                    <Input type="date" {...form.register('entry_date')} />
                    {form.formState.errors.entry_date && (
                        <p className="text-xs text-destructive">
                            {form.formState.errors.entry_date.message}
                        </p>
                    )}
                </div>
                <div className="space-y-1.5">
                    <Label>Turno</Label>
                    <Select
                        onValueChange={(val) => {
                            form.setValue('work_shift', val)
                        }}
                        defaultValue={form.getValues('work_shift')}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SHIFT_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* ── Clima + Temperatura ────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label>Clima</Label>
                    <Select
                        onValueChange={(val) => {
                            form.setValue('weather', val)
                        }}
                        defaultValue={form.getValues('weather')}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            {WEATHER_OPTIONS.map((w) => (
                                <SelectItem key={w} value={w}>
                                    {w}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label>Temp. Mín (°C)</Label>
                    <Input
                        type="number"
                        step="0.1"
                        placeholder="ex: 8"
                        {...form.register('temp_min')}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Temp. Máx (°C)</Label>
                    <Input
                        type="number"
                        step="0.1"
                        placeholder="ex: 22"
                        {...form.register('temp_max')}
                    />
                </div>
            </div>

            {/* ── Mão-de-Obra ────────────────────────────────── */}
            <fieldset className="space-y-2 border rounded-md p-3">
                <legend className="text-sm font-semibold px-1">
                    Mão-de-Obra{' '}
                    <span className="text-muted-foreground font-normal">
                        ({String(totalWorkers)} total)
                    </span>
                </legend>
                {workersField.fields.map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <Select
                            onValueChange={(val) => {
                                form.setValue(`workers.${String(idx)}.category` as `workers.${number}.category`, val)
                            }}
                            defaultValue={form.getValues(`workers.${String(idx)}.category` as `workers.${number}.category`)}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Categoria..." />
                            </SelectTrigger>
                            <SelectContent>
                                {WORKER_CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            min="0"
                            className="w-20"
                            placeholder="Nº"
                            {...form.register(`workers.${String(idx)}.count` as `workers.${number}.count`)}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                                workersField.remove(idx)
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        workersField.append({ category: '', count: 0 })
                    }}
                >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Categoria
                </Button>
            </fieldset>

            {/* ── Equipamento ────────────────────────────────── */}
            <fieldset className="space-y-2 border rounded-md p-3">
                <legend className="text-sm font-semibold px-1">Equipamento Utilizado</legend>
                {equipmentField.fields.map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <Input
                            className="flex-1"
                            placeholder="Nome do equipamento"
                            {...form.register(`equipment.${String(idx)}.name` as `equipment.${number}.name`)}
                        />
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                min="0"
                                step="0.5"
                                className="w-20"
                                placeholder="Horas"
                                {...form.register(`equipment.${String(idx)}.hours` as `equipment.${number}.hours`)}
                            />
                            <span className="text-xs text-muted-foreground">h</span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                                equipmentField.remove(idx)
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        equipmentField.append({ name: '', hours: 0 })
                    }}
                >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Equipamento
                </Button>
            </fieldset>

            {/* ── Atividades Estruturadas ─────────────────────── */}
            <fieldset className="space-y-2 border rounded-md p-3">
                <legend className="text-sm font-semibold px-1">Atividades Executadas</legend>
                {activitiesField.fields.map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <Input
                            className="flex-1"
                            placeholder="Descrição da atividade"
                            {...form.register(`structured_activities.${String(idx)}.description` as `structured_activities.${number}.description`)}
                        />
                        <Input
                            className="w-32"
                            placeholder="Capítulo"
                            {...form.register(`structured_activities.${String(idx)}.chapter` as `structured_activities.${number}.chapter`)}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                                activitiesField.remove(idx)
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        activitiesField.append({ description: '', chapter: '' })
                    }}
                >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Atividade
                </Button>
            </fieldset>

            {/* ── Resumo rápido (textarea legado) ────────────── */}
            <div className="space-y-1.5">
                <Label>Resumo / Notas de Atividade</Label>
                <Textarea
                    {...form.register('activities')}
                    placeholder="Resumo geral das frentes de trabalho do dia..."
                    className="h-16"
                />
            </div>

            {/* ── Progresso ──────────────────────────────────── */}
            <div className="space-y-1.5">
                <Label>Progresso do Dia (%)</Label>
                <div className="flex items-center gap-3">
                    <Input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        className="flex-1"
                        {...form.register('progress_pct')}
                    />
                    <span className="text-sm font-medium w-12 text-right">
                        {String(form.watch('progress_pct'))}%
                    </span>
                </div>
            </div>

            {/* ── Notas ──────────────────────────────────────── */}
            <div className="space-y-1.5">
                <Label>Observações Gerais</Label>
                <Textarea
                    {...form.register('notes')}
                    placeholder="Visitas de fiscalização, atrasos de material, etc."
                    className="h-16"
                />
            </div>

            {/* ── Aviso de fotos ─────────────────────────────── */}
            {!isEditing && (
                <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                    <Camera className="h-4 w-4 shrink-0" />
                    <span>Pode adicionar fotos e ocorrências após criar a entrada.</span>
                </div>
            )}

            {/* ── Submit ─────────────────────────────────────── */}
            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardar...
                    </span>
                ) : isEditing ? (
                    'Guardar Alterações'
                ) : (
                    'Registar Dia'
                )}
            </Button>
        </form>
    )
}
