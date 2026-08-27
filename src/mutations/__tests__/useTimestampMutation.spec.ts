import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useTimestampMutation } from '../useTimestampMutation'
import { http } from '@/lib/http'
import type { Account } from '@/api/account'
import type { Document } from '@/api/documents'

// mutationFn talks to the real http client — mocked here so the optimistic
// update/rollback contract can be verified without a real server.
vi.mock('@/lib/http', () => ({
  http: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

const mockedPost = vi.mocked(http.post)
const mockedPatch = vi.mocked(http.patch)

function initialAccount(): Account {
  return {
    totalSignatures: 1284,
    signaturesThisMonth: 34,
    archivedDocuments: 342,
    archivedLast30Days: 58,
    remainingCredits: 10,
    creditsRenewalDate: '2026-09-01',
    archiveUsedMb: 6400,
    archiveLimitMb: 20480,
    planTier: 'enterprise',
    memberSince: '2025-03-12',
    nesValidUntil: '2027-02-14',
  }
}

function initialDocuments(): Document[] {
  return [
    { id: 7, name: 'test.pdf', ext: 'PDF', sizeMb: 1, date: '25 Ağu 2026', status: 'pending' },
    { id: 8, name: 'other.pdf', ext: 'PDF', sizeMb: 2, date: '24 Ağu 2026', status: 'pending' },
  ]
}

// Standard TanStack Vue Query composable-testing pattern: mount a render-less
// host component so useMutation/useQueryClient's inject() calls resolve,
// without needing a real page or router.
function withSetup() {
  let result!: ReturnType<typeof useTimestampMutation>
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const Host = defineComponent({
    setup() {
      result = useTimestampMutation()
      return () => h('div')
    },
  })

  mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })

  return { mutation: result, queryClient }
}

beforeEach(() => {
  mockedPost.mockReset()
  mockedPatch.mockReset()
})

describe('useTimestampMutation', () => {
  it('onMutate: decrements the account credits and flips the document to signed before mutationFn resolves', async () => {
    const { mutation, queryClient } = withSetup()
    queryClient.setQueryData(['account'], initialAccount())
    queryClient.setQueryData(['documents'], initialDocuments())

    let creditsSeenInsideMutationFn: number | undefined
    let statusSeenInsideMutationFn: string | undefined
    mockedPost.mockImplementation(async () => {
      // mutationFn only starts after onMutate has fully resolved (TanStack
      // Query awaits onMutate before calling mutationFn) — so whatever the
      // cache holds right here is the optimistic value, not the pre-mutation one.
      creditsSeenInsideMutationFn = queryClient.getQueryData<Account>(['account'])
        ?.remainingCredits
      statusSeenInsideMutationFn = queryClient
        .getQueryData<Document[]>(['documents'])
        ?.find((d) => d.id === 7)?.status
      return { data: {} } as never
    })
    mockedPatch.mockResolvedValue({ data: {} } as never)

    await mutation.mutateAsync({ documentId: 7, creditCost: 1 })

    expect(creditsSeenInsideMutationFn).toBe(9)
    expect(statusSeenInsideMutationFn).toBe('signed')
  })

  it('onError: rolls back the account and documents cache to the exact pre-mutation snapshot', async () => {
    const { mutation, queryClient } = withSetup()
    const accountBefore = initialAccount()
    const documentsBefore = initialDocuments()
    queryClient.setQueryData(['account'], accountBefore)
    queryClient.setQueryData(['documents'], documentsBefore)

    mockedPost.mockRejectedValue(new Error('server exploded'))

    await expect(mutation.mutateAsync({ documentId: 7, creditCost: 1 })).rejects.toThrow(
      'server exploded',
    )

    expect(queryClient.getQueryData(['account'])).toEqual(accountBefore)
    expect(queryClient.getQueryData(['documents'])).toEqual(documentsBefore)
  })

  it('on success: settles on the optimistic value (decremented exactly once) and invalidates both caches', async () => {
    const { mutation, queryClient } = withSetup()
    queryClient.setQueryData(['account'], initialAccount())
    queryClient.setQueryData(['documents'], initialDocuments())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    mockedPost.mockResolvedValue({ data: {} } as never)
    mockedPatch.mockResolvedValue({ data: {} } as never)

    await mutation.mutateAsync({ documentId: 7, creditCost: 1 })

    expect(queryClient.getQueryData<Account>(['account'])?.remainingCredits).toBe(9)
    expect(
      queryClient.getQueryData<Document[]>(['documents'])?.find((d) => d.id === 7)?.status,
    ).toBe('signed')
    // The other queued document is untouched by this one document's mutation.
    expect(
      queryClient.getQueryData<Document[]>(['documents'])?.find((d) => d.id === 8)?.status,
    ).toBe('pending')

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['account'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] })
  })

  it("mutationFn's own /account write sends the already-decremented credits as the new value", async () => {
    const { mutation, queryClient } = withSetup()
    queryClient.setQueryData(['account'], initialAccount())
    queryClient.setQueryData(['documents'], initialDocuments())
    mockedPost.mockResolvedValue({ data: {} } as never)
    mockedPatch.mockResolvedValue({ data: {} } as never)

    await mutation.mutateAsync({ documentId: 7, creditCost: 1 })

    expect(mockedPatch).toHaveBeenCalledWith(
      '/account',
      { remainingCredits: 9 },
      expect.anything(),
    )
  })
})
