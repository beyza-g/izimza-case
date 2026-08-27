import axios from 'axios'
import { http } from '@/lib/http'

export class OtpExpiredError extends Error {}
export class OtpInvalidError extends Error {}

export interface OtpSession {
  expiresAt: number
}

// Starts (or restarts) the server-side OTP challenge — every call resets
// expiresAt server-side, so a resend genuinely invalidates whatever code
// was sent before it, not just the client-side countdown display.
export async function sendOtpCode(): Promise<OtpSession> {
  const response = await http.post<OtpSession>('/__mock/otp/request')
  return response.data
}

// A real round-trip: both the correct-code check and the expiry check
// happen server-side, so a client whose clock/timer is off (or was simply
// left open past expiry) can't verify a stale code just because its own
// countdown hasn't visually reached zero.
export async function verifyOtpCode(code: string): Promise<void> {
  try {
    await http.post('/__mock/otp/verify', { code })
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorCode = (error.response.data as { error?: string } | undefined)?.error
      if (errorCode === 'otp_expired') throw new OtpExpiredError()
      if (errorCode === 'otp_invalid') throw new OtpInvalidError()
    }
    throw error
  }
}
