import type { Chapter, ChapterStatus, ChapterType, Project, ProjectStatus, User, UserPlan, UserRole } from '@/shared/types/contracts'

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
