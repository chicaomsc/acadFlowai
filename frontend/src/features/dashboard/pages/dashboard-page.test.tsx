import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { renderWithRouter } from '@/test/render-utils'

describe('dashboard page', () => {
  it('renderiza o bloco principal orientado à ação com dados do projeto ativo', async () => {
    renderWithRouter([{ path: '/dashboard', element: <DashboardPage /> }], ['/dashboard'])

    expect(await screen.findByRole('heading', { name: 'Seu TCC está em andamento' })).toBeInTheDocument()
    expect(screen.getByText('Continuar escrita')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /abrir editor/i })).toHaveAttribute('href', '/editor/project-1')
    expect(screen.getByText('Progresso geral')).toBeInTheDocument()
    expect(screen.getByText('Alertas da IA')).toBeInTheDocument()
  })
})
