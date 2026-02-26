import { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'

interface AuthContextValue {
    session: Session | null
    user: User | null
    isLoading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const currentUserIdRef = useRef<string | undefined>(undefined)

    useEffect(() => {
        void supabase.auth.getSession().then(({ data: { session } }) => {
            currentUserIdRef.current = session?.user?.id
            setSession(session)
            setIsLoading(false)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            const newUserId = session?.user?.id

            // Clear all cached data when user changes (logout, or login as different user)
            if (event === 'SIGNED_OUT') {
                queryClient.clear()
            } else if (
                event === 'SIGNED_IN' &&
                currentUserIdRef.current &&
                currentUserIdRef.current !== newUserId
            ) {
                // Switching directly from one user to another
                queryClient.clear()
            }

            currentUserIdRef.current = newUserId
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    const signOut = async () => {
        queryClient.clear()
        await supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider value={{ session, user: session?.user ?? null, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
