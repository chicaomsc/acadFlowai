import { mockDb } from '@/shared/mocks/database'

const ACTIVE_PROJECT_STORAGE_KEY = 'acadflow.activeProjectId'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function setActiveProjectId(projectId: string) {
  if (!projectId) return

  if (canUseStorage()) {
    window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId)
  }
}

export function getStoredActiveProjectId(): string | null {
  if (!canUseStorage()) return null
  return window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY)
}

export function getActiveProjectId(): string | null {
  const storedProjectId = getStoredActiveProjectId()
  if (storedProjectId) {
    return storedProjectId
  }

  if (import.meta.env.VITE_API_URL) {
    return null
  }

  const fallbackProjectId = mockDb.projects[0]?.id ?? null

  if (fallbackProjectId) {
    setActiveProjectId(fallbackProjectId)
  }

  return fallbackProjectId
}

export function clearActiveProjectId() {
  if (!canUseStorage()) return
  window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY)
}

export function resolveValidActiveProjectId(
  availableProjectIds: string[],
  preferredProjectId?: string | null,
) {
  if (!availableProjectIds.length) return null

  const candidateProjectId = preferredProjectId ?? getStoredActiveProjectId()
  if (candidateProjectId && availableProjectIds.includes(candidateProjectId)) {
    return candidateProjectId
  }

  return availableProjectIds[0] ?? null
}

export function syncActiveProjectId(
  availableProjectIds: string[],
  preferredProjectId?: string | null,
) {
  const projectId = resolveValidActiveProjectId(availableProjectIds, preferredProjectId)

  if (projectId) {
    setActiveProjectId(projectId)
    return projectId
  }

  clearActiveProjectId()
  return null
}

export function resolveProjectId(projectId?: string): string | null {
  return projectId ?? getActiveProjectId()
}
