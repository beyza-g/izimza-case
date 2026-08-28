import { deleteDocument } from '@/api/documents'
import type { QueueFile } from '@/stores/timestampQueue'

// A file whose createDocument() succeeded but whose timestamp mutation then
// failed left a real, incomplete pending document server-side — since
// these callers are abandoning it (not retrying), delete it so the server
// never keeps a document with no corresponding local queue entry.
export function cleanupOrphanedErrors(files: QueueFile[]) {
  files
    .filter((f) => f.status === 'error' && f.documentId !== undefined)
    .forEach((f) => {
      deleteDocument(f.documentId!, { skipErrorToast: true }).catch(() => {})
    })
}
