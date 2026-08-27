import { describe, it, expect } from 'vitest'
import { extractDigits, formatPhone, maskPhone, PHONE_REGEX } from '../phone'

describe('extractDigits', () => {
  it('strips the fixed leading "0" trunk prefix', () => {
    expect(extractDigits('0(551) 169-6158')).toBe('5511696158')
  })

  it('strips all non-digit characters', () => {
    expect(extractDigits('(551) 169-6158')).toBe('5511696158')
  })

  it('caps at 10 digits even when more are supplied', () => {
    expect(extractDigits('05511696158999')).toBe('5511696158')
  })

  it('returns an empty string for input with no digits', () => {
    expect(extractDigits('abc')).toBe('')
  })

  it('does not miscount a leading zero the user actually typed as a real digit', () => {
    // "0551..." -> first char stripped once as the trunk prefix, not twice
    expect(extractDigits('0551')).toBe('551')
  })
})

describe('formatPhone', () => {
  it('returns an empty string for input with no digits', () => {
    expect(formatPhone('')).toBe('')
  })

  it('formats a partial area-code-only input', () => {
    expect(formatPhone('55')).toBe('0(55')
  })

  it('closes the area-code parenthesis once 3 digits are present', () => {
    expect(formatPhone('551')).toBe('0(551)')
  })

  it('adds the middle group once more digits follow', () => {
    expect(formatPhone('551169')).toBe('0(551) 169')
  })

  it('formats a complete 10-digit number', () => {
    expect(formatPhone('5511696158')).toBe('0(551) 169-6158')
  })

  it('is idempotent on already-formatted input', () => {
    expect(formatPhone('0(551) 169-6158')).toBe('0(551) 169-6158')
  })

  it('ignores digits beyond the 10th', () => {
    expect(formatPhone('551169615899')).toBe('0(551) 169-6158')
  })

  it('produces output matching PHONE_REGEX for a full number', () => {
    expect(PHONE_REGEX.test(formatPhone('5511696158'))).toBe(true)
  })
})

describe('maskPhone', () => {
  it('masks the middle 3-digit group of a fully formatted number', () => {
    expect(maskPhone('0(551) 169-6158')).toBe('0(551) •••-6158')
  })

  it('leaves the area code and last 4 digits visible', () => {
    const masked = maskPhone('0(212) 345-6789')
    expect(masked).toBe('0(212) •••-6789')
  })

  it('returns the input unchanged if it does not match the expected formatted shape', () => {
    expect(maskPhone('551 169 6158')).toBe('551 169 6158')
    expect(maskPhone('')).toBe('')
  })
})
