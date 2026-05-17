import { mockDb } from '@/shared/mocks/database'
import { resolveProjectId } from '@/shared/services/active-project.service'
import { apiClient } from '@/shared/services/api-client'
import type { AdvisorComment } from '@/shared/types/contracts'

export async function getAdvisorComments(projectId?: string, chapterId?: string): Promise<AdvisorComment[]> {
  return apiClient.get('/advisor-comments', () =>
    mockDb.advisorComments.filter((comment) => {
      const resolvedProjectId = resolveProjectId(projectId)
      const matchesProject = !resolvedProjectId || comment.projectId === resolvedProjectId
      const matchesChapter = !chapterId || comment.chapterId === chapterId
      return matchesProject && matchesChapter
    }),
  )
}
