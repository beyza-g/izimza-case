import { ref } from 'vue'

// Dashboard's "Sign now" card has no processing pipeline of its own (by
// design — signing isn't implemented, only timestamping is) and no visible
// destination for a file dropped on it. Rather than silently discarding a
// drop there, its files are stashed here and consumed once on TimestampView's
// mount, so the SAME processFiles() logic Timestamp's own dropzone uses is
// what ultimately accepts them — not a second, parallel code path.
export const pendingUploadFiles = ref<File[]>([])
