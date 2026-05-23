import { mockDb } from '@/shared/mocks/database'
import { apiClient } from '@/shared/services/api-client'
import type { Citation, CitationDisplayMode, CitationType, Reference } from '@/shared/types/contracts'

export interface CitationInput {
  referenceId: string
  type: CitationType
  displayMode?: CitationDisplayMode
  page?: string
  quotedText?: string
  apudAuthor?: string
  apudYear?: string
}

interface ApiCitationResponse {
  id: string
  projectId?: string | null
  chapterId?: string | null
  referenceId?: string | null
  citationType?: string | null
  type?: string | null
  displayMode?: string | null
  citationDisplayMode?: string | null
  page?: string | number | null
  quotedText?: string | null
  apudAuthor?: string | null
  apudYear?: string | number | null
  createdAt?: string | null
  updatedAt?: string | null
  reference?: {
    id: string
    projectId?: string | null
    primaryChapterId?: string | null
    title: string
    authors: string | string[]
    type: string
    year: number
    journal?: string | null
    publisher?: string | null
    doi?: string | null
    url?: string | null
    accessDate?: string | null
    abntFormatted?: string | null
    hasCitation?: boolean | null
  } | null
}

function mapCitationTypeFromApi(type?: string | null): CitationType {
  switch ((type ?? '').toUpperCase()) {
    case 'DIRECT_SHORT':
    case 'DIRECTSHORT':
      return 'direct_short'
    case 'DIRECT_LONG':
    case 'DIRECTLONG':
      return 'direct_long'
    case 'APUD':
      return 'apud'
    case 'INDIRECT':
    default:
      return 'indirect'
  }
}

function mapCitationTypeToApi(type: CitationType) {
  switch (type) {
    case 'direct_short':
      return 'DIRECT_SHORT'
    case 'direct_long':
      return 'DIRECT_LONG'
    case 'apud':
      return 'APUD'
    case 'indirect':
    default:
      return 'INDIRECT'
  }
}

function mapCitationDisplayModeFromApi(mode?: string | null): CitationDisplayMode {
  return (mode ?? '').toUpperCase() === 'NARRATIVE' ? 'narrative' : 'parenthetical'
}

function mapCitationDisplayModeToApi(mode?: CitationDisplayMode) {
  return mode === 'narrative' ? 'NARRATIVE' : 'PARENTHETICAL'
}

