import { mockDb } from '@/shared/mocks/database'
import { setActiveProjectId } from '@/shared/services/active-project.service'
import {
  mapApiProject,
  mapApiProjectDetails,
  type ApiProjectDetailResponse,
  type ApiProjectResponse,
} from '@/shared/services/api-mappers'
import { apiClient } from '@/shared/services/api-client'
import type {
  Advisor,
  Chapter,
  ChapterType,
  Project,
  ProjectDetailsPayload,
  Reference,
  TimelineTask,
} from '@/shared/types/contracts'
import { calculateProjectProgress } from '@/shared/utils/domain-logic'
import { validateExportStatus } from '@/shared/utils/domain-logic'

export type AcademicDegreeValue = 'GRADUACAO' | 'ESPECIALIZACAO' | 'MESTRADO' | 'DOUTORADO'

export const academicDegreeOptions: Array<{ value: AcademicDegreeValue; label: string }> = [
  { value: 'GRADUACAO', label: 'Graduação' },
  { value: 'ESPECIALIZACAO', label: 'Especialização' },
  { value: 'MESTRADO', label: 'Mestrado' },
  { value: 'DOUTORADO', label: 'Doutorado' },
]

export interface CreateProjectInput {
  title: string
  subtitle?: string
  course: string
  institution: string
  academicDegree?: string
  advisorName?: string
  deadline?: string
  norm: Project['norm']
  theme: string
  researchProblem: string
  generalObjective: string
  specificObjectives: string[]
  defenseCity?: string
  defenseYear?: number
  abstractPt?: string
  abstractEn?: string
  keywords?: string[]
}

export interface UpdateProjectInput {
  title: string
  subtitle?: string
  course: string
  institution: string
  academicDegree?: string
  advisorName?: string
  deadline?: string
  norm: Project['norm']
  theme?: string
  researchProblem?: string
  generalObjective?: string
  specificObjectives?: string[]
  defenseCity?: string
  defenseYear?: number
  abstractPt?: string
  abstractEn?: string
  keywords?: string[]
}

function normalizeAcademicDegree(value?: string | null): AcademicDegreeValue | null {
  const normalized = value
    ?.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  if (!normalized) return null

  switch (normalized) {
    case 'GRADUACAO':
    case 'GRADUACAO/BACHARELADO':
    case 'BACHARELADO':
    case 'LICENCIATURA':
      return 'GRADUACAO'
    case 'ESPECIALIZACAO':
    case 'POS-GRADUACAO':
    case 'POS GRADUACAO':
      return 'ESPECIALIZACAO'
    case 'MESTRADO':
      return 'MESTRADO'
    case 'DOUTORADO':
      return 'DOUTORADO'
    default:
      return null
  }
}

export function getAcademicDegreeLabel(value?: string | null) {
  const normalized = normalizeAcademicDegree(value)
  return academicDegreeOptions.find((option) => option.value === normalized)?.label ?? value ?? ''
}

function normalizeDefenseYear(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Number.isFinite(value) ? Math.trunc(value) : null
}

