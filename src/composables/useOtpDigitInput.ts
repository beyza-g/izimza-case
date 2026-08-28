import { nextTick, ref, type Ref } from 'vue'

// A digit box's own auto-advance/backspace/focus behavior — reusable
// wherever a 6-box OTP input shows up, independent of whatever screen it's
// rendered inside.
export function useOtpDigitInput(otp: Ref<string[]>) {
  const otpRefs = ref<HTMLInputElement[]>([])

  function onOtpInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement
    const value = input.value.replace(/\D/g, '').slice(-1)
    otp.value[index] = value
    if (value && index < otp.value.length - 1) {
      otpRefs.value[index + 1]?.focus()
    }
  }

  function onOtpKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !otp.value[index] && index > 0) {
      otpRefs.value[index - 1]?.focus()
    }
  }
  function onOtpFocus(event: FocusEvent) {
    ;(event.target as HTMLInputElement).select()
  }

  function focusFirst() {
    nextTick(() => otpRefs.value[0]?.focus())
  }

  return { otpRefs, onOtpInput, onOtpKeydown, onOtpFocus, focusFirst }
}
