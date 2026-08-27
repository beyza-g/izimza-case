import { ref } from 'vue'

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png']

export function hasAcceptedExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/**
 * Shared drag-state tracking for a dropzone card. A plain dragenter/dragleave
 * pair flickers active->inactive->active as the pointer crosses child
 * elements inside the zone (each fires its own enter/leave) — a depth
 * counter absorbs that and only flips `dragActive` at true zero.
 */
export function useDropzone(onFiles: (files: File[]) => void) {
  const dragActive = ref(false)
  let depth = 0

  function onDragEnter(event: DragEvent) {
    if (!event.dataTransfer?.types.includes('Files')) return
    depth++
    dragActive.value = true
  }

  function onDragLeave() {
    depth = Math.max(0, depth - 1)
    if (depth === 0) dragActive.value = false
  }

  function onDrop(event: DragEvent) {
    depth = 0
    dragActive.value = false
    onFiles(Array.from(event.dataTransfer?.files ?? []))
  }

  return { dragActive, onDragEnter, onDragLeave, onDrop }
}
