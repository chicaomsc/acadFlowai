import type { ExportFormat } from '@/shared/types/contracts'
import { getExportStatus } from '@/shared/services/export.service'

export function exportStatusQuery(projectId: string | undefined, format: ExportFormat) {
  return {
    queryKey: ['export-status', projectId ?? 'active', format],
    queryFn: () => getExportStatus(projectId, format),
  }
}
