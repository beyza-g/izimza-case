import { useQuery } from '@tanstack/vue-query'
import { fetchDocuments } from '@/api/documents'

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
    staleTime: 2 * 60 * 1000,
    // The axios interceptor already offers a user-driven "Tekrar dene" toast
    // on failure — silent background retries here would just duplicate that.
    retry: false,
  })
}