function normalizeDeadline(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeText(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeStringList(values?: string[] | null) {
  return values?.map((item) => item.trim()).filter(Boolean) ?? []
}

function buildProjectApiPayload(input: CreateProjectInput | UpdateProjectInput) {
  const academicDegree = normalizeAcademicDegree(input.academicDegree)

  if (input.academicDegree?.trim() && !academicDegree) {
    throw new Error('Grau acadêmico inválido. Selecione Graduação, Especialização, Mestrado ou Doutorado.')
  }

  return {
    title: input.title.trim(),
    subtitle: normalizeText(input.subtitle),
    course: input.course.trim(),
    institution: input.institution.trim(),
    academicDegree,
    advisorName: normalizeText(input.advisorName),
    deadline: normalizeDeadline(input.deadline),
    norm: input.norm,
    theme: normalizeText(input.theme),
    researchProblem: normalizeText(input.researchProblem),
    generalObjective: normalizeText(input.generalObjective),
    specificObjectives: normalizeStringList(input.specificObjectives).join('\n') || null,
    defenseCity: normalizeText(input.defenseCity),
    defenseYear: normalizeDefenseYear(input.defenseYear),
    abstractPt: normalizeText(input.abstractPt),
    abstractEn: normalizeText(input.abstractEn),
    keywords: normalizeStringList(input.keywords).join('; ') || null,
  }
}

export function isProjectNotFoundError(error: unknown) {
  if (!(error instanceof Error)) return false

  return /não encontrado|not found|moved to trash|lixeira|404/i.test(error.message)
}

const chapterBlueprint: Array<{ title: string; type: ChapterType }> = [
  { title: 'Introdução', type: 'introduction' },
  { title: 'Fundamentação Teórica', type: 'theoretical' },
  { title: 'Metodologia', type: 'methodology' },
  { title: 'Resultados e Discussão', type: 'results' },
  { title: 'Conclusão', type: 'conclusion' },
  { title: 'Referências', type: 'references' },
]

function hydrateProject(project: Project): Project & { advisorName?: string } {
  const advisor = project.advisorId
    ? mockDb.advisors.find((item) => item.id === project.advisorId)
    : undefined

  return {
    ...project,
    advisorName: advisor?.name,
    progress: calculateProjectProgress(
      mockDb.chapters.filter((chapter) => chapter.projectId === project.id),
    ),
  }
}

export async function getProjects(): Promise<(Project & { advisorName?: string })[]> {
  if (!apiClient.isConfigured()) {
    return apiClient.get('/projects', () => mockDb.projects.map(hydrateProject))
  }

  const response = await apiClient.get<ApiProjectResponse[]>('/projects')
  return response.map(mapApiProject)
}

export async function getProject(projectId: string): Promise<(Project & { advisorName?: string }) | null> {
  if (!apiClient.isConfigured()) {
    return apiClient.get(`/projects/${projectId}`, () => {
      const project = mockDb.projects.find((item) => item.id === projectId)
      return project ? hydrateProject(project) : null
    })
  }

  const response = await apiClient.get<ApiProjectResponse>(`/projects/${projectId}`)
  return mapApiProject(response)
}

export async function getProjectDetails(projectId: string): Promise<ProjectDetailsPayload | null> {
  if (!apiClient.isConfigured()) {
    return apiClient.get(`/projects/${projectId}/details`, () => {
      const project = mockDb.projects.find((item) => item.id === projectId)
      if (!project) return null
      const chapters = mockDb.chapters.filter((chapter) => chapter.projectId === projectId)
      const references = mockDb.references.filter((reference) => reference.projectId === projectId)
      const timelineTasks = mockDb.timelineTasks.filter((task) => task.projectId === projectId)
      const exportStatus = validateExportStatus(project, chapters, references, timelineTasks, 'docx')

      return {
        project: {
          ...hydrateProject(project),
          referenceIds: references.map((reference) => reference.id),
          timelineTaskIds: timelineTasks.map((task) => task.id),
          references,
          timelineTasks,
          totalReferences: references.length,
          citedReferences: references.filter((reference) => reference.hasCitation).length,
          pendingReferences: references.filter((reference) => !reference.hasCitation).length,
          totalTasks: timelineTasks.length,
          completedTasks: timelineTasks.filter((task) => task.status === 'completed').length,
          pendingTasks: timelineTasks.filter((task) => task.status !== 'completed').length,
          exportReady: exportStatus.ready,
          exportProgress: exportStatus.progress,
          pendingExportItems: exportStatus.pendingItems,
        },
        chapters,
      }
    })
  }

  const response = await apiClient.get<ApiProjectDetailResponse>(`/projects/${projectId}/details`)
  return mapApiProjectDetails(response)
}

function getNextId(prefix: string, ids: string[]): string {
  const highestId = ids.reduce((highest, id) => {
    const match = id.match(new RegExp(`^${prefix}-(\\d+)$`))
    const numeric = match ? Number(match[1]) : 0
    return Math.max(highest, numeric)
  }, 0)

  return `${prefix}-${highestId + 1}`
}

function createAdvisorIfNeeded(advisorName?: string, institution?: string): Advisor | null {
  if (!advisorName?.trim()) return null

  const existingAdvisor = mockDb.advisors.find(
    (advisor) => advisor.name.trim().toLowerCase() === advisorName.trim().toLowerCase(),
  )

  if (existingAdvisor) {
    return existingAdvisor
  }

  const advisor: Advisor = {
    id: getNextId('advisor', mockDb.advisors.map((item) => item.id)),
    name: advisorName.trim(),
    email: `contato+${Date.now()}@acadflow.local`,
    institution: institution?.trim() || 'Instituição não informada',
  }

  mockDb.advisors.push(advisor)
  return advisor
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDetailsPayload> {
  if (!apiClient.isConfigured()) {
    return apiClient.post('/projects', () => {
      const projectId = getNextId('project', mockDb.projects.map((item) => item.id))
      const advisor = createAdvisorIfNeeded(input.advisorName, input.institution)
      const now = new Date()
      const deadline = input.deadline ? new Date(input.deadline) : new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())

      const chapters: Chapter[] = chapterBlueprint.map((chapter, index) => ({
        id: getNextId('chapter', [
          ...mockDb.chapters.map((item) => item.id),
          ...chapterBlueprint.slice(0, index).map((_, blueprintIndex) => `chapter-${mockDb.chapters.length + blueprintIndex + 1}`),
        ]),
        projectId,
        title: chapter.title,
        type: chapter.type,
        content: '',
        status: 'not_started' as const,
        order: index + 1,
        wordCount: 0,
        lastEditedAt: now,
      }))

      const tasks: TimelineTask[] = chapterBlueprint.slice(0, 5).map((chapter, index) => ({
        id: getNextId('task', [
          ...mockDb.timelineTasks.map((item) => item.id),
          ...chapterBlueprint.slice(0, index).map((_, blueprintIndex) => `task-${mockDb.timelineTasks.length + blueprintIndex + 1}`),
        ]),
        projectId,
        chapterId: chapters[index]?.id,
        title:
          index === 0
            ? 'Validar briefing inicial do TCC'
            : `Desenvolver ${chapter.title}`,
        description:
          index === 0
            ? 'Revisar tema, problema e objetivos antes de iniciar a escrita.'
            : `Abrir a escrita do capítulo ${chapter.title.toLowerCase()}.`,
        dueDate: new Date(deadline.getFullYear(), deadline.getMonth(), Math.max(1, deadline.getDate() - (35 - index * 5))),
        priority: index < 2 ? 'high' : 'medium',
        status: index === 0 ? 'in_progress' as const : 'todo' as const,
        order: index + 1,
      }))

      const project: Project = {
        id: projectId,
        title: input.title.trim() || 'Novo projeto de TCC',
        subtitle: input.subtitle?.trim() || '',
        course: input.course.trim() || 'Curso não informado',
        institution: input.institution.trim() || 'Instituição não informada',
        academicDegree: input.academicDegree?.trim() || '',
        advisorId: advisor?.id,
        norm: input.norm,
        deadline,
        status: 'planning',
        progress: 0,
        createdAt: now,
        updatedAt: now,
        theme: input.theme.trim(),
        researchProblem: input.researchProblem.trim(),
        generalObjective: input.generalObjective.trim(),
        specificObjectives: input.specificObjectives.map((item) => item.trim()).filter(Boolean),
        defenseCity: input.defenseCity?.trim() || '',
        defenseYear: input.defenseYear,
        abstractPt: input.abstractPt?.trim() || '',
        abstractEn: input.abstractEn?.trim() || '',
        keywords: input.keywords?.map((item) => item.trim()).filter(Boolean) ?? [],
        userId: mockDb.users[0]?.id ?? 'user-1',
        chapterIds: chapters.map((chapter) => chapter.id),
        referenceIds: [],
        timelineTaskIds: tasks.map((task) => task.id),
        advisorCommentIds: [],
      }

      mockDb.projects.unshift(project)
      mockDb.chapters.push(...chapters)
      mockDb.timelineTasks.push(...tasks)
      mockDb.weeklyProgressByProject[projectId] = [
        { day: 'Seg', words: 0 },
        { day: 'Ter', words: 0 },
        { day: 'Qua', words: 0 },
        { day: 'Qui', words: 0 },
        { day: 'Sex', words: 0 },
        { day: 'Sáb', words: 0 },
        { day: 'Dom', words: 0 },
      ]
      mockDb.aiSuggestions.push({
        id: getNextId('ai-suggestion', mockDb.aiSuggestions.map((item) => item.id)),
        projectId,
        type: 'theme',
        title: 'Comece delimitando o recorte do trabalho',
        description: 'Use o tema e o problema definidos no wizard para abrir a introdução com foco.',
        content: 'Explique contexto, justificativa e escopo antes de aprofundar a fundamentação teórica.',
        createdAt: now,
      })

      setActiveProjectId(projectId)

      return {
        project: {
          ...hydrateProject(project),
          references: [] as Reference[],
          timelineTasks: tasks,
          totalReferences: 0,
          citedReferences: 0,
          pendingReferences: 0,
          totalTasks: tasks.length,
          completedTasks: tasks.filter((task) => task.status === 'completed').length,
          pendingTasks: tasks.filter((task) => task.status !== 'completed').length,
          exportReady: false,
          exportProgress: 0,
          pendingExportItems: [],
        },
        chapters,
      }
    })
  }

  const response = await apiClient.post<ApiProjectDetailResponse>('/projects', {
    body: {
      ...buildProjectApiPayload(input),
      title: input.title.trim() || 'Novo projeto de TCC',
      course: input.course.trim() || 'Curso não informado',
      institution: input.institution.trim() || 'Instituição não informada',
    },
  })

  const payload = mapApiProjectDetails(response)
  setActiveProjectId(payload.project.id)
  return payload
}

export async function updateProject(projectId: string, input: UpdateProjectInput) {
  if (!apiClient.isConfigured()) {
    return apiClient.patch(`/projects/${projectId}`, () => {
      const project = mockDb.projects.find((item) => item.id === projectId)
      if (!project) {
        throw new Error('Projeto não encontrado.')
      }

      const advisor = createAdvisorIfNeeded(input.advisorName, input.institution)

      project.title = input.title.trim() || project.title
      project.subtitle = input.subtitle?.trim() ?? project.subtitle
      project.course = input.course.trim() || project.course
      project.institution = input.institution.trim() || project.institution
      project.academicDegree = input.academicDegree?.trim() ?? project.academicDegree
      project.advisorId = advisor?.id
      project.deadline = input.deadline ? new Date(input.deadline) : project.deadline
      project.norm = input.norm
      project.theme = input.theme?.trim() ?? project.theme
      project.researchProblem = input.researchProblem?.trim() ?? project.researchProblem
      project.generalObjective = input.generalObjective?.trim() ?? project.generalObjective
      project.specificObjectives = input.specificObjectives?.map((item) => item.trim()).filter(Boolean) ?? project.specificObjectives
      project.defenseCity = input.defenseCity?.trim() ?? project.defenseCity
      project.defenseYear = input.defenseYear ?? project.defenseYear
      project.abstractPt = input.abstractPt?.trim() ?? project.abstractPt
      project.abstractEn = input.abstractEn?.trim() ?? project.abstractEn
      project.keywords = input.keywords?.map((item) => item.trim()).filter(Boolean) ?? project.keywords
      project.updatedAt = new Date()

      return hydrateProject(project)
    })
  }

  const response = await apiClient.patch<ApiProjectResponse>(`/projects/${projectId}`, {
    body: buildProjectApiPayload(input),
  })

  return mapApiProject(response)
}

export async function archiveProject(projectId: string) {
  if (!apiClient.isConfigured()) {
    return apiClient.delete(`/projects/${projectId}`, () => {
      const projectIndex = mockDb.projects.findIndex((item) => item.id === projectId)
      if (projectIndex === -1) return true

      mockDb.projects.splice(projectIndex, 1)
      mockDb.chapters = mockDb.chapters.filter((chapter) => chapter.projectId !== projectId)
      mockDb.timelineTasks = mockDb.timelineTasks.filter((task) => task.projectId !== projectId)
      mockDb.references = mockDb.references.filter((reference) => reference.projectId !== projectId)
      delete mockDb.weeklyProgressByProject[projectId]

      return true
    })
  }

  await apiClient.delete(`/projects/${projectId}`)

  return true
}
