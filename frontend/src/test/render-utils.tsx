import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { TooltipProvider } from '@/shared/ui/tooltip'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  })
}

export function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>{ui}</TooltipProvider>
    </QueryClientProvider>,
  )
}

interface RouteDefinition {
  path: string
  element: ReactNode
}

export function renderWithRouter(routes: RouteDefinition[], initialEntries: string[]) {
  const queryClient = createTestQueryClient()
  const router = createMemoryRouter(
    routes.map((route) => ({
      path: route.path,
      element: route.element,
    })),
    { initialEntries },
  )

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  )

  return {
    router,
    queryClient,
    ...renderResult,
  }
}
