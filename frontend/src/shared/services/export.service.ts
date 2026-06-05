import { mockDb } from '@/shared/mocks/database'
import { resolveProjectId } from '@/shared/services/active-project.service'
import { apiClient } from '@/shared/services/api-client'
import { getProjectDetails } from '@/shared/services/project.service'
import { getReferences } from '@/shared/services/reference.service'
import { getSessionToken } from '@/shared/services/session.service'
import type { ExportFormat, ExportStatus } from '@/shared/types/contracts'
import { validateExportStatus } from '@/shared/utils/domain-logic'

export interface ExportArtifact {
  projectId: string
  format: ExportFormat
  fileName: string
  downloadUrl: string
  generatedAt: Date
}

export class ExportDownloadError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ExportDownloadError'
    this.status = status
  }
}

interface ApiExportStatusResponse {
  projectId: string
  format: string
  ready: boolean
  progress: number
  pendingItems: string[]
  completedItems: string[]
  chapterCoverage: number
  referenceCoverage: number
}

interface ApiExportArtifactResponse {
  projectId: string
  format: string
  fileName: string
  downloadUrl: string
  generatedAt: string
}

function resolveApiDownloadUrl(downloadUrl: string) {
  if (/^https?:\/\//i.test(downloadUrl)) {
    return downloadUrl
  }

  const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')
  if (!apiBaseUrl || !downloadUrl.startsWith('/')) {
    return downloadUrl
  }

  return `${apiBaseUrl}${downloadUrl}`
}

function resolveApiResourceUrl(resource: string) {
  const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')
  if (!apiBaseUrl) {
    return resource.startsWith('/') ? resource : `/${resource}`
  }

  const normalizedResource = resource.startsWith('/') ? resource : `/${resource}`
  return `${apiBaseUrl}${normalizedResource}`
}

function buildResponseErrorMessage(response: Response) {
  return response.text().then((rawText) => {
    const fallbackMessage = 'Não foi possível gerar o PDF. Tente novamente em instantes.'

    if (!rawText.trim()) {
      return fallbackMessage
    }

    try {
      const parsed = JSON.parse(rawText) as { message?: string; error?: string; detail?: string }
      return parsed.message?.trim() || parsed.error?.trim() || parsed.detail?.trim() || rawText.trim()
    } catch {
      return rawText.trim()
    }
  })
}

export async function getExportStatus(
  projectId?: string,
  format: ExportFormat = 'pdf',
): Promise<ExportStatus | null> {
  const resolvedProjectId = resolveProjectId(projectId)

  if (!resolvedProjectId) return null

  if (apiClient.isConfigured()) {
    const [statusResponse, projectDetails, references] = await Promise.all([
      apiClient.get<ApiExportStatusResponse>(`/projects/${resolvedProjectId}/export-status`, {
        query: { format },
      }),
      getProjectDetails(resolvedProjectId),
      getReferences(resolvedProjectId),
    ])

    const chapters = projectDetails?.chapters ?? []
    const chaptersWithContent = chapters.filter((chapter) => chapter.content.trim().length > 0)
    const referencesWithCitation = references.filter((reference) => reference.hasCitation)

    return {
      projectId: statusResponse.projectId,
      format: statusResponse.format as ExportFormat,
      ready: statusResponse.ready,
      progress: statusResponse.progress,
      pendingItems: statusResponse.pendingItems,
      completedItems: statusResponse.completedItems,
      chapterCoverage: {
        total: chapters.length,
        completed: chaptersWithContent.length,
      },
      referenceCoverage: {
        total: references.length,
        cited: referencesWithCitation.length,
      },
    }
  }

  const project = mockDb.projects.find((item) => item.id === resolvedProjectId)
  if (!project) return null
  const chapters = mockDb.chapters.filter((chapter) => chapter.projectId === resolvedProjectId)
  const references = mockDb.references.filter((reference) => reference.projectId === resolvedProjectId)
  const tasks = mockDb.timelineTasks.filter((task) => task.projectId === resolvedProjectId)
  return structuredClone(validateExportStatus(project, chapters, references, tasks, format))
}

export async function generateExportArtifact(projectId: string | undefined, format: ExportFormat): Promise<ExportArtifact | null> {
  const resolvedProjectId = resolveProjectId(projectId)

  if (!resolvedProjectId) return null

  if (apiClient.isConfigured()) {
    if (format !== 'docx') {
      throw new Error('A exportação real está disponível apenas para DOCX por enquanto.')
    }

    const response = await apiClient.post<ApiExportArtifactResponse>('/exports', {
      body: {
        projectId: resolvedProjectId,
        format,
      },
    })

    return {
      projectId: response.projectId,
      format: response.format as ExportFormat,
      fileName: response.fileName,
      downloadUrl: resolveApiDownloadUrl(response.downloadUrl),
      generatedAt: new Date(response.generatedAt),
    }
  }

  const project = mockDb.projects.find((item) => item.id === resolvedProjectId)
  if (!project) return null

  const extension = format === 'slides' ? 'pptx' : format
  const safeTitle = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  return {
    projectId: resolvedProjectId,
    format,
    fileName: `${safeTitle || 'acadflow'}-${format}.${extension}`,
    downloadUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(`Exportação mockada do projeto ${project.title} em ${format.toUpperCase()}`)}`,
    generatedAt: new Date(),
  }
}

export async function downloadExportArtifact(downloadUrl: string, fileName: string) {
  const token = getSessionToken()
  if (!token) {
    throw new Error('Sua sessão expirou. Faça login novamente para baixar o arquivo.')
  }

  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Não foi possível baixar o arquivo DOCX. Tente novamente em instantes.')
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(objectUrl)
}

export async function downloadPdfExportArtifact(projectId: string, fileName: string) {
  const token = getSessionToken()
  if (!token) {
    throw new ExportDownloadError('Sua sessão expirou. Faça login novamente para baixar o arquivo.')
  }

  const response = await fetch(resolveApiResourceUrl(`/projects/${projectId}/export/pdf`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    if (response.status === 502) {
      throw new ExportDownloadError('Falha ao converter documento para PDF.', 502)
    }

    const backendMessage = await buildResponseErrorMessage(response)
    throw new ExportDownloadError(
      response.status === 400
        ? backendMessage
        : backendMessage || 'Não foi possível gerar o PDF. Tente novamente em instantes.',
      response.status,
    )
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(objectUrl)
}
