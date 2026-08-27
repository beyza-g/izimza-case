import type { DocStatus } from '@/data/mockData'

export type RawDocType = 'pdf' | 'docx' | 'xlsx' | 'png'
export type RawDocStatus = 'signed' | 'pending' | 'archived' | 'cancelled'

export interface RawDocument {
  id: number
  name: string
  type: RawDocType
  sizeMb: number
  uploadedAt: string
  status: RawDocStatus
}

export interface Document {
  id: number
  name: string
  ext: string
  sizeMb: number
  date: string
  status: DocStatus
}
