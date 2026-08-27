import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime } from '../formatDate'

// Both formatters are fixed to tr-TR regardless of the active UI language
// (date/number formatting is out of scope for the i18n migration) — so the
// expected output below is the same no matter which locale the app is in.

describe('formatDate', () => {
  it('formats an ISO date string as DD.MM.YYYY', () => {
    expect(formatDate('2027-02-14')).toBe('14.02.2027')
  })

  it('formats an ISO datetime string, dropping the time portion', () => {
    expect(formatDate('2026-08-25T09:12:00+03:00')).toBe('25.08.2026')
  })

  it('zero-pads single-digit day and month', () => {
    expect(formatDate('2025-03-01')).toBe('01.03.2025')
  })
})

describe('formatDateTime', () => {
  it('formats an ISO datetime string as DD.MM.YYYY HH:mm in 24h time', () => {
    expect(formatDateTime('2026-08-25T09:12:00+03:00')).toBe('25.08.2026 09:12')
  })

  it('keeps 24h formatting for a time in the PM range', () => {
    expect(formatDateTime('2026-08-25T21:45:00+03:00')).toBe('25.08.2026 21:45')
  })
})
