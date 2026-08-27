// Turkish mobile format: a fixed "0" trunk prefix (not user-entered), then
// 10 digits laid out as (5XX) XXX-XXXX. Both the input mask and the Zod
// schema check against this exact shape so they can't drift apart.
export const PHONE_REGEX = /^0\(5\d{2}\) \d{3}-\d{4}$/

// The one place that decides "how many real digits does this string
// contain" — applied identically whether `str` is raw keystroke input or
// already-masked text, so a caller re-scanning its own formatted output
// never mistakes the fixed leading "0" for a digit the user typed.
export function extractDigits(str: string): string {
  return str.replace(/\D/g, '').replace(/^0/, '').slice(0, 10)
}

// Hides the middle 3-digit group of an already-formatted number, e.g. for
// showing which phone an OTP was sent to without revealing it in full:
// "0(551) 169-6158" -> "0(551) •••-6158".
export function maskPhone(formatted: string): string {
  return formatted.replace(/^(0\(\d{3}\)) \d{3}(-\d{4})$/, '$1 •••$2')
}

export function formatPhone(raw: string): string {
  const digits = extractDigits(raw)
  if (!digits) return ''

  let result = `0(${digits.slice(0, 3)}`
  if (digits.length >= 3) result += ')'
  if (digits.length > 3) result += ` ${digits.slice(3, 6)}`
  if (digits.length > 6) result += `-${digits.slice(6, 10)}`
  return result
}
