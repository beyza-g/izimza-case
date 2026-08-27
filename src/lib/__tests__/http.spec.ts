import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { http } from '@/lib/http'
import { useToast } from '@/composables/useToast'
import { i18n } from '@/i18n'

// The whole 401/logout dance depends on a real Auth0 client, which needs a
// browser redirect flow — irrelevant to what's being tested here (the axios
// interceptor's own branching). Only @auth0/auth0-vue's `useAuth0()` is
// mocked; the real, unmocked Pinia store (src/stores/auth.ts) is exercised
// on top of it via setActivePinia, per the review's instruction.
const fakeAuth0 = {
  isAuthenticated: ref(false),
  isLoading: ref(false),
  user: ref(undefined),
  getAccessTokenSilently: vi.fn(),
  loginWithRedirect: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@auth0/auth0-vue', () => ({
  useAuth0: () => fakeAuth0,
}))

const { toasts } = useToast()

/** Builds a fake response with the given status/data, mirroring what a real
 * adapter (xhr.js/http.js) would settle to given axios's default validateStatus
 * (2xx = success), without needing a real server or a mocking library. */
function fakeAdapter(
  scenario: (config: InternalAxiosRequestConfig) => { status: number; data?: unknown } | 'network-error',
): AxiosAdapter {
  return (config) => {
    const result = scenario(config)
    if (result === 'network-error') {
      return Promise.reject(new axios.AxiosError('Network Error', 'ERR_NETWORK', config))
    }
    const response: AxiosResponse = {
      data: result.data,
      status: result.status,
      statusText: '',
      headers: {},
      config,
    }
    if (result.status >= 200 && result.status < 300) {
      return Promise.resolve(response)
    }
    return Promise.reject(
      new axios.AxiosError(
        `Request failed with status code ${result.status}`,
        result.status >= 400 && result.status < 500
          ? axios.AxiosError.ERR_BAD_REQUEST
          : axios.AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        response,
      ),
    )
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  toasts.splice(0, toasts.length)
  fakeAuth0.getAccessTokenSilently.mockReset()
  fakeAuth0.logout.mockReset()
})

afterEach(() => {
  http.defaults.adapter = undefined
})

describe('http interceptor taxonomy', () => {
  it('401: silently refreshes the token and retries the original request exactly once', async () => {
    let callCount = 0
    fakeAuth0.getAccessTokenSilently.mockResolvedValue('fresh-token')
    http.defaults.adapter = fakeAdapter(() => {
      callCount += 1
      if (callCount === 1) return { status: 401 }
      return { status: 200, data: { ok: true } }
    })

    const response = await http.get('/account')

    expect(response.data).toEqual({ ok: true })
    expect(callCount).toBe(2)
    expect(fakeAuth0.getAccessTokenSilently).toHaveBeenCalledTimes(1)
    expect(toasts.length).toBe(0)
  })

  it('401: does not loop a second time if the retried request also fails', async () => {
    let callCount = 0
    fakeAuth0.getAccessTokenSilently.mockResolvedValue('fresh-token')
    http.defaults.adapter = fakeAdapter(() => {
      callCount += 1
      return { status: 401 }
    })

    await expect(http.get('/account')).rejects.toBeInstanceOf(axios.AxiosError)
    expect(callCount).toBe(2)
    expect(fakeAuth0.getAccessTokenSilently).toHaveBeenCalledTimes(1)
    expect(toasts.length).toBe(0)
  })

  it('network error: shows a toast with a retry action, request never reached a server', async () => {
    http.defaults.adapter = fakeAdapter(() => 'network-error')

    await expect(http.get('/account')).rejects.toMatchObject({ code: 'ERR_NETWORK' })

    expect(toasts).toHaveLength(1)
    expect(toasts[0]?.message).toBe(i18n.global.t('common.errors.network'))
    expect(toasts[0]?.retry).toBeTypeOf('function')
  })

  it('network error: skipErrorToast suppresses the toast', async () => {
    http.defaults.adapter = fakeAdapter(() => 'network-error')

    await expect(http.get('/account', { skipErrorToast: true })).rejects.toBeInstanceOf(
      axios.AxiosError,
    )

    expect(toasts).toHaveLength(0)
  })

  it('4xx: attaches fieldErrors and shows no toast', async () => {
    http.defaults.adapter = fakeAdapter(() => ({
      status: 422,
      data: { fieldErrors: { name: 'Geçersiz belge adı' } },
    }))

    await expect(http.post('/documents', {})).rejects.toMatchObject({
      fieldErrors: { name: 'Geçersiz belge adı' },
    })

    expect(toasts).toHaveLength(0)
  })

  it('4xx: fieldErrors is null when the server sent none', async () => {
    http.defaults.adapter = fakeAdapter(() => ({ status: 404, data: {} }))

    await expect(http.get('/documents/999')).rejects.toMatchObject({ fieldErrors: null })
  })

  it('5xx: shows a generic toast with no retry action', async () => {
    http.defaults.adapter = fakeAdapter(() => ({ status: 500 }))

    await expect(http.get('/account')).rejects.toBeInstanceOf(axios.AxiosError)

    expect(toasts).toHaveLength(1)
    expect(toasts[0]?.message).toBe(i18n.global.t('common.errors.server'))
    expect(toasts[0]?.retry).toBeUndefined()
  })

  it('5xx: skipErrorToast suppresses the toast', async () => {
    http.defaults.adapter = fakeAdapter(() => ({ status: 500 }))

    await expect(http.get('/account', { skipErrorToast: true })).rejects.toBeInstanceOf(
      axios.AxiosError,
    )

    expect(toasts).toHaveLength(0)
  })
})
