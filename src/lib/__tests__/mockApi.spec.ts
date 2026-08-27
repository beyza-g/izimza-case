import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { simulateRequest, debugForceNextError, MockNetworkError } from '../mockApi'

describe('simulateRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('resolves with the given result after the delay, with no real waiting', async () => {
    const promise = simulateRequest({ ok: true }, { delay: 500 })
    await vi.advanceTimersByTimeAsync(500)
    await expect(promise).resolves.toEqual({ ok: true })
  })

  it('defaults to a 500ms delay when none is given', async () => {
    const promise = simulateRequest('value')
    vi.advanceTimersByTime(499)
    // Not resolved yet — only 499ms of the default 500ms have elapsed.
    let settled = false
    promise.then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await expect(promise).resolves.toBe('value')
  })

  it('rejects with MockNetworkError when debugForceNextError() was armed', async () => {
    debugForceNextError()
    const promise = simulateRequest('value', { delay: 10 })
    // Attach the rejection assertion BEFORE advancing timers: advancing can
    // settle the promise synchronously inside that call, and a promise that
    // rejects with no handler attached yet trips Node's unhandledRejection
    // detection even if it's `await`-ed a moment later.
    const assertion = expect(promise).rejects.toBeInstanceOf(MockNetworkError)
    await vi.advanceTimersByTimeAsync(10)
    await assertion
  })

  it('consumes the forced-error flag exactly once', async () => {
    debugForceNextError()

    const first = simulateRequest('a', { delay: 10 })
    const firstAssertion = expect(first).rejects.toBeInstanceOf(MockNetworkError)
    await vi.advanceTimersByTimeAsync(10)
    await firstAssertion

    // The flag was a one-shot — the next call must succeed normally.
    const second = simulateRequest('b', { delay: 10 })
    await vi.advanceTimersByTimeAsync(10)
    await expect(second).resolves.toBe('b')
  })

  it('never fails organically when failRate is left at its default (0)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const promise = simulateRequest('safe', { delay: 10 })
    await vi.advanceTimersByTimeAsync(10)
    await expect(promise).resolves.toBe('safe')
  })

  it('rejects when Math.random() falls under an explicit failRate', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const promise = simulateRequest('value', { delay: 10, failRate: 0.1 })
    const assertion = expect(promise).rejects.toBeInstanceOf(MockNetworkError)
    await vi.advanceTimersByTimeAsync(10)
    await assertion
  })

  it('resolves when Math.random() falls at or above an explicit failRate', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const promise = simulateRequest('value', { delay: 10, failRate: 0.1 })
    await vi.advanceTimersByTimeAsync(10)
    await expect(promise).resolves.toBe('value')
  })
})
