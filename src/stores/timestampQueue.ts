import { defineStore } from 'pinia'
import { ref } from 'vue'

export type QueueFileStatus = 'queued' | 'processing' | 'done' | 'error'

export interface QueueFile {
  // Client-generated, stable only for this session — distinct from
  // `documentId`, which only exists once this file has actually been
  // committed to the server (see TimestampView.vue's commitFile()).
  id: number
  name: string
  size: string
  file: File
  status: QueueFileStatus
  error?: string
  documentId?: number
}

// Files staged here are pre-commit: nothing about them exists server-side
// until OTP verification actually commits them (createDocument() +
// useTimestampMutation). Kept in Pinia, not TanStack Query, because this is
// client-only state with no server counterpart — mirrors this project's own
// convention of reserving Pinia for client-only state (auth, theme) and
// TanStack Query for anything server-backed.
export const useTimestampQueueStore = defineStore('timestampQueue', () => {
  const files = ref<QueueFile[]>([])

  return { files }
})
