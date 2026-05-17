import { Navigate, Outlet } from 'react-router-dom'
import { isAuthenticated } from '@/shared/services/auth.service'
import { useAppShellStore } from '@/shared/services/app-store'
import { AppLayout } from '@/shared/components/layout/app-layout'
import { LoadingState } from '@/shared/components/feedback/loading-state'

export function ProtectedAppLayout() {
  const authLoading = useAppShellStore((state) => state.authLoading)

  if (authLoading) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    )
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return <AppLayout />
}

export function PublicAuthOutlet() {
  const authLoading = useAppShellStore((state) => state.authLoading)

  if (authLoading) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    )
  }

  if (isAuthenticated()) {
    return <Navigate to="/projects" replace />
  }

  return <Outlet />
}
