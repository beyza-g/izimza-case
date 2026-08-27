import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { http } from '@/lib/http'
import type { Account } from '@/api/account'
import type { Document } from '@/api/documents'

export interface TimestampMutationInput {
  documentId: number
  creditCost: number
  signal?: AbortSignal
}

interface TimestampMutationContext {
  previousAccount?: Account
  previousDocuments?: Document[]
}

/**
 * Commits one document's timestamp: creates a timestampOperations record,
 * flips the document to "signed", and decrements the account's remaining
 * credits — three real writes against json-server, no client-side faking.
 */
export function useTimestampMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vars: TimestampMutationInput) => {
      await http.post(
        '/timestampOperations',
        {
          documentId: vars.documentId,
          status: 'completed',
          creditCost: vars.creditCost,
          createdAt: new Date().toISOString(),
        },
        { signal: vars.signal },
      )
      await http.patch(
        `/documents/${vars.documentId}`,
        { status: 'signed' },
        { signal: vars.signal },
      )

      // Send the already-optimistically-decremented cache value as the new
      // server value — onMutate below runs before mutationFn, so by the time
      // we get here the cache already reflects the intended post-write state.
      const account = queryClient.getQueryData<Account>(['account'])
      if (account) {
        await http.patch(
          '/account',
          { remainingCredits: account.remainingCredits },
          { signal: vars.signal },
        )
      }

      return vars
    },

    onMutate: async (vars): Promise<TimestampMutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['account'] })
      await queryClient.cancelQueries({ queryKey: ['documents'] })

      const previousAccount = queryClient.getQueryData<Account>(['account'])
      const previousDocuments = queryClient.getQueryData<Document[]>(['documents'])

      queryClient.setQueryData<Account>(['account'], (old) =>
        old ? { ...old, remainingCredits: old.remainingCredits - vars.creditCost } : old,
      )
      queryClient.setQueryData<Document[]>(['documents'], (old) =>
        old?.map((doc) => (doc.id === vars.documentId ? { ...doc, status: 'signed' } : doc)),
      )

      return { previousAccount, previousDocuments }
    },

    onError: (_error, _vars, context) => {
      if (context?.previousAccount) {
        queryClient.setQueryData(['account'], context.previousAccount)
      }
      if (context?.previousDocuments) {
        queryClient.setQueryData(['documents'], context.previousDocuments)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
