import {
    Cloud,
    Sun,
    CloudRain,
    CloudDrizzle,
    Wind,
    Users,
    Wrench,
    ClipboardList,
    Edit2,
    Trash2,
    Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { DiarioIncidentsList } from './DiarioIncidentsList'
import { DiarioPhotoUpload } from './DiarioPhotoUpload'
import type { DiarioEntry } from '@/services/diario'

// ── Helpers ─────────────────────────────────────────────────

const weatherIcon: Record<string, React.ElementType> = {
    'Limpo / Sol': Sun,
    'Limpo': Sun,
    Nublado: Cloud,
    'Chuva Ligeira': CloudDrizzle,
    'Chuva Forte': CloudRain,
    'Vento Forte': Wind,
}

function WeatherDisplay({ weather, tempMin, tempMax }: {
    weather: string | null
    tempMin: number | null
    tempMax: number | null
}) {
    const Icon = weather ? weatherIcon[weather] ?? Cloud : Cloud
    return (
        <div className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span>{weather || 'N/D'}</span>
            {(tempMin != null || tempMax != null) && (
                <span className="text-muted-foreground">
                    {tempMin != null ? `${String(tempMin)}°` : '—'}
                    {' / '}
                    {tempMax != null ? `${String(tempMax)}°` : '—'}
                </span>
            )}
        </div>
    )
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${String(Math.min(100, Math.max(0, value)))}%` }}
                />
            </div>
            <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                {value}%
            </span>
        </div>
    )
}

// ── Timeline Entry ──────────────────────────────────────────

interface TimelineEntryProps {
    entry: DiarioEntry
    obraId: string
    canEdit: boolean
    onEdit: (entry: DiarioEntry) => void
    onDelete: (id: string) => void
}

function DiarioTimelineEntry({ entry, obraId, canEdit, onEdit, onDelete }: TimelineEntryProps) {
    const workerEntries = Object.entries(entry.workers_by_category).filter(([, v]) => v > 0)
    const totalWorkers = workerEntries.length > 0
        ? workerEntries.reduce((s, [, n]) => s + n, 0)
        : entry.resources_count

    const equipmentList = entry.equipment_used
    const activitiesList = entry.structured_activities
    const incidents = entry.diario_incidents ?? []
    const photos = entry.diario_photos ?? []
    const authorName = entry.profiles?.name

    return (
        <Card className="relative border-l-4 border-l-primary/60">
            <CardContent className="pt-4 pb-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base">
                                {formatDate(entry.entry_date)}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                                <Clock className="h-2.5 w-2.5 mr-1" />
                                {entry.work_shift}
                            </Badge>
                        </div>
                        <WeatherDisplay
                            weather={entry.weather}
                            tempMin={entry.temp_min}
                            tempMax={entry.temp_max}
                        />
                    </div>
                    {canEdit && (
                        <div className="flex gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => { onEdit(entry) }}
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => { onDelete(entry.id) }}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Progress */}
                {entry.progress_pct > 0 && <ProgressBar value={entry.progress_pct} />}

                {/* Workers */}
                {(totalWorkers > 0 || workerEntries.length > 0) && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <Users className="h-3.5 w-3.5" />
                            Efetivos ({totalWorkers})
                        </div>
                        {workerEntries.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {workerEntries.map(([cat, count]) => (
                                    <Badge key={cat} variant="secondary" className="text-[10px]">
                                        {cat}: {count}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {totalWorkers} trabalhadores
                            </p>
                        )}
                    </div>
                )}

                {/* Equipment */}
                {equipmentList.length > 0 && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <Wrench className="h-3.5 w-3.5" />
                            Equipamento
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {equipmentList.map((eq, i) => (
                                <Badge key={i} variant="outline" className="text-[10px]">
                                    {eq.name} ({eq.hours}h)
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Structured Activities */}
                {activitiesList.length > 0 && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <ClipboardList className="h-3.5 w-3.5" />
                            Atividades
                        </div>
                        <ul className="space-y-0.5 text-sm">
                            {activitiesList.map((a, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-primary mt-1.5 shrink-0">•</span>
                                    <span>
                                        {a.description}
                                        {a.chapter && (
                                            <span className="text-muted-foreground text-xs ml-1">
                                                ({a.chapter})
                                            </span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Legacy activities textarea */}
                {entry.activities && !activitiesList.length && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <ClipboardList className="h-3.5 w-3.5" />
                            Atividades
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{entry.activities}</p>
                    </div>
                )}

                {/* Incidents */}
                <DiarioIncidentsList
                    incidents={incidents}
                    entryId={entry.id}
                    obraId={obraId}
                    canEdit={canEdit}
                />

                {/* Photos */}
                <DiarioPhotoUpload
                    photos={photos}
                    entryId={entry.id}
                    obraId={obraId}
                    canEdit={canEdit}
                />

                {/* Notes */}
                {entry.notes && (
                    <div className="text-sm bg-muted/30 rounded-md px-3 py-2 italic">
                        {entry.notes}
                    </div>
                )}

                {/* Author */}
                {authorName && (
                    <p className="text-[10px] text-muted-foreground text-right">
                        Registado por {authorName}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

// ── Timeline ────────────────────────────────────────────────

interface DiarioTimelineProps {
    entries: DiarioEntry[]
    obraId: string
    canEdit: boolean
    onEdit: (entry: DiarioEntry) => void
    onDelete: (id: string) => void
}

export function DiarioTimeline({
    entries,
    obraId,
    canEdit,
    onEdit,
    onDelete,
}: DiarioTimelineProps) {
    return (
        <div className="space-y-4">
            {entries.map((entry) => (
                <DiarioTimelineEntry
                    key={entry.id}
                    entry={entry}
                    obraId={obraId}
                    canEdit={canEdit}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    )
}
