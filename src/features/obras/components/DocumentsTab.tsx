import { useState, useRef } from 'react'
import { FileText, Upload, Download, Trash2, Image as ImageIcon, File as FileIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useDocumentsByObra, useCreateDocument, useDeleteDocument, useDocumentUrl } from '@/features/obras/hooks/useDocuments'
import { formatBytes } from '@/lib/utils'

export function DocumentsTab({ obraId }: { obraId: string }) {
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [docName, setDocName] = useState('')
    const [docCategory, setDocCategory] = useState('Geral')
    const [downloadingId, setDownloadingId] = useState<string | null>(null)
    const [deleteDoc, setDeleteDoc] = useState<{ id: string, storagePath: string } | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const { data: documents, isLoading } = useDocumentsByObra(obraId)
    const createMutation = useCreateDocument()
    const deleteMutation = useDeleteDocument()
    const { getSignedUrl } = useDocumentUrl()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            setSelectedFile(file)
            setDocName(file.name.split('.')[0]) // Pre-fill name without extension
        }
    }

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedFile) return

        await createMutation.mutateAsync({
            obraId,
            file: selectedFile,
            name: docName || selectedFile.name,
            category: docCategory,
        })

        setIsUploadOpen(false)
        setSelectedFile(null)
        setDocName('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleDownload = async (storagePath: string, name: string, id: string) => {
        try {
            setDownloadingId(id)
            const url = await getSignedUrl(storagePath)
            const a = document.createElement('a')
            a.href = url
            // Extract original extension from storage path if possible, or omit
            const ext = storagePath.split('.').pop() || 'pdf'
            a.download = `${name}.${ext}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch (error) {
            console.error("Download failed:", error)
        } finally {
            setDownloadingId(null)
        }
    }

    const handleDelete = async () => {
        if (deleteDoc) {
            await deleteMutation.mutateAsync({ id: deleteDoc.id, storagePath: deleteDoc.storagePath, obraId })
            setDeleteDoc(null)
        }
    }

    const getFileIcon = (mimeType: string | null) => {
        if (!mimeType) return <FileIcon className="h-5 w-5 text-muted-foreground" />
        if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
        if (mimeType.includes('image')) return <ImageIcon className="h-5 w-5 text-blue-500" />
        return <FileIcon className="h-5 w-5 text-muted-foreground" />
    }

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Carregando documentos...</div>
    }

    const categories = ['Geral', 'Plantas', 'Contratos', 'Faturas', 'Autos de Medição', 'Licenças']

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Documentos do Projeto</h3>
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Upload className="h-4 w-4 mr-2" />
                            Carregar Documento
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Carregar Novo Documento</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => void handleUploadSubmit(e)} className="space-y-4 mt-4">

                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="file">Ficheiro (PDF, PNG, JPEG)</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    required
                                />
                            </div>

                            {selectedFile && (
                                <>
                                    <div className="space-y-1">
                                        <Label htmlFor="name">Nome / Título *</Label>
                                        <Input
                                            id="name"
                                            value={docName}
                                            onChange={(e) => setDocName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="category">Categoria</Label>
                                        <select
                                            id="category"
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={docCategory}
                                            onChange={(e) => setDocCategory(e.target.value)}
                                        >
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)} className="mr-2">
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={createMutation.isPending}>
                                            {createMutation.isPending ? 'A carregar...' : 'Guardar Ficheiro'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Tamanho</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Adicionado por</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Nenhum documento anexado a esta obra.
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents?.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        {getFileIcon(doc.mime_type)}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {doc.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{doc.category}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {doc.size_bytes ? formatBytes(doc.size_bytes) : '--'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {doc.profiles?.name || '--'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-primary hover:text-primary/80"
                                                onClick={() => void handleDownload(doc.storage_path, doc.name, doc.id)}
                                                disabled={downloadingId === doc.id}
                                                title="Descarregar Ficheiro"
                                            >
                                                {downloadingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => setDeleteDoc({ id: doc.id, storagePath: doc.storage_path })}
                                                disabled={deleteMutation.isPending}
                                                title="Eliminar Ficheiro"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Documento</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem a certeza ABSOLUTA que deseja eliminar este documento permanentemente do sistema?
                            Esta ação é irreversível e o ficheiro será removido.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void handleDelete()}
                        >
                            Sim, Eliminar Documento
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
