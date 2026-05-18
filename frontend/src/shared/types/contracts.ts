export type UserRole = 'student' | 'advisor' | 'admin'
export type UserPlan = 'free' | 'pro' | 'defense' | 'advisor' | 'institution'
export type ProjectStatus = 'planning' | 'writing' | 'review' | 'defense' | 'completed'
export type AcademicNorm = 'ABNT' | 'APA' | 'Vancouver'
export type ChapterStatus = 'not_started' | 'writing' | 'review' | 'approved'
export type ChapterType = 'introduction' | 'theoretical' | 'methodology' | 'results' | 'conclusion' | 'references'
export type ReferenceType = 'article' | 'book' | 'website' | 'dissertation' | 'thesis' | 'other'
export type PDFProcessingStatus = 'uploading' | 'processing' | 'completed' | 'error'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type ExportFormat = 'docx' | 'pdf' | 'slides'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  institution?: string
  course?: string
  role: UserRole
  plan: UserPlan
  createdAt: Date
}

export interface Advisor {
  id: string
  name: string
  email: string
  institution: string
}

export interface Project {
  id: string
  title: string
  subtitle?: string
  course: string
  institution: string
  academicDegree?: string
  advisorId?: string
  norm: AcademicNorm
  deadline: Date
  status: ProjectStatus
  progress: number
  createdAt: Date
  updatedAt: Date
  theme?: string
  researchProblem?: string
  generalObjective?: string
  specificObjectives?: string[]
  defenseCity?: string
  defenseYear?: number
  abstractPt?: string
  abstractEn?: string
  keywords?: string[]
  userId: string
  chapterIds: string[]
  referenceIds: string[]
  timelineTaskIds: string[]
  advisorCommentIds: string[]
}

export interface Chapter {
  id: string
  projectId: string
  title: string
  type: ChapterType
  content: string
  status: ChapterStatus
  order: number
  wordCount: number
  lastEditedAt: Date
}

export interface Reference {
  id: string
  projectId: string
  type: ReferenceType
  authors: string[]
  title: string
  year: number
  doi?: string
  journal?: string
  publisher?: string
  url?: string
  accessDate?: Date
  chapterIds: string[]
  primaryChapterId?: string
  abntFormatted?: string
  hasCitation: boolean
}

export interface TimelineTask {
  id: string
  projectId: string
  chapterId?: string
  title: string
  description?: string
  dueDate?: Date
  priority: TaskPriority
  status: TaskStatus
  order: number
}

export interface ProjectDetailsProject extends Project {
  advisorName?: string
  references: Reference[]
  timelineTasks: TimelineTask[]
  totalReferences: number
  citedReferences: number
  pendingReferences: number
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  exportReady: boolean
  exportProgress: number
  pendingExportItems: string[]
}

export interface ProjectDetailsPayload {
  project: ProjectDetailsProject
  chapters: Chapter[]
}

export interface AdvisorComment {
  id: string
  projectId: string
  chapterId?: string
  advisorId: string
  advisorName: string
  content: string
  createdAt: Date
  resolved: boolean
}

export interface AiSuggestion {
  id: string
  projectId: string
  chapterId?: string
  type: 'improve' | 'academic' | 'references' | 'review' | 'theme' | 'defense'
  title: string
  description: string
  content: string
  createdAt: Date
}

export interface ExportStatus {
  projectId: string
  format: ExportFormat
  ready: boolean
  progress: number
  pendingItems: string[]
  completedItems: string[]
  chapterCoverage: {
    total: number
    completed: number
  }
  referenceCoverage: {
    total: number
    cited: number
  }
}

export interface ChapterVersion {
  id: string
  chapterId: string
  version: number
  content: string
  createdAt: Date
  status: 'pending' | 'approved' | 'needs_revision'
}

export interface AISkill {
  id: string
  name: string
  description: string
  icon: string
  category: 'theme' | 'research' | 'writing' | 'review' | 'defense'
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  skillId?: string
}

export interface PDFDocument {
  id: string
  projectId: string
  fileName: string
  uploadedAt: Date
  status: PDFProcessingStatus
  summary?: string
  objective?: string
  methodology?: string
  mainResults?: string
  limitations?: string
  usefulCitations?: string[]
  howToUse?: string
}

export interface ExportConfig {
  format: ExportFormat
  norm: AcademicNorm
  includeTableOfContents: boolean
  includeReferences: boolean
  includeAppendix: boolean
}

export interface Plan {
  id: string
  name: string
  price: number
  period: 'monthly' | 'yearly'
  features: string[]
  recommended?: boolean
}

export interface WeeklyProgress {
  day: string
  words: number
}

export interface DashboardStats {
  totalProgress: number
  chaptersCompleted: number
  totalChapters: number
  referencesCount: number
  pendingReviews: number
  daysUntilDeadline: number
  weeklyProgress: WeeklyProgress[]
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  read: boolean
  createdAt: Date
}

export type TCCProject = Project
