import { getChapterCitations, getProjectCitations } from '@/shared/services/citation.service'

export function chapterCitationsQuery(chapterId: string | null) {
  return {
    queryKey: ['citations', 'chapter', chapterId],
    enabled: Boolean(chapterId),
    queryFn: () => getChapterCitations(chapterId!),
  }
}

export function projectCitationsQuery(projectId: string) {
  return {
    queryKey: ['citations', 'project', projectId],
    queryFn: () => getProjectCitations(projectId),
  }
}
