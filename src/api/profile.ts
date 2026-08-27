import { http } from '@/lib/http'
import type { ProfileInfo } from '@/types/profile'

export type { ProfileInfo }

export async function fetchProfile(): Promise<ProfileInfo> {
  const response = await http.get<ProfileInfo>('/profile')
  return response.data
}

export async function updateProfile(patch: Partial<ProfileInfo>): Promise<ProfileInfo> {
  const response = await http.patch<ProfileInfo>('/profile', patch)
  return response.data
}
