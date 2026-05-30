import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProjectsPage } from '@/features/projects/pages/projects-page'
import { renderWithRouter } from '@/test/render-utils'

describe('projects page', () => {
  it('abre menu de ações e fluxo de exportação contextual por projeto', async () => {
    const user = userEvent.setup()
    renderWithRouter([{ path: '/projects', element: <ProjectsPage /> }], ['/projects'])

    expect(await screen.findByRole('heading', { name: 'Projetos de TCC' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /ações do projeto inteligência artificial aplicada à educação/i }))

    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: /exportar docx/i })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /exportar pdf/i })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /exportar slides/i })).toBeInTheDocument()

    await user.click(within(menu).getByRole('menuitem', { name: /exportar docx/i }))

    expect(await screen.findByRole('heading', { name: /escolha o formato de exportação/i })).toBeInTheDocument()
    expect(screen.getByText(/selecione como deseja exportar o projeto inteligência artificial aplicada à educação/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continuar/i })).toBeEnabled()
  })
})
