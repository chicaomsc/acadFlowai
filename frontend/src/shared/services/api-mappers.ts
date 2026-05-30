import type {
  Chapter,
  ChapterStatus,
  ChapterType,
  Project,
  ProjectDetailsPayload,
  ProjectDetailsProject,
  ProjectStatus,
  Reference,
  TimelineTask,
  User,
  UserPlan,
  UserRole,
} from '@/shared/types/contracts'

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

export interface ApiUserResponse {
  id: string
  name: string
  email: string
  role?: string | null
  plan?: string | null
  institution?: string | null
  course?: string | null
  createdAt: string | null
}

export interface ApiAuthResponse {
  token: string
  user: ApiUserResponse
}

export interface ApiChapterResponse {
  id: string
  projectId: string
  title: string
  type: string
  content: string | null
  status: string
  orderIndex: number
  wordCount: number
  targetWordCount: number
  lastEditedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiProjectResponse {
  id: string
  title: string
  subtitle?: string | null
  course: string
  institution: string
  academicDegree?: string | null
  advisorName?: string | null
  norm: string
  templateProfile?: string | null
  deadline?: string | null
  theme?: string | null
  researchProblem?: string | null
  generalObjective?: string | null
  specificObjectives?: string | null
  defenseCity?: string | null
  defenseYear?: number | string | null
  abstractPt?: string | null
  abstractEn?: string | null
  keywords?: string | null
  status: string
  progress: number
  totalChapters: number
  completedChapters: number
  createdAt: string
  updatedAt: string
}

export interface ApiProjectDetailResponse extends ApiProjectResponse {
  chapters: ApiChapterResponse[]
  references?: ApiReferenceResponse[] | null
  timelineTasks?: ApiTimelineTaskResponse[] | null
  totalReferences?: number | null
  citedReferences?: number | null
  pendingReferences?: number | null
  totalTasks?: number | null
  completedTasks?: number | null
  pendingTasks?: number | null
  exportReady?: boolean | null
  exportProgress?: number | null
  pendingExportItems?: string[] | null
}

export interface ApiReferenceResponse {
  id: string
  projectId: string
  primaryChapterId: string | null
  title: string
  authors: string
  type: string
  year: number
  journal?: string | null
  publisher?: string | null
  doi?: string | null
  url?: string | null
  accessDate?: string | null
  abntFormatted: string
  hasCitation: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export interface ApiTimelineTaskResponse {
  id: string
  projectId: string
  chapterId: string | null
  title: string
  description: string | null
  dueDate: string | null
  priority: string
  status: string
  orderIndex: number
  createdAt?: string | null
  updatedAt?: string | null
}

function normalizeUserRole(role?: string | null): UserRole {
  switch ((role ?? 'STUDENT').toUpperCase()) {
    case 'ADVISOR':
      return 'advisor'
    case 'ADMIN':
      return 'admin'
    default:
      return 'student'
  }
}

function normalizeUserPlan(plan?: string | null): UserPlan {
  switch ((plan ?? 'FREE').toUpperCase()) {
    case 'PRO':
      return 'pro'
    default:
      return 'free'
  }
}

function normalizeProjectStatus(status: string, progress: number): ProjectStatus {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'completed'
    case 'ON_HOLD':
      return 'planning'
    case 'IN_PROGRESS':
    default:
      return progress > 0 ? 'writing' : 'planning'
  }
}

function normalizeChapterType(type: string): ChapterType {
  switch (type.toUpperCase()) {
    case 'THEORETICAL_FOUNDATION':
      return 'theoretical'
    case 'METHODOLOGY':
      return 'methodology'
    case 'RESULTS':
      return 'results'
    case 'CONCLUSION':
      return 'conclusion'
    case 'REFERENCES':
      return 'references'
    case 'INTRODUCTION':
    default:
      return 'introduction'
  }
}

function normalizeChapterStatus(status: string): ChapterStatus {
  switch (status.toUpperCase()) {
    case 'WRITING':
      return 'writing'
    case 'REVIEW':
      return 'review'
    case 'APPROVED':
      return 'approved'
    case 'NOT_STARTED':
    default:
      return 'not_started'
  }
}

function parseSpecificObjectives(value?: string | null) {
  if (!value) return []

  return value
    .split(/\r?\n|;\s*/)
    .map((item) => item.replace(/^\d+[.)-]?\s*/, '').trim())
    .filter(Boolean)
}

function parseKeywords(value?: string | null) {
  if (!value) return []

  return value
    .split(/\r?\n|;\s*|,\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function mapApiUser(user: ApiUserResponse): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    institution: user.institution ?? undefined,
    course: user.course ?? undefined,
    role: normalizeUserRole(user.role),
    plan: normalizeUserPlan(user.plan),
    createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
  }
}

export function mapApiChapter(chapter: ApiChapterResponse): Chapter {
  return {
    id: chapter.id,
    projectId: chapter.projectId,
    title: chapter.title,
    type: normalizeChapterType(chapter.type),
    content: chapter.content ?? '',
    status: normalizeChapterStatus(chapter.status),
    order: chapter.orderIndex,
    wordCount: chapter.wordCount ?? 0,
    lastEditedAt: new Date(chapter.lastEditedAt ?? chapter.updatedAt ?? chapter.createdAt),
  }
}

