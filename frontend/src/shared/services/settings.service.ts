import { mockDb } from '@/shared/mocks/database'
import { getAuthenticatedUser } from '@/shared/services/auth.service'
import { mapApiUser, type ApiUserResponse } from '@/shared/services/api-mappers'
import { apiClient } from '@/shared/services/api-client'
import { getSessionToken, persistSession, setSessionUser } from '@/shared/services/session.service'
import type { User } from '@/shared/types/contracts'

export async function getCurrentUser(): Promise<User> {
  return apiClient.get('/me', () => getAuthenticatedUser() ?? mockDb.users[0])
}

interface UpdateCurrentUserInput {
  name: string
}

export async function updateCurrentUser(input: UpdateCurrentUserInput): Promise<User> {
  if (!apiClient.isConfigured()) {
    const currentUser = getAuthenticatedUser() ?? mockDb.users[0]
    const updatedUser = {
      ...currentUser,
      name: input.name.trim() || currentUser.name,
    }

    const mockUser = mockDb.users.find((user) => user.id === updatedUser.id)
    if (mockUser) {
      mockUser.name = updatedUser.name
    }

    setSessionUser(updatedUser)
    return updatedUser
  }

  const response = await apiClient.patch<ApiUserResponse>('/me', {
    body: {
      name: input.name.trim(),
    },
  })

  const updatedUser = mapApiUser(response)
  const sessionToken = getSessionToken()

  if (sessionToken) {
    persistSession(sessionToken, updatedUser)
  } else {
    setSessionUser(updatedUser)
  }

  return updatedUser
}
