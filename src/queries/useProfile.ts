import { useQuery } from '@tanstack/vue-query'
import { fetchProfile } from '@/api/profile'

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000,
    // The axios interceptor already offers a user-driven "Tekrar dene" toast
    // on failure — silent background retries here would just duplicate that.
    retry: false,
  })
}
