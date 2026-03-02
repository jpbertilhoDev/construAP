import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import logoApp from '@/assets/logoapp.png'

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Palavra-passe deve ter pelo menos 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'
    const successMessage = (location.state as { successMessage?: string })?.successMessage ?? null
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

    const onSubmit = async (data: LoginForm) => {
        setError(null)
        const { error: authError } = await supabase.auth.signInWithPassword(data)

        if (authError) {
            if (authError.status === 400 || authError.message.toLowerCase().includes('invalid login')) {
                setError('Email ou palavra-passe incorretos. Verifique também se confirmou o seu email.')
            } else if (authError.message.toLowerCase().includes('email not confirmed')) {
                setError('Email ainda não confirmado. Verifique a sua caixa de entrada e clique no link de confirmação.')
            } else {
                setError(authError.message)
            }
            return
        }

        navigate(from, { replace: true })
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
                        <CardTitle className="text-white">Entrar</CardTitle>
                        <CardDescription className="text-slate-400">
                            Aceda à sua conta para continuar
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

                            <div className="space-y-1">
                                <Label htmlFor="password" className="text-slate-300">Palavra-passe</Label>
                                <Input id="password" type="password" placeholder="••••••••"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    {...register('password')} />
                                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
                            </div>

                            {error && (
                                <div className="text-sm text-red-400 bg-red-500/10 rounded-md px-3 py-2 border border-red-500/20">
                                    {error}
                                </div>
                            )}

                            {successMessage && (
                                <div className="text-sm text-green-400 bg-green-500/10 rounded-md px-3 py-2 border border-green-500/20">
                                    {successMessage}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting
                                    ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />A entrar...</span>
                                    : 'Entrar'}
                            </Button>

                            <p className="text-center text-sm text-slate-400">
                                <Link to="/forgot-password" className="text-blue-400 hover:underline">Esqueceu a palavra-passe?</Link>
                            </p>

                            <p className="text-center text-sm text-slate-400">
                                Não tem conta?{' '}
                                <Link to="/register" className="text-blue-400 hover:underline">Criar empresa</Link>
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
