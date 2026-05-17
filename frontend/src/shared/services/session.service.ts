import type { User } from '@/shared/types/contracts'

const AUTH_TOKEN_STORAGE_KEY = 'acadflow.authToken'
const AUTH_USER_STORAGE_KEY = 'acadflow.sessionUser'
export const SESSION_LOGOUT_EVENT = 'acadflow:logout'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function dispatchSessionEvent(eventName: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(eventName))
}

export function getSessionToken(): string | null {
  if (!canUseStorage()) return null
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function hasSessionToken() {
  return Boolean(getSessionToken())
}

export function setSessionToken(token: string | null) {
  if (!canUseStorage()) return

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
    return
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export function getSessionUser(): User | null {
  if (!canUseStorage()) return null

  const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY)
  if (!rawUser) return null

  try {
    const parsed = JSON.parse(rawUser) as Omit<User, 'createdAt'> & { createdAt: string }
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
    }
  } catch {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    return null
  }
}

export function setSessionUser(user: User | null) {
  if (!canUseStorage()) return

  if (user) {
    window.localStorage.setItem(
      AUTH_USER_STORAGE_KEY,
      JSON.stringify({
        ...user,
        createdAt: user.createdAt.toISOString(),
      }),
    )
    return
  }

  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
}

export function persistSession(token: string, user: User) {
  setSessionToken(token)
  setSessionUser(user)
}

export function clearSession() {
  setSessionToken(null)
  setSessionUser(null)
}

export function logoutSession() {
  clearSession()
  dispatchSessionEvent(SESSION_LOGOUT_EVENT)
}
