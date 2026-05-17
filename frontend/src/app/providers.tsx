import { useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/app/queryClient'
import { restoreSession } from '@/shared/services/auth.service'
import { SESSION_LOGOUT_EVENT } from '@/shared/services/session.service'
import { useAppShellStore } from '@/shared/services/app-store'
import { TooltipProvider } from '@/shared/ui/tooltip'

function SessionBootstrap() {
  const setCurrentUser = useAppShellStore((state) => state.setCurrentUser)
  const setAuthLoading = useAppShellStore((state) => state.setAuthLoading)

  useEffect(() => {
    setAuthLoading(true)

    void restoreSession()
      .then((user) => {
        setCurrentUser(user)
      })
      .finally(() => {
        setAuthLoading(false)
      })

    const handleLogout = () => {
      setCurrentUser(null)
      setAuthLoading(false)
      void queryClient.cancelQueries()
      queryClient.clear()
    }

    window.addEventListener(SESSION_LOGOUT_EVENT, handleLogout)
    return () => {
      window.removeEventListener(SESSION_LOGOUT_EVENT, handleLogout)
    }
  }, [setAuthLoading, setCurrentUser])

  return null
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={120}>
        <SessionBootstrap />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  )
}
