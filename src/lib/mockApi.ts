import { i18n } from '@/i18n'

export class MockNetworkError extends Error {}

let forceNextError = false

/** Dev-only hook: makes the next simulateRequest() call reject, for testing error/retry UI. */
export function debugForceNextError() {
  forceNextError = true
}

export function simulateRequest<T>(
  result: T,
  opts: { delay?: number; failRate?: number } = {},
): Promise<T> {
  const delay = opts.delay ?? 500
  // No organic random failures by default — real network errors are only exercised
  // deterministically via the dev-only "Hata simüle et" trigger (debugForceNextError),
  // so the happy path never flakes during normal testing.
  const failRate = opts.failRate ?? 0

  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (forceNextError) {
        forceNextError = false
        reject(new MockNetworkError(i18n.global.t('common.errors.generic')))
        return
      }
      if (Math.random() < failRate) {
        reject(new MockNetworkError(i18n.global.t('common.errors.generic')))
        return
      }
      resolve(result)
    }, delay)
  })
}
