import { getChapter, getChapters } from '@/shared/services/chapter.service'
import { getProjectDetails } from '@/shared/services/project.service'

export function editorProjectQuery(projectId: string) {
  return {
    queryKey: ['editor-project', projectId],
    queryFn: () => getProjectDetails(projectId),
  }
}

export function chaptersQuery(projectId: string) {
  return {
    queryKey: ['chapters', projectId],
    queryFn: () => getChapters(projectId),
  }
}

export function chapterQuery(chapterId: string | null) {
  return {
    queryKey: ['chapter', chapterId],
    enabled: Boolean(chapterId),
    queryFn: () => getChapter(chapterId!),
  }
}
