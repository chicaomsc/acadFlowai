import { useQuery } from '@tanstack/react-query'
import type { ExportFormat } from '@/shared/types/contracts'
import { getAdvisorComments } from '@/shared/services/advisor.service'
import { getAiSuggestions } from '@/shared/services/ai.service'
import { getChapter, getChapters } from '@/shared/services/chapter.service'
import { getDashboardPayload } from '@/shared/services/dashboard.service'
import { getExportStatus } from '@/shared/services/export.service'
import { getProject, getProjectDetails, getProjects } from '@/shared/services/project.service'
import { getReferences } from '@/shared/services/reference.service'
import { getTimelineTasks } from '@/shared/services/timeline.service'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  })
}

export function useProjectDetails(projectId: string) {
  return useQuery({
    queryKey: ['project-details', projectId],
    queryFn: () => getProjectDetails(projectId),
    enabled: Boolean(projectId),
  })
}

export function useChapters(projectId: string) {
  return useQuery({
    queryKey: ['chapters', projectId],
    queryFn: () => getChapters(projectId),
    enabled: Boolean(projectId),
  })
}

export function useChapter(chapterId: string) {
  return useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => getChapter(chapterId),
    enabled: Boolean(chapterId),
  })
}

export function useReferences(projectId?: string, chapterId?: string) {
  return useQuery({
    queryKey: ['references', projectId ?? 'all', chapterId ?? 'all'],
    queryFn: () => getReferences(projectId, chapterId),
  })
}

export function useTimelineTasks(projectId?: string, chapterId?: string) {
  return useQuery({
    queryKey: ['timeline-tasks', projectId ?? 'all', chapterId ?? 'all'],
    queryFn: () => getTimelineTasks(projectId, chapterId),
  })
}

export function useAiSuggestions(projectId?: string, chapterId?: string) {
  return useQuery({
    queryKey: ['ai-suggestions', projectId ?? 'active', chapterId ?? 'all'],
    queryFn: () => getAiSuggestions(projectId, chapterId),
  })
}

export function useAdvisorComments(projectId?: string, chapterId?: string) {
  return useQuery({
    queryKey: ['advisor-comments', projectId ?? 'all', chapterId ?? 'all'],
    queryFn: () => getAdvisorComments(projectId, chapterId),
  })
}

export function useExportStatus(projectId?: string, format: ExportFormat = 'pdf') {
  return useQuery({
    queryKey: ['export-status', projectId ?? 'active', format],
    queryFn: () => getExportStatus(projectId, format),
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardPayload,
  })
}
