import { mockDb } from '@/shared/mocks/database'
import { resolveProjectId } from '@/shared/services/active-project.service'
import { apiClient } from '@/shared/services/api-client'
import type { TimelineTask } from '@/shared/types/contracts'

export interface TimelineTaskInput {
  title: string
  chapterId?: string
  dueDate?: string
  priority: TimelineTask['priority']
}

interface ApiTimelineTaskResponse {
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

function mapPriorityToApi(priority: TimelineTask['priority']) {
  switch (priority) {
    case 'low':
      return 'LOW'
    case 'high':
      return 'HIGH'
    case 'medium':
    default:
      return 'MEDIUM'
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

function mapStatusToApi(status: TimelineTask['status']) {
  switch (status) {
    case 'todo':
      return 'TODO'
    case 'in_progress':
      return 'IN_PROGRESS'
    case 'completed':
    default:
      return 'DONE'
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

function mapApiTimelineTask(task: ApiTimelineTaskResponse): TimelineTask {
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

function getNextTaskId() {
  const highestId = mockDb.timelineTasks.reduce((highest, task) => {
    const match = task.id.match(/^task-(\d+)$/)
    const numeric = match ? Number(match[1]) : 0
    return Math.max(highest, numeric)
  }, 0)

  return `task-${highestId + 1}`
}

function getNextTaskOrder(projectId: string) {
  return (
    mockDb.timelineTasks
      .filter((task) => task.projectId === projectId)
      .reduce((highest, task) => Math.max(highest, task.order), 0) + 1
  )
}

function updateProjectTaskLinks(projectId: string) {
  const project = mockDb.projects.find((item) => item.id === projectId)
  if (project) {
    project.updatedAt = new Date()
  }
}

export async function getTimelineTasks(projectId?: string, chapterId?: string): Promise<TimelineTask[]> {
  const resolvedProjectId = resolveProjectId(projectId)

  if (!apiClient.isConfigured()) {
    return structuredClone(
      mockDb.timelineTasks.filter((task) => {
        const matchesProject = !resolvedProjectId || task.projectId === resolvedProjectId
        const matchesChapter = !chapterId || task.chapterId === chapterId
        return matchesProject && matchesChapter
      }),
    )
  }

  if (!resolvedProjectId) {
    return []
  }

  const response = await apiClient.get<ApiTimelineTaskResponse[]>('/timeline-tasks', {
    query: {
      projectId: resolvedProjectId,
    },
  })

  return response
    .map(mapApiTimelineTask)
    .filter((task) => {
      const matchesProject = !resolvedProjectId || task.projectId === resolvedProjectId
      const matchesChapter = !chapterId || task.chapterId === chapterId
      return matchesProject && matchesChapter
    })
}

export async function createTimelineTask(input: TimelineTaskInput, projectId?: string): Promise<TimelineTask> {
  const resolvedProjectId = resolveProjectId(projectId)

  if (!resolvedProjectId) {
    throw new Error('Projeto ativo não encontrado')
  }

  if (apiClient.isConfigured()) {
    const response = await apiClient.post<ApiTimelineTaskResponse>('/timeline-tasks', {
      body: {
        projectId: resolvedProjectId,
        chapterId: input.chapterId ?? null,
        title: input.title,
        description: null,
        dueDate: input.dueDate || null,
        priority: mapPriorityToApi(input.priority),
      },
    })

    return mapApiTimelineTask(response)
  }

  const task: TimelineTask = {
    id: getNextTaskId(),
    projectId: resolvedProjectId,
    chapterId: input.chapterId || undefined,
    title: input.title,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    priority: input.priority,
    status: 'todo',
    order: getNextTaskOrder(resolvedProjectId),
  }

  mockDb.timelineTasks.push(task)

  const project = mockDb.projects.find((item) => item.id === resolvedProjectId)
  if (project) {
    project.timelineTaskIds.push(task.id)
    project.updatedAt = new Date()
  }

  return structuredClone(task)
}

export async function updateTimelineTask(
  taskId: string,
  input: TimelineTaskInput,
  projectId?: string,
): Promise<TimelineTask | null> {
  const resolvedProjectId = resolveProjectId(projectId)

  if (apiClient.isConfigured()) {
    const response = await apiClient.patch<ApiTimelineTaskResponse>(`/timeline-tasks/${taskId}`, {
      body: {
        chapterId: input.chapterId ?? null,
        title: input.title,
        description: null,
        dueDate: input.dueDate || null,
        priority: mapPriorityToApi(input.priority),
      },
    })

    return mapApiTimelineTask(response)
  }

  const task = mockDb.timelineTasks.find((item) => item.id === taskId)
  if (!task) return null
  if (resolvedProjectId && task.projectId !== resolvedProjectId) return null

  task.title = input.title
  task.chapterId = input.chapterId || undefined
  task.dueDate = input.dueDate ? new Date(input.dueDate) : undefined
  task.priority = input.priority
  updateProjectTaskLinks(task.projectId)

  return structuredClone(task)
}

export async function updateTimelineTaskStatus(
  taskId: string,
  status: TimelineTask['status'],
  projectId?: string,
): Promise<TimelineTask | null> {
  const resolvedProjectId = resolveProjectId(projectId)

  if (apiClient.isConfigured()) {
    const response = await apiClient.patch<ApiTimelineTaskResponse>(`/timeline-tasks/${taskId}/status`, {
      body: {
        status: mapStatusToApi(status),
      },
    })

    return mapApiTimelineTask(response)
  }

  const task = mockDb.timelineTasks.find((item) => item.id === taskId)
  if (!task) return null
  if (resolvedProjectId && task.projectId !== resolvedProjectId) return null
  task.status = status
  updateProjectTaskLinks(task.projectId)
  return structuredClone(task)
}

export async function deleteTimelineTask(taskId: string, projectId?: string): Promise<boolean> {
  const resolvedProjectId = resolveProjectId(projectId)

  if (apiClient.isConfigured()) {
    await apiClient.delete<null>(`/timeline-tasks/${taskId}`)
    return true
  }

  const index = mockDb.timelineTasks.findIndex((item) => item.id === taskId)
  if (index === -1) return false

  const [removed] = mockDb.timelineTasks.splice(index, 1)
  if (resolvedProjectId && removed.projectId !== resolvedProjectId) {
    mockDb.timelineTasks.splice(index, 0, removed)
    return false
  }

  const project = mockDb.projects.find((item) => item.id === removed.projectId)
  if (project) {
    project.timelineTaskIds = project.timelineTaskIds.filter((id) => id !== taskId)
    project.updatedAt = new Date()
  }

  return true
}
