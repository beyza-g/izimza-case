import { http } from '@/lib/http'
import type { Account } from '@/types/account'

export type { Account }

export async function fetchAccount(): Promise<Account> {
  const response = await http.get<Account>('/account')
  return response.data
}
