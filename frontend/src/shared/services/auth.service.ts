import { mapApiUser, type ApiAuthResponse, type ApiUserResponse } from '@/shared/services/api-mappers'
import { apiClient } from '@/shared/services/api-client'
import { clearSession, getSessionToken, getSessionUser, hasSessionToken, logoutSession, persistSession } from '@/shared/services/session.service'
import type { User } from '@/shared/types/contracts'

export function getAuthenticatedUser(): User | null {
  return getSessionUser()
}

export function isAuthenticated() {
  return hasSessionToken()
}

export async function login(email: string, password: string) {
  if (!apiClient.isConfigured()) {
    throw new Error('API não configurada. Defina VITE_API_URL.')
  }

  const response = await apiClient.post<ApiAuthResponse, User>('/auth/login', {
    body: {
      email: email.trim(),
      password,
    },
  })

  if ('token' in response && 'user' in response) {
    const user = mapApiUser(response.user)
    persistSession(response.token, user)
    return user
  }

  return response
}

export async function register(input: { name: string; email: string; password?: string }) {
  if (!apiClient.isConfigured()) {
    throw new Error('API não configurada. Defina VITE_API_URL.')
  }

  const response = await apiClient.post<ApiAuthResponse, User>('/auth/register', {
    body: {
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password?.trim() ?? '',
    },
  })

  if ('token' in response && 'user' in response) {
    const user = mapApiUser(response.user)
    persistSession(response.token, user)
    return user
  }

  return response
}

export async function restoreSession() {
  if (!hasSessionToken()) {
    clearSession()
    return null
  }

  try {
    const response = await apiClient.get<ApiUserResponse, User | null>('/me', {
      fallback: () => getSessionUser(),
    })

    const user = response
      ? apiClient.isConfigured()
        ? mapApiUser(response as ApiUserResponse)
        : (response as User)
      : null

    if (!user) {
      logoutSession()
      return null
    }

    persistSession(getSessionToken() ?? 'mock-session-token', user)
    return user
  } catch {
    logoutSession()
    return null
  }
}

export async function logout() {
  logoutSession()
  return true
}
