import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Profile {
    id: string
    tenant_id: string
    name: string
    avatar_url?: string | null
    phone?: string | null
}

export function useProfile() {
    return useQuery<Profile | null>({
        queryKey: ['profile'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, tenant_id, name, avatar_url, phone')
                .single()

            if (error) {
                if (error.code === 'PGRST116') return null // 0 rows
                throw new Error(error.message)
            }
            return data as Profile
        },
        staleTime: 5 * 60_000,
    })
}
