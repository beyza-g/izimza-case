import type { Document } from '@/api/documents'

// Neither of these receipts is the original file — the mock backend never
// stored real bytes for an archived document, and a queued file's commit
// result is represented by a certificate of what happened, not a copy of
// the file itself. Both call sites (DashboardView's history table,
// TimestampView's result screen) build the same shape of receipt from
// different source data, hence one function per source rather than one
// per view.
export function buildArchiveReceipt(doc: Document): string {
  return [
    'İzİmza — Archive Record',
    '',
    `Belge: ${doc.name}`,
    `Boyut: ${doc.sizeMb} MB`,
    `Tarih: ${doc.date}`,
    `Durum: ${doc.status}`,
    `Belge No: #${doc.id}`,
    'Özet algoritması: SHA-256',
    'Standart: RFC 3161',
    '',
  ].join('\n')
}

export function buildTimestampReceipt(
  file: { name: string; size: string },
  archived: boolean,
): string {
  return [
    'İzİmza — Zaman Damgalama Sertifikası',
    '',
    `Belge: ${file.name}`,
    `Boyut: ${file.size}`,
    'Zaman: 25.08.2026 15:41:07 +03',
    'Özet algoritması: SHA-256',
    'Standart: RFC 3161',
    archived ? 'Arşiv durumu: Arşivlendi' : 'Arşiv durumu: Arşivlenmedi',
    '',
  ].join('\n')
}
