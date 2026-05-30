import { getChapterFigures, getProjectFigures } from '@/shared/services/figure.service'

export function chapterFiguresQuery(chapterId: string | null, projectId: string) {
  return {
    queryKey: ['figures', 'chapter', chapterId],
    enabled: Boolean(chapterId),
    queryFn: () => getChapterFigures(chapterId!, projectId),
  }
}

export function projectFiguresQuery(projectId: string) {
  return {
    queryKey: ['figures', 'project', projectId],
    queryFn: () => getProjectFigures(projectId),
  }
}
