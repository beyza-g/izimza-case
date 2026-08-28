import { computed, onBeforeUnmount, ref } from 'vue'

// Owns only its own timer state — nothing about flow/queue/submitting.
// Seeded from a real expiresAt timestamp (typically a server's own), not a
// locally-guessed duration, so the visible countdown can't disagree with
// whatever authority actually decides expiry.
export function useCountdown() {
  const seconds = ref(0)
  let timer: number | null = null

  const label = computed(() => {
    const m = Math.floor(seconds.value / 60)
    const s = seconds.value % 60
    return `${m}:${String(s).padStart(2, '0')}`
  })

  const isExpired = computed(() => seconds.value <= 0)

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  function start(expiresAt: number) {
    stop()
    seconds.value = Math.max(0, Math.round((expiresAt - Date.now()) / 1000))
    timer = window.setInterval(() => {
      seconds.value = Math.max(0, seconds.value - 1)
      if (seconds.value <= 0) stop()
    }, 1000)
  }

  onBeforeUnmount(stop)

  return { seconds, label, isExpired, start, stop }
}
