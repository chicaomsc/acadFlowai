import { beforeEach, describe, expect, it } from 'vitest'
import { editorProjectQuery } from '@/features/editor/services/editor.service'
import { mockDb } from '@/shared/mocks/database'
import { setActiveProjectId } from '@/shared/services/active-project.service'
import { getAdvisorComments } from '@/shared/services/advisor.service'
import { getAiSuggestions } from '@/shared/services/ai.service'
import { updateChapterContent } from '@/shared/services/chapter.service'
import { getDashboardPayload } from '@/shared/services/dashboard.service'
import { getExportStatus } from '@/shared/services/export.service'
import { createReference, deleteReference, getReferences, updateReference } from '@/shared/services/reference.service'
import {
  createTimelineTask,
  deleteTimelineTask,
  getTimelineTasks,
  updateTimelineTask,
  updateTimelineTaskStatus,
} from '@/shared/services/timeline.service'
import { calculateProjectProgress } from '@/shared/utils/domain-logic'

const initialDb = structuredClone(mockDb)

function resetMockDb() {
  Object.assign(mockDb, structuredClone(initialDb))
}

describe('shared mock database integration', () => {
  beforeEach(() => {
    resetMockDb()
    setActiveProjectId('project-1')
  })

  it('dashboard recalcula o progresso a partir dos capítulos reais do projeto', async () => {
    const before = await getDashboardPayload()
    const expectedInitialProgress = calculateProjectProgress(
      mockDb.chapters.filter((chapter) => chapter.projectId === before.activeProject.id),
    )

    expect(before.stats.totalProgress).toBe(expectedInitialProgress)

    await updateChapterContent(
      'chapter-3',
      'A metodologia descreve abordagem, participantes, instrumentos e critérios de análise.',
    )

    const after = await getDashboardPayload()
    const updatedChapter = after.chapters.find((chapter) => chapter.id === 'chapter-3')

    expect(updatedChapter?.status).toBe('writing')
    expect(updatedChapter?.wordCount).toBeGreaterThan(0)
    expect(after.stats.totalProgress).toBeGreaterThan(before.stats.totalProgress)
  })

  it('editor abre o projeto com os capítulos vinculados na ordem correta', async () => {
    const payload = await editorProjectQuery('project-1').queryFn()

    expect(payload).not.toBeNull()
    expect(payload?.project.id).toBe('project-1')
    expect(payload?.chapters.map((chapter) => chapter.id)).toEqual(mockDb.projects[0].chapterIds)
    expect(payload?.chapters[1].title).toBe('Fundamentação Teórica')
  })

  it('referências, cronograma, comentários e IA usam o mesmo contexto de projeto e capítulo', async () => {
    const [references, tasks, comments, suggestions] = await Promise.all([
      getReferences('project-1', 'chapter-2'),
      getTimelineTasks('project-1', 'chapter-2'),
      getAdvisorComments('project-1', 'chapter-1'),
      getAiSuggestions('project-1', 'chapter-2'),
    ])

    expect(references.map((reference) => reference.id)).toEqual(['reference-1', 'reference-2'])
    expect(references.every((reference) => reference.chapterIds.includes('chapter-2'))).toBe(true)

    expect(tasks.length).toBe(1)
    expect(tasks[0].chapterId).toBe('chapter-2')

    expect(comments.length).toBeGreaterThan(0)
    expect(comments.every((comment) => comment.chapterId === 'chapter-1')).toBe(true)

    expect(suggestions.length).toBeGreaterThan(0)
    expect(
      suggestions.every(
        (suggestion) =>
          suggestion.projectId === 'project-1' &&
          (suggestion.chapterId === 'chapter-2' || suggestion.chapterId === undefined),
      ),
    ).toBe(true)
  })

  it('exportação valida pendências reais do projeto compartilhado', async () => {
    const status = await getExportStatus('project-1', 'pdf')

    expect(status).not.toBeNull()
    expect(status?.ready).toBe(false)
    expect(status?.referenceCoverage.total).toBe(3)
    expect(status?.referenceCoverage.cited).toBe(2)
    expect(status?.pendingItems).toContain('Existem referências cadastradas sem citação no texto.')
    expect(status?.pendingItems).toContain('O cronograma ainda possui tarefas prioritárias em aberto.')
  })

  it('referências permitem criar, editar, excluir e associar capítulo no mock central', async () => {
    const created = await createReference({
      title: 'Avaliação de plataformas acadêmicas com IA',
      authors: ['SILVA, M.', 'COSTA, F.'],
      type: 'article',
      year: 2025,
      chapterId: 'chapter-3',
    })

    expect(created.projectId).toBe('project-1')
    expect(created.primaryChapterId).toBe('chapter-3')
    expect(created.chapterIds).toEqual(['chapter-3'])
    expect(mockDb.projects[0]?.referenceIds).toContain(created.id)

    const projectReferencesAfterCreate = await getReferences()
    expect(projectReferencesAfterCreate.some((reference) => reference.id === created.id)).toBe(true)

    const updated = await updateReference(created.id, {
      title: 'Avaliação comparativa de plataformas acadêmicas com IA',
      authors: ['SILVA, M.'],
      type: 'article',
      year: 2026,
      chapterId: 'chapter-4',
    })

    expect(updated?.title).toContain('comparativa')
    expect(updated?.primaryChapterId).toBe('chapter-4')
    expect(updated?.chapterIds).toEqual(['chapter-4'])

    const chapterReferences = await getReferences('project-1', 'chapter-4')
    expect(chapterReferences.some((reference) => reference.id === created.id)).toBe(true)

    const removed = await deleteReference(created.id)
    expect(removed).toBe(true)
    expect(mockDb.references.some((reference) => reference.id === created.id)).toBe(false)
    expect(mockDb.projects[0]?.referenceIds).not.toContain(created.id)
  })

  it('cronograma permite criar, editar, mover e excluir tarefas no mock central', async () => {
    const beforeDashboard = await getDashboardPayload()
    const initialTaskCount = beforeDashboard.timelineTasks.length

    const created = await createTimelineTask(
      {
        title: 'Organizar cronograma de leitura',
        chapterId: 'chapter-2',
        dueDate: '2025-05-01',
        priority: 'high',
      },
      'project-1',
    )

    const afterCreateTasks = await getTimelineTasks('project-1')
    const afterCreateDashboard = await getDashboardPayload()

    expect(created.projectId).toBe('project-1')
    expect(created.chapterId).toBe('chapter-2')
    expect(afterCreateTasks.some((task) => task.id === created.id)).toBe(true)
    expect(afterCreateDashboard.timelineTasks.length).toBe(initialTaskCount + 1)
    expect(afterCreateDashboard.timelineTasks.some((task) => task.id === created.id)).toBe(true)

    const updated = await updateTimelineTask(
      created.id,
      {
        title: 'Organizar leitura crítica',
        chapterId: 'chapter-3',
        dueDate: '2025-05-10',
        priority: 'medium',
      },
      'project-1',
    )

    expect(updated?.title).toBe('Organizar leitura crítica')
    expect(updated?.chapterId).toBe('chapter-3')
    expect(updated?.priority).toBe('medium')

    const moved = await updateTimelineTaskStatus(created.id, 'completed', 'project-1')
    expect(moved?.status).toBe('completed')

    const deleted = await deleteTimelineTask(created.id, 'project-1')
    expect(deleted).toBe(true)

    const afterDeleteTasks = await getTimelineTasks('project-1')
    const afterDeleteDashboard = await getDashboardPayload()

    expect(afterDeleteTasks.some((task) => task.id === created.id)).toBe(false)
    expect(afterDeleteDashboard.timelineTasks.some((task) => task.id === created.id)).toBe(false)
    expect(mockDb.projects[0]?.timelineTaskIds).not.toContain(created.id)
  })
})
