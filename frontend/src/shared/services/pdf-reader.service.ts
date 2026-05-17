import { mockDb } from '@/shared/mocks/database'
import { apiClient } from '@/shared/services/api-client'
import type { PDFDocument } from '@/shared/types/contracts'

export interface PdfReaderPayload {
  documents: PDFDocument[]
  selectedDocument: PDFDocument | null
}

export async function getPdfReaderPayload(): Promise<PdfReaderPayload> {
  return apiClient.get('/pdf-reader', () => ({
    documents: mockDb.pdfDocuments,
    selectedDocument:
      mockDb.pdfDocuments.find((document) => document.status === 'completed') ?? null,
  }))
}
