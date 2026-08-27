import { http } from '@/lib/http'
import type { SecurityInfo } from '@/types/security'

export type { SecurityInfo }

export async function fetchSecurity(): Promise<SecurityInfo> {
  const response = await http.get<SecurityInfo>('/auth')
  return response.data
}

export async function updatePassword(newPassword: string): Promise<void> {
  await http.patch('/auth', { currentPassword: newPassword })
}
