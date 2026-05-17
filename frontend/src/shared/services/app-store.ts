import { create } from 'zustand'
import { notifications, projects } from '@/shared/mocks/domain'
import { getAuthenticatedUser } from '@/shared/services/auth.service'
import { hasSessionToken } from '@/shared/services/session.service'
import type { Notification, TCCProject, User } from '@/shared/types/domain'

interface AppShellState {
  currentUser: User | null
  authLoading: boolean
  notifications: Notification[]
  activeProject: TCCProject | null
  searchTerm: string
  mobileSidebarOpen: boolean
  setCurrentUser: (user: User | null) => void
  setAuthLoading: (loading: boolean) => void
  setSearchTerm: (value: string) => void
  setMobileSidebarOpen: (open: boolean) => void
  markNotificationAsRead: (notificationId: string) => void
}

export const useAppShellStore = create<AppShellState>((set) => ({
  currentUser: getAuthenticatedUser(),
  authLoading: hasSessionToken(),
  notifications,
  activeProject: projects[0] ?? null,
  searchTerm: '',
  mobileSidebarOpen: false,
  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setSearchTerm: (value) => set({ searchTerm: value }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  markNotificationAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    })),
}))
