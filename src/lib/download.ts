// The Blob → temporary <a download> → revoke dance was duplicated verbatim
// in DashboardView.vue and TimestampView.vue for two different receipt
// documents. Only this mechanical part is shared — each caller still builds
// its own content, since an archive receipt and a timestamp certificate are
// genuinely different documents.
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
