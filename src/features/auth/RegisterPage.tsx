import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import logoApp from '@/assets/logoapp.png'

const registerSchema = z
    .object({
        company_name: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
        name: z.string().min(2, 'O seu nome deve ter pelo menos 2 caracteres'),
        email: z.string().email('Email inválido'),
        password: z.string().min(8, 'Palavra-passe deve ter pelo menos 8 caracteres'),
        password_confirm: z.string(),
    })
    .refine((d) => d.password === d.password_confirm, {
        message: 'As palavras-passe não coincidem',
        path: ['password_confirm'],
    })

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)
    const [needsConfirmation, setNeedsConfirmation] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

    const onSubmit = async (data: RegisterForm) => {
        setError(null)

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    name: data.name,
                    company_name: data.company_name,
                },
            },
        })

        if (signUpError) {
            if (signUpError.message.toLowerCase().includes('already registered')) {
                setError('Este email já está registado. Por favor, faça login.')
            } else {
                setError(signUpError.message)
            }
            return
        }

        // If session is returned immediately → email confirmation is disabled → auto-login
        if (signUpData.session) {
            navigate('/', { replace: true })
            return
        }

        // If no session → email confirmation required
        setNeedsConfirmation(true)
    }

    if (needsConfirmation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <div className="w-full max-w-md text-center animate-fade-in">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-500/20 mb-4">
                        <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Verifique o seu email</h2>
                    <p className="text-slate-400 mb-2">
                        Enviámos um link de confirmação para o seu email.
                    </p>
                    <p className="text-slate-500 text-sm mb-6">
                        Após confirmar, poderá fazer login.
                    </p>
                    <Button className="w-full" onClick={() => navigate('/login')}>
                        Ir para Login
                    </Button>
                    <p className="text-xs text-slate-600 mt-3">
                        Em desenvolvimento? Desative "Email Confirmations" no Supabase Dashboard → Authentication → Email.
                    </p>
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
                        <CardTitle className="text-white">Criar Empresa</CardTitle>
                        <CardDescription className="text-slate-400">
                            Registe a sua empresa e comece a gerir obras hoje
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="company_name" className="text-slate-300">Nome da Empresa *</Label>
                                <Input id="company_name" placeholder="ex: Construções Silva, Lda"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    {...register('company_name')} />
                                {errors.company_name && <p className="text-xs text-red-400">{errors.company_name.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="name" className="text-slate-300">O seu nome *</Label>
                                <Input id="name" placeholder="ex: João Silva"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    {...register('name')} />
                                {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="email" className="text-slate-300">Email *</Label>
                                <Input id="email" type="email" placeholder="joao@empresa.pt"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    {...register('email')} />
                                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="password" className="text-slate-300">Palavra-passe *</Label>
                                <Input id="password" type="password" placeholder="Mínimo 8 caracteres"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    {...register('password')} />
                                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="password_confirm" className="text-slate-300">Confirmar Palavra-passe *</Label>
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
                                    ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />A criar conta...</span>
                                    : 'Criar Conta Gratuita'}
                            </Button>

                            <p className="text-center text-sm text-slate-400">
                                Já tem conta?{' '}
                                <Link to="/login" className="text-blue-400 hover:underline">Fazer login</Link>
                            </p>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-slate-600 mt-4">
                    Ao criar conta, aceita os nossos Termos de Serviço e Política de Privacidade (RGPD).
                </p>
            </div>
        </div>
    )
}
