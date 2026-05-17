import { mockDb } from '@/shared/mocks/database'
import { setActiveProjectId } from '@/shared/services/active-project.service'
import { mapApiChapter, mapApiProject, type ApiProjectDetailResponse, type ApiProjectResponse } from '@/shared/services/api-mappers'
import { apiClient } from '@/shared/services/api-client'
import { buildDerivedTimelineTasks } from '@/shared/services/project-helpers'
import type {
  Advisor,
  Chapter,
  ChapterType,
  Project,
  TimelineTask,
} from '@/shared/types/contracts'
import { calculateProjectProgress } from '@/shared/utils/domain-logic'

export interface ProjectDetailsPayload {
  project: Project & { advisorName?: string }
  chapters: Chapter[]
  references: []
  tasks: ReturnType<typeof buildDerivedTimelineTasks>
  comments: []
}

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

      return {
        project: hydrateProject(project),
        chapters: mockDb.chapters.filter((chapter) => chapter.projectId === projectId),
        references: [],
        tasks: buildDerivedTimelineTasks(
          projectId,
          mockDb.chapters.filter((chapter) => chapter.projectId === projectId),
        ),
        comments: [],
      }
    })
  }

  const response = await apiClient.get<ApiProjectDetailResponse>(`/projects/${projectId}/details`)
  const project = mapApiProject(response)
  const chapters = response.chapters.map(mapApiChapter)

  return {
    project: {
      ...project,
      chapterIds: chapters.map((chapter) => chapter.id),
    },
    chapters,
    references: [],
    tasks: buildDerivedTimelineTasks(project.id, chapters),
    comments: [],
  }
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
        project: hydrateProject(project),
        chapters,
        references: [],
        tasks,
        comments: [],
      }
    })
  }

  const response = await apiClient.post<ApiProjectDetailResponse>('/projects', {
    body: {
      title: input.title.trim() || 'Novo projeto de TCC',
      subtitle: input.subtitle?.trim() || null,
      course: input.course.trim() || 'Curso não informado',
      institution: input.institution.trim() || 'Instituição não informada',
      academicDegree: input.academicDegree?.trim() || null,
      advisorName: input.advisorName?.trim() || null,
      deadline: input.deadline || null,
      norm: input.norm,
      theme: input.theme.trim() || null,
      researchProblem: input.researchProblem.trim() || null,
      generalObjective: input.generalObjective.trim() || null,
      specificObjectives: input.specificObjectives.map((item) => item.trim()).filter(Boolean).join('\n'),
      defenseCity: input.defenseCity?.trim() || null,
      defenseYear: input.defenseYear ?? null,
      abstractPt: input.abstractPt?.trim() || null,
      abstractEn: input.abstractEn?.trim() || null,
      keywords: input.keywords?.map((item) => item.trim()).filter(Boolean).join('; ') || null,
    },
  })

  const project = mapApiProject(response)
  const chapters = response.chapters.map(mapApiChapter)
  setActiveProjectId(project.id)

  return {
    project: {
      ...project,
      chapterIds: chapters.map((chapter) => chapter.id),
    },
    chapters,
    references: [],
    tasks: buildDerivedTimelineTasks(project.id, chapters),
    comments: [],
  }
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
    body: {
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      course: input.course.trim(),
      institution: input.institution.trim(),
      academicDegree: input.academicDegree?.trim() || null,
      advisorName: input.advisorName?.trim() || null,
      deadline: input.deadline || null,
      norm: input.norm,
      theme: input.theme?.trim() || null,
      researchProblem: input.researchProblem?.trim() || null,
      generalObjective: input.generalObjective?.trim() || null,
      specificObjectives: input.specificObjectives?.map((item) => item.trim()).filter(Boolean).join('\n') || null,
      defenseCity: input.defenseCity?.trim() || null,
      defenseYear: input.defenseYear ?? null,
      abstractPt: input.abstractPt?.trim() || null,
      abstractEn: input.abstractEn?.trim() || null,
      keywords: input.keywords?.map((item) => item.trim()).filter(Boolean).join('; ') || null,
    },
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