function parseAuthors(authors: string | string[]) {
  if (Array.isArray(authors)) return authors

  return authors
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

function mapReferenceFromEmbedded(reference: NonNullable<ApiCitationResponse['reference']>): Reference {
  return {
    id: reference.id,
    projectId: reference.projectId ?? '',
    primaryChapterId: reference.primaryChapterId ?? undefined,
    chapterIds: reference.primaryChapterId ? [reference.primaryChapterId] : [],
    type: (() => {
      switch (reference.type.toUpperCase()) {
        case 'ARTICLE':
          return 'article' as const
        case 'BOOK':
          return 'book' as const
        case 'WEBSITE':
          return 'website' as const
        case 'DISSERTATION':
          return 'dissertation' as const
        case 'THESIS':
          return 'thesis' as const
        default:
          return 'other' as const
      }
    })(),
    authors: parseAuthors(reference.authors),
    title: reference.title,
    year: reference.year,
    journal: reference.journal ?? undefined,
    publisher: reference.publisher ?? undefined,
    doi: reference.doi ?? undefined,
    url: reference.url ?? undefined,
    accessDate: reference.accessDate ? new Date(reference.accessDate) : undefined,
    abntFormatted: reference.abntFormatted ?? undefined,
    hasCitation: Boolean(reference.hasCitation),
  }
}

function resolveReference(referenceId: string | null | undefined) {
  if (!referenceId) return undefined
  return mockDb.references.find((item) => item.id === referenceId)
}

function mapApiCitation(citation: ApiCitationResponse): Citation {
  const fallbackReference = resolveReference(citation.referenceId)
  const reference = citation.reference
    ? mapReferenceFromEmbedded(citation.reference)
    : fallbackReference
  const displayMode = mapCitationDisplayModeFromApi(citation.citationDisplayMode ?? citation.displayMode)

  return {
    id: citation.id,
    projectId: citation.projectId ?? reference?.projectId ?? '',
    chapterId: citation.chapterId ?? reference?.primaryChapterId ?? '',
    referenceId: citation.referenceId ?? reference?.id ?? '',
    type: mapCitationTypeFromApi(citation.citationType ?? citation.type),
    displayMode,
    citationDisplayMode: displayMode,
    page: citation.page === null || citation.page === undefined ? undefined : String(citation.page),
    quotedText: citation.quotedText ?? undefined,
    apudAuthor: citation.apudAuthor ?? undefined,
    apudYear: citation.apudYear === null || citation.apudYear === undefined ? undefined : String(citation.apudYear),
    reference,
    createdAt: citation.createdAt ? new Date(citation.createdAt) : undefined,
    updatedAt: citation.updatedAt ? new Date(citation.updatedAt) : undefined,
  }
}

function getNextCitationId() {
  const highestId = mockDb.citations.reduce((highest, citation) => {
    const match = citation.id.match(/^citation-(\d+)$/)
    const numeric = match ? Number(match[1]) : 0
    return Math.max(highest, numeric)
  }, 0)

  return `citation-${highestId + 1}`
}

export async function getChapterCitations(chapterId: string): Promise<Citation[]> {
  if (!apiClient.isConfigured()) {
    return structuredClone(mockDb.citations.filter((citation) => citation.chapterId === chapterId))
  }

  const response = await apiClient.get<ApiCitationResponse[]>(`/chapters/${chapterId}/citations`)
  return response.map(mapApiCitation)
}

export async function getProjectCitations(projectId: string): Promise<Citation[]> {
  if (!apiClient.isConfigured()) {
    return structuredClone(mockDb.citations.filter((citation) => citation.projectId === projectId))
  }

  const response = await apiClient.get<ApiCitationResponse[]>(`/projects/${projectId}/citations`)
  return response.map(mapApiCitation)
}

export async function createCitation(chapterId: string, input: CitationInput): Promise<Citation> {
  if (apiClient.isConfigured()) {
    const response = await apiClient.post<ApiCitationResponse>(`/chapters/${chapterId}/citations`, {
      body: {
        referenceId: input.referenceId,
        type: mapCitationTypeToApi(input.type),
        displayMode: mapCitationDisplayModeToApi(input.displayMode),
        citationDisplayMode: mapCitationDisplayModeToApi(input.displayMode),
        page: input.page?.trim() || null,
        quotedText: input.quotedText?.trim() || null,
        apudAuthor: input.apudAuthor?.trim() || null,
        apudYear: input.apudYear?.trim() || null,
      },
    })

    return mapApiCitation(response)
  }

  const reference = mockDb.references.find((item) => item.id === input.referenceId)
  if (!reference) {
    throw new Error('Referência não encontrada para criar a citação.')
  }

  const citation: Citation = {
    id: getNextCitationId(),
    projectId: reference.projectId,
    chapterId,
    referenceId: input.referenceId,
    type: input.type,
    displayMode: input.displayMode ?? 'parenthetical',
    citationDisplayMode: input.displayMode ?? 'parenthetical',
    page: input.page?.trim() || undefined,
    quotedText: input.quotedText?.trim() || undefined,
    apudAuthor: input.apudAuthor?.trim() || undefined,
    apudYear: input.apudYear?.trim() || undefined,
    reference,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  mockDb.citations.push(citation)

  reference.hasCitation = true
  if (!reference.chapterIds.includes(chapterId)) {
    reference.chapterIds.push(chapterId)
  }
  if (!reference.primaryChapterId) {
    reference.primaryChapterId = chapterId
  }

  return structuredClone(citation)
}

export async function deleteCitation(citationId: string): Promise<boolean> {
  if (apiClient.isConfigured()) {
    await apiClient.delete<null>(`/citations/${citationId}`)
    return true
  }

  const index = mockDb.citations.findIndex((item) => item.id === citationId)
  if (index === -1) return false

  const [removed] = mockDb.citations.splice(index, 1)
  const reference = mockDb.references.find((item) => item.id === removed.referenceId)

  if (reference) {
    const remainingCitations = mockDb.citations.filter((item) => item.referenceId === reference.id)
    reference.hasCitation = remainingCitations.length > 0
    reference.chapterIds = Array.from(new Set(remainingCitations.map((item) => item.chapterId)))
    reference.primaryChapterId = reference.chapterIds[0]
  }

  return true
}
