import { useState } from 'react'
import { AlertTriangle, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useCreateDiarioIncident, useDeleteDiarioIncident } from '../hooks/useDiario'
import type { DiarioIncident } from '@/services/diario'

const SEVERITY_OPTIONS = ['Baixa', 'Média', 'Alta', 'Crítica'] as const

const severityVariant: Record<string, 'outline' | 'default' | 'secondary' | 'destructive'> = {
    Baixa: 'outline',
    Média: 'secondary',
    Alta: 'default',
    Crítica: 'destructive',
}

interface DiarioIncidentsListProps {
    incidents: DiarioIncident[]
    entryId: string
    obraId: string
    canEdit: boolean
}

export function DiarioIncidentsList({
    incidents,
    entryId,
    obraId,
    canEdit,
}: DiarioIncidentsListProps) {
    const [showForm, setShowForm] = useState(false)
    const [description, setDescription] = useState('')
    const [severity, setSeverity] = useState<string>('Baixa')

    const createMutation = useCreateDiarioIncident(obraId)
    const deleteMutation = useDeleteDiarioIncident(obraId)

    const handleAdd = async () => {
        if (!description.trim()) return
        await createMutation.mutateAsync({ entryId, description: description.trim(), severity })
        setDescription('')
        setSeverity('Baixa')
        setShowForm(false)
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Ocorrências ({String(incidents.length)})
                </span>
                {canEdit && !showForm && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                            setShowForm(true)
                        }}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                )}
            </div>

            {incidents.length === 0 && !showForm && (
                <p className="text-xs text-muted-foreground italic">
                    Nenhuma ocorrência registada.
                </p>
            )}

            {incidents.map((incident) => (
                <div
                    key={incident.id}
                    className="flex items-start gap-2 text-sm bg-muted/30 rounded-md px-3 py-2"
                >
                    <Badge
                        variant={severityVariant[incident.severity]}
                        className="text-[10px] shrink-0 mt-0.5"
                    >
                        {incident.severity}
                    </Badge>
                    <span className="flex-1">{incident.description}</span>
                    {canEdit && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                                void deleteMutation.mutateAsync(incident.id)
                            }}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            ))}

            {showForm && (
                <div className="flex items-center gap-2 mt-1">
                    <Input
                        className="flex-1 h-8 text-sm"
                        placeholder="Descrição da ocorrência..."
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleAdd()
                        }}
                    />
                    <Select value={severity} onValueChange={setSeverity}>
                        <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SEVERITY_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        size="sm"
                        className="h-8"
                        disabled={createMutation.isPending || !description.trim()}
                        onClick={() => void handleAdd()}
                    >
                        {createMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            'OK'
                        )}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => {
                            setShowForm(false)
                        }}
                    >
                        Cancelar
                    </Button>
                </div>
            )}
        </div>
    )
}
