import type { Chapter, TimelineTask } from '@/shared/types/contracts'

export function buildDerivedTimelineTasks(projectId: string, chapters: Chapter[]): TimelineTask[] {
  return chapters
    .filter((chapter) => chapter.status !== 'approved')
    .map((chapter, index) => ({
      id: `chapter-task-${chapter.id}`,
      projectId,
      chapterId: chapter.id,
      title:
        chapter.status === 'not_started'
          ? `Iniciar ${chapter.title}`
          : `Avançar ${chapter.title}`,
      description:
        chapter.status === 'review'
          ? 'Revisar e consolidar a versão atual deste capítulo.'
          : 'Continue a escrita deste capítulo até a próxima meta.',
      dueDate: undefined,
      priority: index < 2 ? 'high' : 'medium',
      status: chapter.status === 'review' ? 'in_progress' : chapter.status === 'writing' ? 'in_progress' : 'todo',
      order: index + 1,
    }))
}
