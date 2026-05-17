import { X } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { useAppShellStore } from '@/shared/services/app-store'
import { AppSidebar } from '@/shared/components/navigation/app-sidebar'
import { AppTopbar } from '@/shared/components/navigation/app-topbar'
import { Button } from '@/shared/ui/button'

export function AppLayout() {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useAppShellStore()

  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex min-h-screen">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm md:hidden">
            <div className="flex h-full max-w-[320px] flex-col bg-background">
              <div className="flex justify-end p-3">
                <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <AppSidebar mobile onNavigate={() => setMobileSidebarOpen(false)} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
