import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectWizard } from '@/features/projects/components/project-wizard'
import { renderWithRouter } from '@/test/render-utils'
const createProjectMock = vi.fn()

vi.mock('@/features/projects/services/projects.service', () => ({
  createProject: (...args: unknown[]) => createProjectMock(...args),
}))

describe('project wizard', () => {
  beforeEach(() => {
    createProjectMock.mockReset()
    createProjectMock.mockResolvedValue({
      project: { id: 'project-2' },
    })
  })

  it('cria um novo projeto e navega para a rota correta ao finalizar o wizard', async () => {
    const user = userEvent.setup()
    const { router } = renderWithRouter(
      [
        { path: '/projects/new', element: <ProjectWizard /> },
        { path: '/projects/:projectId', element: <div>Destino do projeto</div> },
      ],
      ['/projects/new'],
    )

    await user.type(screen.getByPlaceholderText(/inteligência artificial aplicada à educação/i), 'Novo TCC AcadFlow')
    await user.click(screen.getAllByRole('combobox')[0])
    await user.click(await screen.findByRole('option', { name: 'Ciência da Computação' }))
    await user.click(screen.getAllByRole('combobox')[1])
    await user.click(await screen.findByRole('option', { name: 'ABNT' }))
    await user.type(screen.getAllByRole('textbox')[1], 'UFPE')
    await user.type(screen.getAllByRole('textbox')[2], 'Dra. Ana')

    await user.click(screen.getByRole('button', { name: /próximo/i }))
    await user.type(screen.getByRole('textbox'), 'Tema focado em IA e TCC')
    await user.click(screen.getByRole('button', { name: /próximo/i }))
    await user.type(screen.getByRole('textbox'), 'Como IA pode apoiar TCCs?')
    await user.click(screen.getByRole('button', { name: /próximo/i }))
    await user.type(screen.getByPlaceholderText('Objetivo geral'), 'Avaliar uso de IA no fluxo de escrita acadêmica')
    const specificObjectiveInputs = screen.getAllByPlaceholderText(/objetivo específico/i)
    await user.type(specificObjectiveInputs[0], 'Mapear ferramentas')
    await user.click(screen.getByRole('button', { name: /próximo/i }))
    await user.click(screen.getByRole('button', { name: /criar projeto/i }))

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalledTimes(1)
      expect(createProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Novo TCC AcadFlow',
          course: 'Ciência da Computação',
          institution: 'UFPE',
          advisorName: 'Dra. Ana',
          norm: 'ABNT',
        }),
      )
      expect(router.state.location.pathname).toBe('/projects/project-2')
    })
  })
})