export function mapApiProject(project: ApiProjectResponse): Project & { advisorName?: string } {
  const chaptersTotal = Math.max(project.totalChapters, 1)
  const completedRatio = Math.min(1, Math.max(0, project.completedChapters / chaptersTotal))

  return {
    id: project.id,
    title: project.title,
    subtitle: project.subtitle ?? '',
    course: project.course,
    institution: project.institution,
    academicDegree: project.academicDegree ?? '',
    norm: project.norm as Project['norm'],
    templateProfile: project.templateProfile === 'FEMAF' ? 'FEMAF' : 'ABNT_GENERIC',
    deadline: new Date(project.deadline ?? project.updatedAt),
    status: normalizeProjectStatus(project.status, project.progress),
    progress: project.progress ?? Math.round(completedRatio * 100),
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    theme: project.theme ?? '',
    researchProblem: project.researchProblem ?? '',
    generalObjective: project.generalObjective ?? '',
    specificObjectives: parseSpecificObjectives(project.specificObjectives),
    defenseCity: project.defenseCity ?? '',
    defenseYear:
      typeof project.defenseYear === 'number'
        ? project.defenseYear
        : project.defenseYear
          ? Number(project.defenseYear)
          : undefined,
    abstractPt: project.abstractPt ?? '',
    abstractEn: project.abstractEn ?? '',
    keywords: parseKeywords(project.keywords),
    userId: '',
    chapterIds: [],
    referenceIds: [],
    timelineTaskIds: [],
    advisorCommentIds: [],
    advisorName: project.advisorName ?? undefined,
  }
}

function mapReferenceTypeFromApi(type: string): Reference['type'] {
  switch (type.toUpperCase()) {
    case 'ARTICLE':
      return 'article'
    case 'BOOK':
      return 'book'
    case 'WEBSITE':
      return 'website'
    case 'OTHER':
      return 'other'
    case 'THESIS':
    default:
      return 'thesis'
  }
}

function mapPriorityFromApi(priority: string): TimelineTask['priority'] {
  switch (priority.toUpperCase()) {
    case 'LOW':
      return 'low'
    case 'HIGH':
      return 'high'
    case 'MEDIUM':
    default:
      return 'medium'
  }
}

function mapStatusFromApi(status: string): TimelineTask['status'] {
  switch (status.toUpperCase()) {
    case 'TODO':
      return 'todo'
    case 'IN_PROGRESS':
      return 'in_progress'
    case 'DONE':
    default:
      return 'completed'
  }
}

function parseAuthors(authors: string) {
  return authors
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function mapApiReference(reference: ApiReferenceResponse): Reference {
  return {
    id: reference.id,
    projectId: reference.projectId,
    type: mapReferenceTypeFromApi(reference.type),
    authors: parseAuthors(reference.authors),
    title: reference.title,
    year: reference.year,
    doi: reference.doi ?? undefined,
    journal: reference.journal ?? undefined,
    publisher: reference.publisher ?? undefined,
    url: reference.url ?? undefined,
    accessDate: reference.accessDate ? new Date(reference.accessDate) : undefined,
    chapterIds: reference.primaryChapterId ? [reference.primaryChapterId] : [],
    primaryChapterId: reference.primaryChapterId ?? undefined,
    abntFormatted: reference.abntFormatted,
    hasCitation: reference.hasCitation,
  }
}

export function mapApiTimelineTask(task: ApiTimelineTaskResponse): TimelineTask {
  return {
    id: task.id,
    projectId: task.projectId,
    chapterId: task.chapterId ?? undefined,
    title: task.title,
    description: task.description ?? undefined,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    priority: mapPriorityFromApi(task.priority),
    status: mapStatusFromApi(task.status),
    order: task.orderIndex,
  }
}

export function mapApiProjectDetails(response: ApiProjectDetailResponse): ProjectDetailsPayload {
  const chapters = response.chapters.map(mapApiChapter)
  const references = (response.references ?? []).map(mapApiReference)
  const timelineTasks = (response.timelineTasks ?? []).map(mapApiTimelineTask)
  const project = mapApiProject(response)

  const detailsProject: ProjectDetailsProject = {
    ...project,
    chapterIds: chapters.map((chapter) => chapter.id),
    referenceIds: references.map((reference) => reference.id),
    timelineTaskIds: timelineTasks.map((task) => task.id),
    references,
    timelineTasks,
    totalReferences: response.totalReferences ?? references.length,
    citedReferences: response.citedReferences ?? references.filter((reference) => reference.hasCitation).length,
    pendingReferences: response.pendingReferences ?? Math.max(0, (response.totalReferences ?? references.length) - (response.citedReferences ?? references.filter((reference) => reference.hasCitation).length)),
    totalTasks: response.totalTasks ?? timelineTasks.length,
    completedTasks: response.completedTasks ?? timelineTasks.filter((task) => task.status === 'completed').length,
    pendingTasks: response.pendingTasks ?? timelineTasks.filter((task) => task.status !== 'completed').length,
    exportReady: response.exportReady ?? false,
    exportProgress: response.exportProgress ?? 0,
    pendingExportItems: response.pendingExportItems ?? [],
  }

  return {
    project: detailsProject,
    chapters,
  }
}
