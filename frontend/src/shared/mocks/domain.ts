import { mockDb } from '@/shared/mocks/database'
import { calculateProjectProgress, calculateProjectStats } from '@/shared/utils/domain-logic'

export const currentUser = mockDb.users[0]
export const projects = mockDb.projects.map((project) => ({
  ...project,
  advisor: mockDb.advisors.find((advisor) => advisor.id === project.advisorId),
  progress: calculateProjectProgress(
    mockDb.chapters.filter((chapter) => chapter.projectId === project.id),
  ),
}))
export const chapters = mockDb.chapters
export const references = mockDb.references
export const pdfDocuments = mockDb.pdfDocuments
export const timelineTasks = mockDb.timelineTasks
export const advisorComments = mockDb.advisorComments
export const aiSkills = mockDb.aiSkills
export const plans = mockDb.plans
export const notifications = mockDb.notifications
export const dashboardStats = calculateProjectStats(
  projects[0],
  mockDb.chapters.filter((chapter) => chapter.projectId === projects[0]?.id),
  mockDb.references.filter((reference) => reference.projectId === projects[0]?.id),
  mockDb.timelineTasks.filter((task) => task.projectId === projects[0]?.id),
  mockDb.weeklyProgressByProject[projects[0]?.id] ?? [],
)
