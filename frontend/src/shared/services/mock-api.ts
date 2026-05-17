import { mockDb } from '@/shared/mocks/database'
import { getAdvisorComments } from '@/shared/services/advisor.service'
import { getAiAssistantPayload } from '@/shared/services/ai.service'
import { getChapters } from '@/shared/services/chapter.service'
import { getCurrentUser } from '@/shared/services/settings.service'
import { getDashboardPayload } from '@/shared/services/dashboard.service'
import { getPlans } from '@/shared/services/billing.service'
import { getPdfReaderPayload } from '@/shared/services/pdf-reader.service'
import { getProjectDetails, getProjects } from '@/shared/services/project.service'
import { getReferences } from '@/shared/services/reference.service'
import { getTimelineTasks } from '@/shared/services/timeline.service'
import type {
  AdvisorComment,
  Chapter,
  PDFDocument,
  Reference,
  TimelineTask,
  User,
} from '@/shared/types/contracts'

export { getDashboardPayload, getProjectDetails, getProjects, getReferences, getPdfReaderPayload, getAiAssistantPayload, getTimelineTasks, getPlans, getCurrentUser }

export async function getAdvisorPayload(): Promise<{
  comments: AdvisorComment[]
  chapters: Chapter[]
}> {
  return {
    comments: await getAdvisorComments(),
    chapters: await getChapters(),
  }
}

export async function getPdfDocuments(): Promise<PDFDocument[]> {
  return mockDb.pdfDocuments
}

export async function getRawReferences(): Promise<Reference[]> {
  return getReferences()
}

export async function getRawTimelineTasks(): Promise<TimelineTask[]> {
  return getTimelineTasks()
}

export async function getRawUser(): Promise<User> {
  return getCurrentUser()
}
