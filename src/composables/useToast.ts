import { reactive } from 'vue'

export interface Toast {
  id: number
  tone: 'error' | 'success'
  message: string
  retry?: () => void
}

const toasts = reactive<Toast[]>([])
let nextId = 1

function dismissToast(id: number) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index !== -1) toasts.splice(index, 1)
}

function pushToast(message: string, opts: { tone?: Toast['tone']; retry?: () => void } = {}) {
  const id = nextId++
  toasts.push({ id, message, tone: opts.tone ?? 'error', retry: opts.retry })
  window.setTimeout(() => dismissToast(id), 6000)
  return id
}

export function useToast() {
  return { toasts, pushToast, dismissToast }
}
