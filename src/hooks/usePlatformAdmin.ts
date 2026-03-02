import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface UsePlatformAdminResult {
  isPlatformAdmin: boolean
  isLoading: boolean
}

async function checkPlatformAdmin(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  // Check if user is in platform_admins table via RPC
  // Since platform_admins has no RLS, we use a SECURITY DEFINER function
  const { data, error } = await supabase.rpc('is_platform_admin')

  if (error) {
    console.warn('[usePlatformAdmin] RPC error:', error.message)
    return false
  }

  return data === true
}

export function usePlatformAdmin(): UsePlatformAdminResult {
  const { data: isPlatformAdmin = false, isLoading } = useQuery({
    queryKey: ['platform-admin-check'],
    queryFn: checkPlatformAdmin,
    staleTime: 1000 * 60 * 10, // 10 minutes (rarely changes)
    retry: 1,
  })

  return { isPlatformAdmin, isLoading }
}
