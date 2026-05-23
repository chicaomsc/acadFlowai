import { mockDb } from '@/shared/mocks/database'
import { resolveProjectId } from '@/shared/services/active-project.service'
import { apiClient } from '@/shared/services/api-client'
import type { Reference } from '@/shared/types/contracts'

export interface ReferenceInput {
  title: string
  authors: string[]
  type: Reference['type']
  year: number
  journal?: string
  publisher?: string
  url?: string
  chapterId?: string
  hasCitation?: boolean
}

interface ApiReferenceResponse {
  id: string
  projectId: string
  primaryChapterId: string | null
  title: string
  authors: string
  type: string
  year: number
  journal?: string | null
  publisher?: string | null
  doi?: string | null
  url?: string | null
  accessDate?: string | null
  abntFormatted: string
  hasCitation: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

function mapReferenceTypeToApi(type: Reference['type']) {
  switch (type) {
    case 'article':
      return 'ARTICLE'
    case 'book':
      return 'BOOK'
    case 'website':
      return 'WEBSITE'
    case 'other':
      return 'OTHER'
    case 'dissertation':
    case 'thesis':
    default:
      return 'THESIS'
  }
}

function mapReferenceTypeFromApi(type: string): Reference['type'] {
  switch (type.toUpperCase()) {
    case 'ARTICLE':
      return 'article'
    case 'BOOK':
      return 'book'
    case 'WEBSITE':
      return 'website'
    case 'OTHER':
      return 'other'
    case 'THESIS':
    default:
      return 'thesis'
  }
}

function parseAuthors(authors: string) {
  return authors
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

function mapApiReference(reference: ApiReferenceResponse): Reference {
  return {
    id: reference.id,
    projectId: reference.projectId,
    type: mapReferenceTypeFromApi(reference.type),
    authors: parseAuthors(reference.authors),
    title: reference.title,
    year: reference.year,
    doi: reference.doi ?? undefined,
    journal: reference.journal ?? undefined,
    publisher: reference.publisher ?? undefined,
    url: reference.url ?? undefined,
    accessDate: reference.accessDate ? new Date(reference.accessDate) : undefined,
    chapterIds: reference.primaryChapterId ? [reference.primaryChapterId] : [],
    primaryChapterId: reference.primaryChapterId ?? undefined,
    abntFormatted: reference.abntFormatted,
    hasCitation: reference.hasCitation,
  }
}

function buildReferencePayload(input: ReferenceInput, projectId: string) {
  return {
    projectId,
    primaryChapterId: input.chapterId ?? null,
    title: input.title,
    authors: input.authors.join('; '),
    type: mapReferenceTypeToApi(input.type),
    year: input.year,
    journal: input.journal ?? null,
    publisher: input.publisher ?? null,
    doi: null,
    url: input.url ?? null,
    accessDate: null,
    hasCitation: input.hasCitation ?? false,
  }
}

function getNextReferenceId() {
  const highestId = mockDb.references.reduce((highest, reference) => {
    const match = reference.id.match(/^reference-(\d+)$/)
    const numeric = match ? Number(match[1]) : 0
    return Math.max(highest, numeric)
  }, 0)

  return `reference-${highestId + 1}`
}

export async function getReferences(projectId?: string, chapterId?: string): Promise<Reference[]> {
  const resolvedProjectId = resolveProjectId(projectId)

  if (!apiClient.isConfigured()) {
    return structuredClone(
      mockDb.references.filter((reference) => {
        const matchesProject = !resolvedProjectId || reference.projectId === resolvedProjectId
        const matchesChapter = !chapterId || reference.chapterIds.includes(chapterId)
        return matchesProject && matchesChapter
      }),
    )
  }

  if (!resolvedProjectId) {
    return []
  }

  const response = await apiClient.get<ApiReferenceResponse[]>('/references', {
    query: {
      projectId: resolvedProjectId,
    },
  })

  return response
    .map(mapApiReference)
    .filter((reference) => {
      const resolvedProjectId = resolveProjectId(projectId)
      const matchesProject = !resolvedProjectId || reference.projectId === resolvedProjectId
      const matchesChapter = !chapterId || reference.chapterIds.includes(chapterId)
      return matchesProject && matchesChapter
    })
}

function buildAbnt(reference: Pick<Reference, 'authors' | 'title' | 'year' | 'journal' | 'publisher'>) {
  const authors = reference.authors.join('; ')
  const source = reference.journal ?? reference.publisher ?? 'Fonte não informada'
  return `${authors}. ${reference.title}. ${source}, ${reference.year}.`
}

export async function createReference(input: ReferenceInput, projectId?: string): Promise<Reference> {
  const resolvedProjectId = resolveProjectId(projectId)

  if (!resolvedProjectId) {
    throw new Error('Projeto ativo não encontrado')
  }

  if (apiClient.isConfigured()) {
    const response = await apiClient.post<ApiReferenceResponse>('/references', {
      body: buildReferencePayload(input, resolvedProjectId),
    })

    return mapApiReference(response)
  }

  const reference: Reference = {
    id: getNextReferenceId(),
    projectId: resolvedProjectId,
    type: input.type,
    authors: input.authors,
    title: input.title,
    year: input.year,
    journal: input.journal,
    publisher: input.publisher,
    url: input.url,
    chapterIds: input.chapterId ? [input.chapterId] : [],
    primaryChapterId: input.chapterId,
    abntFormatted: buildAbnt({
      authors: input.authors,
      title: input.title,
      year: input.year,
      journal: input.journal,
      publisher: input.publisher,
    }),
    hasCitation: false,
  }

  mockDb.references.push(reference)

  const project = mockDb.projects.find((item) => item.id === resolvedProjectId)
  if (project) {
    project.referenceIds.push(reference.id)
    project.updatedAt = new Date()
  }

  return structuredClone(reference)
}

export async function updateReference(referenceId: string, input: ReferenceInput): Promise<Reference | null> {
  if (apiClient.isConfigured()) {
    const response = await apiClient.patch<ApiReferenceResponse>(`/references/${referenceId}`, {
      body: {
        primaryChapterId: input.chapterId ?? null,
        title: input.title,
        authors: input.authors.join('; '),
        type: mapReferenceTypeToApi(input.type),
        year: input.year,
        journal: input.journal ?? null,
        publisher: input.publisher ?? null,
        url: input.url ?? null,
        hasCitation: input.hasCitation,
      },
    })

    return mapApiReference(response)
  }

  const reference = mockDb.references.find((item) => item.id === referenceId)
  if (!reference) return null

  reference.title = input.title
  reference.authors = input.authors
  reference.type = input.type
  reference.year = input.year
  reference.journal = input.journal
  reference.publisher = input.publisher
  reference.url = input.url
  reference.chapterIds = input.chapterId ? [input.chapterId] : []
  reference.primaryChapterId = input.chapterId
  reference.hasCitation = input.hasCitation ?? reference.hasCitation
  reference.abntFormatted = buildAbnt(reference)

  return structuredClone(reference)
}

export async function deleteReference(referenceId: string): Promise<boolean> {
  if (apiClient.isConfigured()) {
    await apiClient.delete<null>(`/references/${referenceId}`)
    return true
  }

  const index = mockDb.references.findIndex((item) => item.id === referenceId)
  if (index === -1) return false

  const [removed] = mockDb.references.splice(index, 1)
  const project = mockDb.projects.find((item) => item.id === removed.projectId)
  if (project) {
    project.referenceIds = project.referenceIds.filter((id) => id !== referenceId)
    project.updatedAt = new Date()
  }

  return true
}
