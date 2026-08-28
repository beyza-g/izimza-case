// Single source for the password shape both the Zod schema and the live
// rule-checklist judge against — previously the same four regexes were
// hand-typed in both places, a real (if small) duplication risk.
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_UPPER_REGEX = /[A-ZÇĞİÖŞÜ]/
export const PASSWORD_LOWER_REGEX = /[a-zçğıöşü]/
export const PASSWORD_DIGIT_REGEX = /\d/

export interface PasswordRule {
  label: string
  ok: boolean
}

export function getPasswordRules(
  next: string,
  confirm: string,
  t: (key: string) => string,
): PasswordRule[] {
  return [
    { label: t('profile.password.rules.minLength'), ok: next.length >= PASSWORD_MIN_LENGTH },
    { label: t('profile.password.rules.upper'), ok: PASSWORD_UPPER_REGEX.test(next) },
    { label: t('profile.password.rules.lower'), ok: PASSWORD_LOWER_REGEX.test(next) },
    { label: t('profile.password.rules.digit'), ok: PASSWORD_DIGIT_REGEX.test(next) },
    { label: t('profile.password.rules.match'), ok: next.length > 0 && next === confirm },
  ]
}
