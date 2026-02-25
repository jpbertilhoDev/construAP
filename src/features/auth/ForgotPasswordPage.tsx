import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import logoApp from '@/assets/logoapp.png'

const forgotPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null)
    const [emailSent, setEmailSent] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) })

    const onSubmit = async (data: ForgotPasswordForm) => {
        setError(null)
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            data.email,
            {
                redirectTo: `${window.location.origin}/reset-password`,
            },
        )

        if (resetError) {
            setError(resetError.message)
            return
        }

        setEmailSent(true)
    }

    if (emailSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <div className="w-full max-w-md text-center animate-fade-in">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-500/20 mb-4">
                        <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Email enviado</h2>
                    <p className="text-slate-400 mb-2">
                        Se o email estiver registado, receberá um link para redefinir a sua palavra-passe.
                    </p>
                    <p className="text-slate-500 text-sm mb-6">
                        Verifique também a pasta de spam.
                    </p>
                    <Link to="/login">
                        <Button className="w-full">Voltar ao Login</Button>
                    </Link>
                </div>
            </div>
        )
    }

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
                        <CardTitle className="text-white">Recuperar Palavra-passe</CardTitle>
                        <CardDescription className="text-slate-400">
                            Introduza o seu email para receber um link de recuperação
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="email" className="text-slate-300">Email</Label>
                                <Input id="email" type="email" placeholder="nome@empresa.pt"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    {...register('email')} />
                                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                            </div>

                            {error && (
                                <div className="text-sm text-red-400 bg-red-500/10 rounded-md px-3 py-2 border border-red-500/20">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting
                                    ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />A enviar...</span>
                                    : 'Enviar Link de Recuperação'}
                            </Button>

                            <p className="text-center text-sm text-slate-400">
                                <Link to="/login" className="text-blue-400 hover:underline">
                                    Voltar ao Login
                                </Link>
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
