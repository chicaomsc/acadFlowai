import { mockDb } from '@/shared/mocks/database'
import { resolveProjectId } from '@/shared/services/active-project.service'
import { apiClient } from '@/shared/services/api-client'
import type { AISkill, AiSuggestion } from '@/shared/types/contracts'

export interface AiAssistantPayload {
  skills: AISkill[]
  suggestedPrompts: string[]
}

export async function getAiAssistantPayload(): Promise<AiAssistantPayload> {
  return apiClient.get('/ai-assistant', () => ({
    skills: mockDb.aiSkills,
    suggestedPrompts: [
      'Sugira um tema mais delimitado para IA na educação superior.',
      'Revise este objetivo geral com linguagem mais acadêmica.',
      'Monte uma sequência de capítulos para uma pesquisa qualitativa.',
    ],
  }))
}

export async function getAiSuggestions(projectId?: string, chapterId?: string): Promise<AiSuggestion[]> {
  return apiClient.get('/ai-suggestions', () =>
    mockDb.aiSuggestions.filter((suggestion) => {
      const resolvedProjectId = resolveProjectId(projectId)
      const matchesProject = !resolvedProjectId || suggestion.projectId === resolvedProjectId
      const matchesChapter = !chapterId || suggestion.chapterId === chapterId || !suggestion.chapterId
      return matchesProject && matchesChapter
    }),
  )
}
