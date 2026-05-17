import { mockDb } from '@/shared/mocks/database'
import { resolveProjectId } from '@/shared/services/active-project.service'
import { mapApiChapter, type ApiChapterResponse } from '@/shared/services/api-mappers'
import { apiClient } from '@/shared/services/api-client'
import type { Chapter } from '@/shared/types/contracts'
import { countWords } from '@/shared/utils/domain-logic'

export async function getChapters(projectId?: string): Promise<Chapter[]> {
  if (!apiClient.isConfigured()) {
    return apiClient.get('/chapters', () => {
      const resolvedProjectId = resolveProjectId(projectId)
      return resolvedProjectId
        ? mockDb.chapters.filter((chapter) => chapter.projectId === resolvedProjectId)
        : mockDb.chapters
    })
  }

  const response = await apiClient.get<ApiChapterResponse[]>('/chapters', {
    query: {
      projectId: resolveProjectId(projectId) ?? undefined,
    },
  })

  return response.map(mapApiChapter)
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
