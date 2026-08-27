import { useQuery } from '@tanstack/vue-query'
import { fetchSecurity } from '@/api/security'

export function useSecurity() {
  return useQuery({
    queryKey: ['security'],
    queryFn: fetchSecurity,
    staleTime: 5 * 60 * 1000,
    // The axios interceptor already offers a user-driven "Tekrar dene" toast
    // on failure — silent background retries here would just duplicate that.
    retry: false,
  })
}
