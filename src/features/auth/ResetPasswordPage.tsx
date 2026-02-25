import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import logoApp from '@/assets/logoapp.png'

const resetPasswordSchema = z
    .object({
        password: z.string().min(6, 'Palavra-passe deve ter pelo menos 6 caracteres'),
        password_confirm: z.string(),
    })
    .refine((d) => d.password === d.password_confirm, {
        message: 'As palavras-passe não coincidem',
        path: ['password_confirm'],
    })

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)
    const [isRecoveryMode, setIsRecoveryMode] = useState(false)
    const [isInvite, setIsInvite] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) })

    useEffect(() => {
        let resolved = false

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                resolved = true
                setIsRecoveryMode(true)
                setIsLoading(false)
            }
        })

        // Fallback: check the URL hash for recovery or invite tokens
        const timeout = setTimeout(() => {
            if (!resolved) {
                const hash = window.location.hash
                if (hash.includes('type=recovery')) {
                    setIsRecoveryMode(true)
                } else if (hash.includes('type=invite')) {
                    setIsRecoveryMode(true)
                    setIsInvite(true)
                }
                setIsLoading(false)
            }
        }, 1500)

        return () => {
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [])

    const onSubmit = async (data: ResetPasswordForm) => {
        setError(null)
        const { error: updateError } = await supabase.auth.updateUser({
            password: data.password,
        })

        if (updateError) {
            setError(updateError.message)
            return
        }

        // Sign out so the user logs in fresh with the new password
        await supabase.auth.signOut()

        const successMessage = isInvite
            ? 'Conta ativada com sucesso! Faça login com o seu email e palavra-passe.'
            : 'Palavra-passe alterada com sucesso. Faça login com a nova palavra-passe.'

        navigate('/login', {
            replace: true,
            state: { successMessage },
        })
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-slate-400">A verificar link...</p>
                </div>
            </div>
        )
    }

    // Invalid or expired link
    if (!isRecoveryMode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <div className="w-full max-w-md text-center animate-fade-in">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-500/20 mb-4">
                        <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Link inválido ou expirado</h2>
                    <p className="text-slate-400 mb-6">
                        O link é inválido ou já expirou. Por favor, contacte o administrador ou solicite um novo link.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Button className="w-full" onClick={() => navigate('/forgot-password')}>
                            Solicitar Novo Link
                        </Button>
                        <Button variant="ghost" className="w-full text-slate-400" onClick={() => navigate('/login')}>
                            Voltar ao Login
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Password form (works for both recovery and invite)
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-2">
                        <img src={logoApp} alt="ConstruAP Logo" className="h-14 drop-shadow-lg" />
                    </div>
                    <p className="text-slate-400 text-sm mt-2">Gestão de Obras e Imobiliário</p>
                </div>

                <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white">
                            {isInvite ? 'Bem-vindo ao ConstruAP!' : 'Nova Palavra-passe'}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            {isInvite
                                ? 'Defina a sua palavra-passe para aceder ao sistema.'
                                : 'Introduza a sua nova palavra-passe'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="password" className="text-slate-300">
                                    {isInvite ? 'Palavra-passe' : 'Nova Palavra-passe'}
                                </Label>
                                <Input id="password" type="password" placeholder="Mínimo 6 caracteres"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    {...register('password')} />
                                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="password_confirm" className="text-slate-300">Confirmar Palavra-passe</Label>
                                <Input id="password_confirm" type="password" placeholder="Repita a palavra-passe"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    {...register('password_confirm')} />
                                {errors.password_confirm && <p className="text-xs text-red-400">{errors.password_confirm.message}</p>}
                            </div>

                            {error && (
                                <div className="text-sm text-red-400 bg-red-500/10 rounded-md px-3 py-2 border border-red-500/20">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting
                                    ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{isInvite ? 'A ativar...' : 'A alterar...'}</span>
                                    : isInvite ? 'Ativar Conta' : 'Alterar Palavra-passe'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
