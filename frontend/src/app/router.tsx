import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { clearActiveProjectId, getStoredActiveProjectId, resolveValidActiveProjectId, setActiveProjectId } from '@/shared/services/active-project.service'
import { AuthLayout } from '@/shared/components/layout/auth-layout'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { ProtectedAppLayout, PublicAuthOutlet } from '@/shared/components/layout/route-guards'
import { LoginPage } from '@/features/auth/pages/login-page'
import { RegisterPage } from '@/features/auth/pages/register-page'
import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { ProjectsPage } from '@/features/projects/pages/projects-page'
import { NewProjectPage } from '@/features/projects/pages/new-project-page'
import { ProjectDetailsPage } from '@/features/projects/pages/project-details-page'
import { EditorPage } from '@/features/editor/pages/editor-page'
import { ReferencesPage } from '@/features/references/pages/references-page'
import { PdfReaderPage } from '@/features/pdf-reader/pages/pdf-reader-page'
import { AiAssistantPage } from '@/features/ai-assistant/pages/ai-assistant-page'
import { TimelinePage } from '@/features/timeline/pages/timeline-page'
import { AdvisorPage } from '@/features/advisor/pages/advisor-page'
import { ExportPage } from '@/features/export/pages/export-page'
import { BillingPage } from '@/features/billing/pages/billing-page'
import { SettingsPage } from '@/features/settings/pages/settings-page'
import { projectsQuery } from '@/features/projects/services/projects.service'

function EditorRedirect() {
  const { data, isLoading, isError, refetch } = useQuery(projectsQuery)
  const storedProjectId = getStoredActiveProjectId()
  const resolvedProjectId = resolveValidActiveProjectId(
    (data ?? []).map((project) => project.id),
    storedProjectId,
  )

  useEffect(() => {
    if (isLoading || isError) return

    if (!resolvedProjectId) {
      clearActiveProjectId()
      return
    }

    if (resolvedProjectId !== storedProjectId) {
      setActiveProjectId(resolvedProjectId)
    }
  }, [isError, isLoading, resolvedProjectId, storedProjectId])

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError) {
    return (
      <div className="page-shell">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    )
  }

  return <Navigate to={resolvedProjectId ? `/editor/${resolvedProjectId}` : '/projects/new'} replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <PublicAuthOutlet />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/cadastro', element: <RegisterPage /> },
          { path: '/register', element: <Navigate to="/cadastro" replace /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedAppLayout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/projects', element: <ProjectsPage /> },
      { path: '/projects/new', element: <NewProjectPage /> },
      { path: '/projects/:projectId', element: <ProjectDetailsPage /> },
      { path: '/editor', element: <EditorRedirect /> },
      { path: '/editor/:projectId', element: <EditorPage /> },
      { path: '/editor/:projectId/:nodeId', element: <EditorPage /> },
      { path: '/references', element: <ReferencesPage /> },
      { path: '/pdf-reader', element: <PdfReaderPage /> },
      { path: '/ai-assistant', element: <AiAssistantPage /> },
      { path: '/timeline', element: <TimelinePage /> },
      { path: '/advisor', element: <AdvisorPage /> },
      { path: '/export', element: <ExportPage /> },
      { path: '/billing', element: <BillingPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
