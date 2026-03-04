import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, MessageSquare, Loader2, Trash2 } from 'lucide-react'
import { fetchComments, createComment, deleteComment } from '@/services/comments'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/AuthProvider'

export function CommentsTab({ obraId }: { obraId: string }) {
    const qc = useQueryClient()
    const { user } = useAuth()
    const [newComment, setNewComment] = useState('')

    const { data: comments = [], isLoading } = useQuery({
        queryKey: ['obra-comments', obraId],
        queryFn: () => fetchComments(obraId),
    })

    const createMutation = useMutation({
        mutationFn: (text: string) => createComment(obraId, text),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['obra-comments', obraId] })
            setNewComment('')
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteComment,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['obra-comments', obraId] })
            toast.success('Comentário apagado')
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newComment.trim()) return
        createMutation.mutate(newComment)
    }

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    }

    return (
        <Card className="max-w-3xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-primary" /> Chat & Comentários
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Comments Feed */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {comments.length === 0 ? (
                        <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed">
                            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Nenhum comentário nesta obra. Seja o primeiro a participar!</p>
                        </div>
                    ) : (
                        comments.map((comment) => {
                            const isMine = comment.user_id === user?.id

                            return (
                                <div key={comment.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                                    {/* Avatar placeholder */}
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-semibold text-primary">
                                            {comment.profiles?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                        </span>
                                    </div>

                                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium">{comment.profiles?.full_name || 'Utilizador Desconhecido'}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: pt })}
                                            </span>
                                        </div>

                                        <div className={`group relative px-4 py-2 rounded-2xl text-sm ${isMine
                                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                                            : 'bg-muted rounded-tl-none'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{comment.text}</p>

                                            {/* Delete action for my comments */}
                                            {isMine && (
                                                <button
                                                    onClick={() => deleteMutation.mutate(comment.id)}
                                                    className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                                                    title="Apagar comentário"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-4 border-t">
                    <Textarea
                        placeholder="Escreva uma mensagem..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px] resize-y"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSubmit(e)
                            }
                        }}
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground hidden sm:inline-block">
                            Prima <strong>Enter</strong> para enviar, <strong>Shift + Enter</strong> para quebra de linha
                        </span>
                        <Button type="submit" disabled={!newComment.trim() || createMutation.isPending} className="self-end shrink-0 ml-auto gap-2">
                            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Enviar
                        </Button>
                    </div>
                </form>

            </CardContent>
        </Card>
    )
}
