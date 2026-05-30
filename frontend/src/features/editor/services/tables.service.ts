import { getChapterTabularElements, getProjectTabularElements } from '@/shared/services/table.service'

export function chapterTabularElementsQuery(chapterId: string | null, projectId: string) {
  return {
    queryKey: ['tabular-elements', 'chapter', chapterId],
    enabled: Boolean(chapterId),
    queryFn: () => getChapterTabularElements(chapterId!, projectId),
  }
}

export function projectTabularElementsQuery(projectId: string) {
  return {
    queryKey: ['tabular-elements', 'project', projectId],
    queryFn: () => getProjectTabularElements(projectId),
  }
}
