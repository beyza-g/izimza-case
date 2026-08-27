import { describe, it, expect } from 'vitest'
import { mapDocument, type RawDocument } from '../documents'

function rawDoc(overrides: Partial<RawDocument> = {}): RawDocument {
  return {
    id: 1,
    name: 'Kira Sözleşmesi 2026.pdf',
    type: 'pdf',
    sizeMb: 1.2,
    uploadedAt: '2026-08-25T15:41:00+03:00',
    status: 'signed',
    ...overrides,
  }
}

describe('mapDocument', () => {
  it.each([
    ['signed', 'signed'],
    ['pending', 'pending'],
    ['archived', 'archived'],
    ['cancelled', 'cancelled'],
  ] as const)('maps raw status "%s" -> DocStatus "%s"', (raw, expected) => {
    expect(mapDocument(rawDoc({ status: raw })).status).toBe(expected)
  })

  it('falls back to "pending" when given an unknown or invalid raw status', () => {
    expect(mapDocument(rawDoc({ status: 'invalid_status' })).status).toBe('pending')
  })

  it('uppercases the file extension from the raw type', () => {
    expect(mapDocument(rawDoc({ type: 'docx' })).ext).toBe('DOCX')
    expect(mapDocument(rawDoc({ type: 'pdf' })).ext).toBe('PDF')
  })

  it('passes id, name and sizeMb through unchanged', () => {
    const mapped = mapDocument(rawDoc({ id: 42, name: 'Fatura.pdf', sizeMb: 0.8 }))
    expect(mapped.id).toBe(42)
    expect(mapped.name).toBe('Fatura.pdf')
    expect(mapped.sizeMb).toBe(0.8)
  })

  it('formats uploadedAt as a short tr-TR date (day, abbreviated month, year)', () => {
    const mapped = mapDocument(rawDoc({ uploadedAt: '2026-08-25T15:41:00+03:00' }))
    expect(mapped.date).toBe('25 Ağu 2026')
  })
})
