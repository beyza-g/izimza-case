import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { i18n } from '@/i18n'

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
  export interface AxiosRequestConfig {
    // Lets a caller show its own specific error toast (e.g. "Belge silinemedi")
    // instead of the interceptor's generic network/5xx message.
    skipErrorToast?: boolean
  }
  export interface AxiosError {
    fieldErrors?: Record<string, string> | null
  }
}

// Real HTTP transport — no custom adapter. Run `npm run mock-server` (json-server
// on mock-data/db.json) to serve this locally; point VITE_MOCK_API_URL elsewhere
// once a real backend exists.
export const http = axios.create({
  baseURL: import.meta.env.VITE_MOCK_API_URL || 'http://localhost:3001',
})

http.interceptors.request.use(async (config) => {
  const auth = useAuthStore()
  if (auth.isAuthenticated) {
    try {
      const token = await auth.getAccessToken()
      config.headers.set('Authorization', `Bearer ${token}`)
    } catch {
      // No valid session — send the request as-is; a protected endpoint will
      // reply 401 and the response interceptor below takes it from there.
    }
  }
  return config
})

/**
 * Gerçek portal.izimza.com API'si yanıtları {httpStatusCode, trMessage, data}
 * şeklinde sarmalıyor; bu katman o senaryoda unwrap işlemini burada merkezi
 * olarak yapardı. Mock adapter zaten çıplak veri döndürdüğü için şu an
 * passthrough — response.data tüketen kod tarafında değişiklik gerekmez.
 */
function unwrapResponse(response: AxiosResponse) {
  return response
}

http.interceptors.response.use(unwrapResponse, async (error) => {
  // A deliberate AbortController cancellation (e.g. component unmount mid-
  // request) is not a network failure — no toast, just propagate the reject.
  if (axios.isCancel(error)) {
    return Promise.reject(error)
  }

  const original = error.config
  const { pushToast } = useToast()

  // 401 — try one silent token refresh before giving up and forcing logout.
  if (error.response?.status === 401 && original && !original._retry) {
    original._retry = true
    const auth = useAuthStore()
    try {
      const token = await auth.getAccessToken()
      original.headers.set('Authorization', `Bearer ${token}`)
      return http.request(original)
    } catch {
      await auth.logout()
    }
    return Promise.reject(error)
  }

  // Network error — request never reached a server at all.
  if (!error.response) {
    if (!original?.skipErrorToast) {
      pushToast(i18n.global.t('common.errors.network'), {
        retry: () => http.request(original),
      })
    }
    return Promise.reject(error)
  }

  const status = error.response.status

  // 4xx (validation etc.) — the caller owns the form, so this is surfaced as
  // field-level detail rather than a toast; no generic toast is shown here.
  if (status >= 400 && status < 500) {
    error.fieldErrors = error.response.data?.fieldErrors ?? null
    return Promise.reject(error)
  }

  // 5xx — nothing the user did wrong; one general toast, no field to blame.
  if (status >= 500) {
    if (!original?.skipErrorToast) {
      pushToast(i18n.global.t('common.errors.server'))
    }
    return Promise.reject(error)
  }

  return Promise.reject(error)
})
