import { mockDb } from '@/shared/mocks/database'
import { apiClient } from '@/shared/services/api-client'
import { getSessionToken, logoutSession } from '@/shared/services/session.service'
import type { Figure } from '@/shared/types/contracts'

export interface FigureInput {
  chapterId: string
  caption: string
  sourceText?: string
  widthPercent?: Figure['widthPercent']
  file: File
}

interface ApiFigureResponse {
  id: string
  projectId?: string | null
  chapterId?: string | null
  caption?: string | null
  sourceText?: string | null
  originalFilename?: string | null
  mimeType?: string | null
  fileSizeBytes?: number | null
  widthPercent?: number | null
  createdAt?: string | null
}

const figureImageObjectUrlCache = new Map<string, string>()

function buildFigureImageUrl(projectId: string, figureId: string) {
  const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')
  if (!apiBaseUrl) {
    return mockDb.figures.find((figure) => figure.id === figureId)?.imageUrl
  }

  return `${apiBaseUrl}/projects/${projectId}/figures/${figureId}/image`
}

function buildFigureImageCacheKey(projectId: string, figureId: string) {
  return `${projectId}:${figureId}`
}

function revokeFigureImageObjectUrl(url?: string) {
  if (!url?.startsWith('blob:')) return
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  URL.revokeObjectURL(url)
}

function mapApiFigure(figure: ApiFigureResponse): Figure {
  const projectId = figure.projectId ?? ''
  const widthPercent = figure.widthPercent === 50 || figure.widthPercent === 75 ? figure.widthPercent : 100

  return {
    id: figure.id,
    projectId,
    chapterId: figure.chapterId ?? '',
    caption: figure.caption ?? 'Figura sem legenda',
    sourceText: figure.sourceText ?? undefined,
    originalFilename: figure.originalFilename ?? 'figure',
    mimeType: figure.mimeType ?? 'image/jpeg',
    fileSizeBytes: Number(figure.fileSizeBytes ?? 0),
    widthPercent,
    createdAt: figure.createdAt ? new Date(figure.createdAt) : undefined,
    imageUrl: projectId ? buildFigureImageUrl(projectId, figure.id) : undefined,
  }
}

function getNextFigureId() {
  const highestId = mockDb.figures.reduce((highest, figure) => {
    const match = figure.id.match(/^figure-(\d+)$/)
    const numeric = match ? Number(match[1]) : 0
    return Math.max(highest, numeric)
  }, 0)

  return `figure-${highestId + 1}`
}

function createMockFigureImageUrl(file: File) {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(file)
  }

  return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480"><rect width="100%25" height="100%25" fill="%23eef2ff"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23475569" font-family="Arial" font-size="28">Figura mock</text></svg>'
}

export async function getProjectFigures(projectId: string): Promise<Figure[]> {
  if (!apiClient.isConfigured()) {
    return structuredClone(mockDb.figures.filter((figure) => figure.projectId === projectId))
  }

  const response = await apiClient.get<ApiFigureResponse[]>(`/projects/${projectId}/figures`)
  return response.map(mapApiFigure)
}

export async function getChapterFigures(chapterId: string, projectId: string): Promise<Figure[]> {
  if (!apiClient.isConfigured()) {
    return structuredClone(
      mockDb.figures.filter((figure) => figure.chapterId === chapterId && figure.projectId === projectId),
    )
  }

  const response = await apiClient.get<ApiFigureResponse[]>(`/chapters/${chapterId}/figures`)
  return response.map(mapApiFigure)
}

export async function getFigureImage(projectId: string, figureId: string): Promise<string> {
  if (!apiClient.isConfigured()) {
    const imageUrl = mockDb.figures.find((figure) => figure.id === figureId && figure.projectId === projectId)?.imageUrl
    if (!imageUrl) {
      throw new Error('Imagem da figura não encontrada.')
    }

    return imageUrl
  }

  const cacheKey = buildFigureImageCacheKey(projectId, figureId)
  const cachedObjectUrl = figureImageObjectUrlCache.get(cacheKey)
  if (cachedObjectUrl) {
    return cachedObjectUrl
  }

  const imageUrl = buildFigureImageUrl(projectId, figureId)
  if (!imageUrl) {
    throw new Error('Imagem da figura não encontrada.')
  }

  const headers: Record<string, string> = {}
  const token = getSessionToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(imageUrl, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      logoutSession()
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.replace('/login')
      }
    }

    throw new Error('Não foi possível carregar a imagem da figura.')
  }

  const blob = await response.blob()
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return imageUrl
  }

  const objectUrl = URL.createObjectURL(blob)
  figureImageObjectUrlCache.set(cacheKey, objectUrl)
  return objectUrl
}

export async function createFigure(projectId: string, input: FigureInput): Promise<Figure> {
  if (apiClient.isConfigured()) {
    const formData = new FormData()
    formData.append('chapterId', input.chapterId)
    formData.append('caption', input.caption.trim())
    formData.append('sourceText', input.sourceText?.trim() ?? '')
    formData.append('widthPercent', String(input.widthPercent ?? 100))
    formData.append('file', input.file)

    const response = await apiClient.post<ApiFigureResponse>(`/projects/${projectId}/figures`, {
      body: formData,
    })

    return mapApiFigure(response)
  }

  const figure: Figure = {
    id: getNextFigureId(),
    projectId,
    chapterId: input.chapterId,
    caption: input.caption.trim(),
    sourceText: input.sourceText?.trim() || undefined,
    originalFilename: input.file.name,
    mimeType: input.file.type || 'image/jpeg',
    fileSizeBytes: input.file.size,
    widthPercent: input.widthPercent ?? 100,
    createdAt: new Date(),
    imageUrl: createMockFigureImageUrl(input.file),
  }

  mockDb.figures.push(figure)
  return structuredClone(figure)
}

export async function deleteFigure(figureId: string): Promise<boolean> {
  if (apiClient.isConfigured()) {
    await apiClient.delete<null>(`/figures/${figureId}`)
    return true
  }

  const index = mockDb.figures.findIndex((figure) => figure.id === figureId)
  if (index === -1) return false

  const [removed] = mockDb.figures.splice(index, 1)
  if (removed.imageUrl?.startsWith('blob:') && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(removed.imageUrl)
  }

  return true
}

export function clearFigureImageCache(figureId?: string, projectId?: string) {
  if (figureId && projectId) {
    const cacheKey = buildFigureImageCacheKey(projectId, figureId)
    revokeFigureImageObjectUrl(figureImageObjectUrlCache.get(cacheKey))
    figureImageObjectUrlCache.delete(cacheKey)
    return
  }

  figureImageObjectUrlCache.forEach((url) => revokeFigureImageObjectUrl(url))
  figureImageObjectUrlCache.clear()
}
