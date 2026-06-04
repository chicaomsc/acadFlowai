import type {
  Chapter,
  DashboardStats,
  ExportFormat,
  ExportStatus,
  Project,
  Reference,
  TimelineTask,
  WeeklyProgress,
} from '@/shared/types/contracts'

const chapterWeights = {
  not_started: 0,
  writing: 0.55,
  review: 0.85,
  approved: 1,
} as const

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

export function calculateProjectProgress(chapters: Chapter[]): number {
  const mainChapters = chapters.filter((chapter) => (chapter.level ?? 1) === 1)
  if (mainChapters.length === 0) return 0
  const total = mainChapters.reduce((sum, chapter) => sum + chapterWeights[chapter.status], 0)
  return Math.round((total / mainChapters.length) * 100)
}

export function calculateProjectStats(
  project: Project,
  chapters: Chapter[],
  references: Reference[],
  _tasks: TimelineTask[],
  weeklyProgress: WeeklyProgress[],
): DashboardStats {
  const mainChapters = chapters.filter((chapter) => (chapter.level ?? 1) === 1)
  const pendingReviews = mainChapters.filter((chapter) => chapter.status === 'review').length
  const chaptersCompleted = mainChapters.filter((chapter) => chapter.status === 'approved').length
  const daysUntilDeadline = Math.max(
    0,
    Math.ceil((project.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  )

  return {
    totalProgress: calculateProjectProgress(mainChapters),
    chaptersCompleted,
    totalChapters: mainChapters.length,
    referencesCount: references.length,
    pendingReviews,
    daysUntilDeadline,
    weeklyProgress,
  }
}

export function validateExportStatus(
  project: Project,
  chapters: Chapter[],
  references: Reference[],
  tasks: TimelineTask[],
  format: ExportFormat,
): ExportStatus {
  const mainChapters = chapters.filter((chapter) => (chapter.level ?? 1) === 1)
  const completedChapters = mainChapters.filter(
    (chapter) => chapter.status === 'approved' || chapter.status === 'review',
  )
  const citedReferences = references.filter((reference) => reference.hasCitation)
  const pendingItems: string[] = []

  if (completedChapters.length < mainChapters.length) {
    pendingItems.push('Há capítulos ainda sem desenvolvimento final.')
  }

  if (citedReferences.length < references.length) {
    pendingItems.push('Existem referências cadastradas sem citação no texto.')
  }

  if (tasks.some((task) => task.priority === 'high' && task.status !== 'completed')) {
    pendingItems.push('O cronograma ainda possui tarefas prioritárias em aberto.')
  }

  if (format === 'slides' && completedChapters.length < Math.max(1, mainChapters.length - 1)) {
    pendingItems.push('Os slides pedem mais capítulos consolidados antes da defesa.')
  }

  const completedItems = [
    completedChapters.length >= Math.max(1, mainChapters.length - 2) ? 'Estrutura principal do projeto consolidada.' : null,
    citedReferences.length > 0 ? 'Base bibliográfica vinculada ao texto.' : null,
    project.norm === 'ABNT' ? 'Norma acadêmica definida para exportação.' : null,
  ].filter(Boolean) as string[]

  const progress = Math.max(
    0,
    Math.min(
      100,
      Math.round(
          ((completedChapters.length / Math.max(mainChapters.length, 1)) * 0.6 +
            (citedReferences.length / Math.max(references.length, 1)) * 0.25 +
            (tasks.filter((task) => task.status === 'completed').length / Math.max(tasks.length, 1)) * 0.15) *
          100,
      ),
    ),
  )

  return {
    projectId: project.id,
    format,
    ready: pendingItems.length === 0,
    progress,
    pendingItems,
    completedItems,
    chapterCoverage: {
      total: mainChapters.length,
      completed: completedChapters.length,
    },
    referenceCoverage: {
      total: references.length,
      cited: citedReferences.length,
    },
  }
}
