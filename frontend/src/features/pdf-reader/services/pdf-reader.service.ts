import { getPdfReaderPayload } from '@/shared/services/pdf-reader.service'

export const pdfReaderQuery = {
  queryKey: ['pdf-reader'],
  queryFn: getPdfReaderPayload,
}
