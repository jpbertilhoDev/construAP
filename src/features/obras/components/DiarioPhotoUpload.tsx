import { useState, useRef, useEffect } from 'react'
import { Camera, Trash2, Loader2, X, ImageIcon, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useUploadDiarioPhoto, useDeleteDiarioPhoto } from '../hooks/useDiario'
import { getDiarioPhotoUrl, type DiarioPhoto } from '@/services/diario'

interface DiarioPhotoUploadProps {
    photos: DiarioPhoto[]
    entryId: string
    obraId: string
    canEdit: boolean
}

export function DiarioPhotoUpload({
    photos,
    entryId,
    obraId,
    canEdit,
}: DiarioPhotoUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

    const uploadMutation = useUploadDiarioPhoto(obraId)
    const deleteMutation = useDeleteDiarioPhoto(obraId)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        for (const file of Array.from(files)) {
            await uploadMutation.mutateAsync({ entryId, file })
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Fotos ({String(photos.length)})
                </span>
            </div>

            {/* Upload area */}
            {canEdit && (
                <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                    onClick={() => {
                        fileInputRef.current?.click()
                    }}
                >
                    {uploadMutation.isPending ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">
                        {uploadMutation.isPending
                            ? 'A enviar foto...'
                            : 'Clique para adicionar fotos'}
                    </span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => void handleFileChange(e)}
                    />
                </div>
            )}

            {/* Photo gallery */}
            {photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {photos.map((photo) => (
                        <PhotoThumbnail
                            key={photo.id}
                            photo={photo}
                            url={signedUrls[photo.id]}
                            canEdit={canEdit}
                            isDeleting={deleteMutation.isPending}
                            onUrlLoaded={(url) => {
                                setSignedUrls((prev) => ({ ...prev, [photo.id]: url }))
                            }}
                            onView={(url) => {
                                setLightboxUrl(url)
                            }}
                            onDelete={() => {
                                void deleteMutation.mutateAsync({
                                    id: photo.id,
                                    storagePath: photo.storage_path,
                                })
                            }}
                        />
                    ))}
                </div>
            )}

            {photos.length === 0 && !canEdit && (
                <p className="text-xs text-muted-foreground italic">Nenhuma foto.</p>
            )}

            {/* Lightbox */}
            <Dialog
                open={!!lightboxUrl}
                onOpenChange={() => {
                    setLightboxUrl(null)
                }}
            >
                <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Foto do Diário</DialogTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
                        onClick={() => {
                            setLightboxUrl(null)
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    {lightboxUrl && (
                        <img
                            src={lightboxUrl}
                            alt="Foto ampliada"
                            className="w-full h-full object-contain max-h-[85vh]"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Sub-component that loads its signed URL via useEffect (not during render)
function PhotoThumbnail({
    photo,
    url,
    canEdit,
    isDeleting,
    onUrlLoaded,
    onView,
    onDelete,
}: {
    photo: DiarioPhoto
    url: string | undefined
    canEdit: boolean
    isDeleting: boolean
    onUrlLoaded: (url: string) => void
    onView: (url: string) => void
    onDelete: () => void
}) {
    useEffect(() => {
        if (!url) {
            void getDiarioPhotoUrl(photo.storage_path).then(onUrlLoaded)
        }
    }, [photo.storage_path, url, onUrlLoaded])

    return (
        <div className="relative group h-20 w-20 rounded-md border bg-muted/30 overflow-hidden cursor-pointer">
            {url ? (
                <img
                    src={url}
                    alt={photo.caption || 'Foto'}
                    className="h-full w-full object-cover"
                    onClick={() => {
                        onView(url)
                    }}
                />
            ) : (
                <div className="h-full w-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                </div>
            )}
            {canEdit && (
                <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isDeleting}
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                    }}
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            )}
        </div>
    )
}
