import { nextTick } from 'vue'
import { extractDigits, formatPhone } from '@/lib/phone'

// Reformats the whole value from scratch on every keystroke (simple, no new
// dependency) — the only extra care needed is mapping the caret back to the
// same *digit* position afterward, so backspace/mid-string edits still feel
// natural instead of always jumping to the end. Both counts go through
// extractDigits() so the fixed leading "0" is never miscounted as a digit
// the user typed, whether or not it's already in the string yet.
export function usePhoneInputMask(setValue: (formatted: string) => void) {
  function onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement
    const caretPos = input.selectionStart ?? input.value.length
    const digitsBeforeCaret = extractDigits(input.value.slice(0, caretPos)).length

    const formatted = formatPhone(input.value)
    setValue(formatted)

    nextTick(() => {
      let caret = formatted.length
      for (let i = 1; i <= formatted.length; i++) {
        if (extractDigits(formatted.slice(0, i)).length >= digitsBeforeCaret) {
          caret = i
          break
        }
      }
      input.setSelectionRange(caret, caret)
    })
  }

  return { onPhoneInput }
}
