import { mockDb } from '@/shared/mocks/database'
import { resolveProjectId } from '@/shared/services/active-project.service'
import { mapApiChapter, type ApiChapterResponse } from '@/shared/services/api-mappers'
import { apiClient } from '@/shared/services/api-client'
import type { Chapter } from '@/shared/types/contracts'
import { countWords } from '@/shared/utils/domain-logic'

export interface CreateSectionInput {
  title: string
  sectionOrder?: number
  content?: string
}

export interface UpdateSectionInput {
  title?: string
  sectionOrder?: number
  content?: string
}

function sortChaptersForDisplay(chapters: Chapter[]) {
  return [...chapters].sort((left, right) => {
    const leftLevel = left.level ?? 1
    const rightLevel = right.level ?? 1

    if (leftLevel !== rightLevel) {
      return leftLevel - rightLevel
    }

    if (leftLevel === 1) {
      return left.order - right.order
    }

    if ((left.parentId ?? '') !== (right.parentId ?? '')) {
      return (left.parentId ?? '').localeCompare(right.parentId ?? '')
    }

    const leftOrder = left.sectionOrder ?? left.order
    const rightOrder = right.sectionOrder ?? right.order
    return leftOrder - rightOrder
  })
}

export async function getChapters(projectId?: string): Promise<Chapter[]> {
  if (!apiClient.isConfigured()) {
    return apiClient.get('/chapters', () => {
      const resolvedProjectId = resolveProjectId(projectId)
      return resolvedProjectId
        ? sortChaptersForDisplay(mockDb.chapters.filter((chapter) => chapter.projectId === resolvedProjectId))
        : mockDb.chapters
    })
  }

  const response = await apiClient.get<ApiChapterResponse[]>('/chapters', {
    query: {
      projectId: resolveProjectId(projectId) ?? undefined,
    },
  })

  return response.map(mapApiChapter).sort((left, right) => {
    const leftLevel = left.level ?? 1
    const rightLevel = right.level ?? 1

    if (leftLevel !== rightLevel) {
      return leftLevel - rightLevel
    }

    if (leftLevel === 1) {
      return left.order - right.order
    }

    if ((left.parentId ?? '') !== (right.parentId ?? '')) {
      return (left.parentId ?? '').localeCompare(right.parentId ?? '')
    }

    return (left.sectionOrder ?? left.order) - (right.sectionOrder ?? right.order)
  })
}

export async function getChapter(chapterId: string): Promise<Chapter | null> {
  if (!apiClient.isConfigured()) {
    return apiClient.get(`/chapters/${chapterId}`, () =>
      mockDb.chapters.find((chapter) => chapter.id === chapterId) ?? null,
    )
  }

  const response = await apiClient.get<ApiChapterResponse>(`/chapters/${chapterId}`)
  return mapApiChapter(response)
}

export async function updateChapterContent(chapterId: string, content: string): Promise<Chapter | null> {
  if (!apiClient.isConfigured()) {
    return apiClient.patch(`/chapters/${chapterId}`, () => {
      const chapter = mockDb.chapters.find((item) => item.id === chapterId)
      if (!chapter) return null
      chapter.content = content
      chapter.wordCount = countWords(content)
      chapter.lastEditedAt = new Date()
      if (chapter.wordCount > 0 && chapter.status === 'not_started') {
        chapter.status = 'writing'
      }
      if (chapter.wordCount === 0 && chapter.status === 'writing') {
        chapter.status = 'not_started'
      }
      return chapter
    })
  }

  const response = await apiClient.patch<ApiChapterResponse>(`/chapters/${chapterId}`, {
    body: { content },
  })

  return mapApiChapter(response)
}

export async function createSection(parentChapterId: string, input: CreateSectionInput): Promise<Chapter> {
  if (apiClient.isConfigured()) {
    const response = await apiClient.post<ApiChapterResponse>(`/chapters/${parentChapterId}/sections`, {
      body: {
        title: input.title.trim(),
        sectionOrder: input.sectionOrder ?? null,
        content: input.content ?? '',
      },
    })

    return mapApiChapter(response)
  }

  const parentChapter = mockDb.chapters.find((chapter) => chapter.id === parentChapterId)
  if (!parentChapter) {
    throw new Error('Capítulo pai não encontrado.')
  }

  const nextSectionOrder = input.sectionOrder ?? mockDb.chapters.filter((chapter) => chapter.parentId === parentChapterId).length + 1
  const section: Chapter = {
    id: `section-${mockDb.chapters.filter((chapter) => chapter.level === 2).length + 1}`,
    projectId: parentChapter.projectId,
    title: input.title.trim(),
    type: parentChapter.type,
    level: 2,
    parentId: parentChapterId,
    sectionOrder: nextSectionOrder,
    content: input.content ?? '',
    status: input.content?.trim() ? 'writing' : 'not_started',
    order: nextSectionOrder,
    wordCount: countWords(input.content ?? ''),
    lastEditedAt: new Date(),
  }

  mockDb.chapters.push(section)
  return structuredClone(section)
}

export async function updateSection(sectionId: string, input: UpdateSectionInput): Promise<Chapter | null> {
  if (apiClient.isConfigured()) {
    const response = await apiClient.patch<ApiChapterResponse>(`/sections/${sectionId}`, {
      body: {
        title: input.title?.trim() ?? null,
        sectionOrder: input.sectionOrder ?? null,
        content: input.content ?? null,
      },
    })

    return mapApiChapter(response)
  }

  const section = mockDb.chapters.find((chapter) => chapter.id === sectionId && (chapter.level ?? 1) === 2)
  if (!section) return null

  if (typeof input.title === 'string') {
    section.title = input.title.trim() || section.title
  }

  if (typeof input.sectionOrder === 'number' && !Number.isNaN(input.sectionOrder)) {
    section.sectionOrder = input.sectionOrder
    section.order = input.sectionOrder
  }

  if (typeof input.content === 'string') {
    section.content = input.content
    section.wordCount = countWords(input.content)
    if (section.wordCount > 0 && section.status === 'not_started') {
      section.status = 'writing'
    }
    if (section.wordCount === 0 && section.status === 'writing') {
      section.status = 'not_started'
    }
  }

  section.lastEditedAt = new Date()
  return structuredClone(section)
}

export async function deleteSection(sectionId: string): Promise<boolean> {
  if (apiClient.isConfigured()) {
    await apiClient.delete<null>(`/sections/${sectionId}`)
    return true
  }

  const index = mockDb.chapters.findIndex((chapter) => chapter.id === sectionId && (chapter.level ?? 1) === 2)
  if (index === -1) return false

  mockDb.chapters.splice(index, 1)
  return true
}
