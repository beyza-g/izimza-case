import { http } from '@/lib/http'
import type { DocStatus, OperationType } from '@/data/mockData'
import type { Document, RawDocument, RawDocStatus, RawDocType } from '@/types/document'

export type { RawDocType, RawDocStatus, RawDocument, Document }

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const VALID_STATUSES = new Set<string>(['signed', 'pending', 'archived', 'cancelled'])
const VALID_OPERATION_TYPES = new Set<string>(['timestamp', 'sign'])

export function mapDocument(raw: RawDocument): Document {
  return {
    id: raw.id,
    name: raw.name,
    ext: raw.type.toUpperCase(),
    sizeMb: raw.sizeMb,
    date: dateFormatter.format(new Date(raw.uploadedAt)),
    // Pass-through validation: Use backend status directly if valid, else fallback to 'pending'
    status: VALID_STATUSES.has(raw.status) ? (raw.status as DocStatus) : 'pending',
    operationType: VALID_OPERATION_TYPES.has(raw.operationType)
      ? (raw.operationType as OperationType)
      : 'timestamp',
  }
}

export async function fetchDocuments(): Promise<Document[]> {
  // Sorted server-side (json-server's own _sort/_order, not a client-side
  // .sort()) so "most recent first" holds regardless of insertion order —
  // newly uploaded documents get appended to db.json, not inserted in date
  // order, so relying on array order alone was silently wrong.
  const response = await http.get<RawDocument[]>('/documents', {
    params: { _sort: 'uploadedAt', _order: 'desc' },
  })
  return response.data.map(mapDocument)
}

export interface CreateDocumentInput {
  name: string
  type: RawDocType
  sizeMb: number
  uploadedAt: string
  status: RawDocStatus
  operationType: OperationType
}

export async function createDocument(
  input: CreateDocumentInput,
  options?: { signal?: AbortSignal },
): Promise<{ id: number }> {
  const response = await http.post<{ id: number }>('/documents', input, {
    signal: options?.signal,
  })
  return response.data
}

export async function deleteDocument(
  id: number,
  options?: { skipErrorToast?: boolean },
): Promise<void> {
  await http.delete(`/documents/${id}`, { skipErrorToast: options?.skipErrorToast })
}

export async function archiveDocument(id: number): Promise<void> {
  await http.patch(`/documents/${id}`, { status: 'archived' }, { skipErrorToast: true })
}

export interface SendMailInput {
  documentId: number
  recipients: string[]
}

export async function sendMail(
  input: SendMailInput,
  options?: { skipErrorToast?: boolean },
): Promise<{ id: number }> {
  const response = await http.post<{ id: number }>(
    '/mailLog',
    { ...input, sentAt: new Date().toISOString() },
    { skipErrorToast: options?.skipErrorToast },
  )
  return response.data
}
