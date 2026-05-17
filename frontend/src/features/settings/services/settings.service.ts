import { getCurrentUser, updateCurrentUser } from '@/shared/services/settings.service'

export const settingsQuery = {
  queryKey: ['settings-user'],
  queryFn: getCurrentUser,
}

export { updateCurrentUser }
