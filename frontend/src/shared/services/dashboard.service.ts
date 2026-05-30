import { mockDb } from '@/shared/mocks/database'
import { getActiveProjectId, setActiveProjectId } from '@/shared/services/active-project.service'
import { apiClient } from '@/shared/services/api-client'
import { getAuthenticatedUser } from '@/shared/services/auth.service'
import { buildDerivedTimelineTasks } from '@/shared/services/project-helpers'
import { getProjectDetails, getProjects } from '@/shared/services/project.service'
import { getProject } from '@/shared/services/project.service'
import type { AdvisorComment, Chapter, DashboardStats, Notification, Project, TimelineTask, User } from '@/shared/types/contracts'
import { calculateProjectStats } from '@/shared/utils/domain-logic'

export interface DashboardPayload {
  user: User
  stats: DashboardStats
  activeProject: Project & { advisorName?: string }
  chapters: Chapter[]
  advisorComments: AdvisorComment[]
  timelineTasks: TimelineTask[]
  notifications: Notification[]
}

function createEmptyProject(): Project & { advisorName?: string } {
  const now = new Date()

  return {
    id: '',
    title: '',
    course: '',
    institution: '',
    norm: 'ABNT',
    templateProfile: 'ABNT_GENERIC',
    deadline: now,
    status: 'planning',
    progress: 0,
    createdAt: now,
    updatedAt: now,
    theme: '',
    researchProblem: '',
    generalObjective: '',
    specificObjectives: [],
    userId: '',
    chapterIds: [],
    referenceIds: [],
    timelineTaskIds: [],
    advisorCommentIds: [],
  }
}

export async function getDashboardPayload(): Promise<DashboardPayload> {
  if (!apiClient.isConfigured()) {
    const activeProjectId = getActiveProjectId() ?? mockDb.projects[0]?.id
    if (!activeProjectId) {
      throw new Error('Nenhum projeto disponível')
    }

    const activeProject = await getProject(activeProjectId)
    if (!activeProject) {
      throw new Error('Projeto ativo não encontrado')
    }

    const chapters = mockDb.chapters.filter((chapter) => chapter.projectId === activeProject.id)
    const timelineTasks = mockDb.timelineTasks.filter((task) => task.projectId === activeProject.id)

    return apiClient.get('/dashboard', {
      fallback: async () => ({
        user: mockDb.users[0],
        stats: calculateProjectStats(
          activeProject,
          chapters,
          [],
          timelineTasks,
          mockDb.weeklyProgressByProject[activeProject.id] ?? [],
        ),
        activeProject,
        chapters,
        advisorComments: [],
        timelineTasks,
        notifications: mockDb.notifications,
      }),
    })
  }

  const projects = await getProjects()
  const activeProjectId = getActiveProjectId()
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null

  if (!activeProject) {
    return {
      user: getAuthenticatedUser() ?? mockDb.users[0],
      stats: {
        totalProgress: 0,
        chaptersCompleted: 0,
        totalChapters: 0,
        referencesCount: 0,
        pendingReviews: 0,
        daysUntilDeadline: 0,
        weeklyProgress: [
          { day: 'Seg', words: 0 },
          { day: 'Ter', words: 0 },
          { day: 'Qua', words: 0 },
          { day: 'Qui', words: 0 },
          { day: 'Sex', words: 0 },
          { day: 'Sáb', words: 0 },
          { day: 'Dom', words: 0 },
        ],
      },
      activeProject: createEmptyProject(),
      chapters: [],
      advisorComments: [],
      timelineTasks: [],
      notifications: mockDb.notifications,
    }
  }

  setActiveProjectId(activeProject.id)
  const details = await getProjectDetails(activeProject.id)
  if (!details) {
    throw new Error('Projeto ativo não encontrado')
  }

  const timelineTasks = buildDerivedTimelineTasks(activeProject.id, details.chapters)

  return {
    user: getAuthenticatedUser() ?? mockDb.users[0],
    stats: calculateProjectStats(
      activeProject,
      details.chapters,
      [],
      timelineTasks,
      mockDb.weeklyProgressByProject[activeProject.id] ?? [
        { day: 'Seg', words: 0 },
        { day: 'Ter', words: 0 },
        { day: 'Qua', words: 0 },
        { day: 'Qui', words: 0 },
        { day: 'Sex', words: 0 },
        { day: 'Sáb', words: 0 },
        { day: 'Dom', words: 0 },
      ],
    ),
    activeProject,
    chapters: details.chapters,
    advisorComments: [],
    timelineTasks,
    notifications: mockDb.notifications,
  }
}
