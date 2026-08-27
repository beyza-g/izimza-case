import { useQuery } from '@tanstack/vue-query'
import { fetchAccount } from '@/api/account'

export function useAccount() {
  return useQuery({
    queryKey: ['account'],
    queryFn: fetchAccount,
    staleTime: 5 * 60 * 1000,
    // The axios interceptor already offers a user-driven "Tekrar dene" toast
    // on failure — silent background retries here would just duplicate that.
    retry: false,
  })
}
