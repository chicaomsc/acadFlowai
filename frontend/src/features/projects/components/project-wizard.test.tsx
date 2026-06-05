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
    renderWithRouter(
      [
        { path: '/projects/new', element: <ProjectWizard /> },
        { path: '/projects/:projectId', element: <div>Destino do projeto</div> },
      ],
      ['/projects/new'],
    )

    await user.type(screen.getByPlaceholderText(/inteligência artificial aplicada à educação/i), 'Novo TCC AcadFlow')
    const textboxes = screen.getAllByRole('textbox')
    await user.type(textboxes[1], 'Subtítulo do projeto')
    const comboboxes = screen.getAllByRole('combobox')
    await user.click(comboboxes[1])
    await user.click(await screen.findByRole('option', { name: 'ABNT' }))
    await user.click(comboboxes[2])
    await user.click(await screen.findByRole('option', { name: 'ABNT Genérico' }))
    await user.click(comboboxes[0])
    await user.click(await screen.findByRole('option', { name: 'Ciência da Computação' }))
    await user.click(comboboxes[3])
    await user.click(await screen.findByRole('option', { name: 'Graduação' }))
    await user.type(textboxes[2], 'UFPE')
    await user.type(textboxes[3], 'Dra. Ana')
    await user.type(textboxes[4], 'Recife')
    await user.type(screen.getByRole('spinbutton'), '2026')
    await user.type(textboxes[5], 'Tema focado em IA e TCC')
    await user.type(textboxes[6], 'Como IA pode apoiar TCCs?')
    await user.type(screen.getByPlaceholderText('Objetivo geral'), 'Avaliar uso de IA no fluxo de escrita acadêmica')
    const specificObjectiveInputs = screen.getAllByPlaceholderText(/objetivo específico/i)
    await user.type(specificObjectiveInputs[0], 'Mapear ferramentas')
    await user.type(textboxes[textboxes.length - 1], 'IA; educação')
    await user.click(screen.getByRole('button', { name: /criar projeto/i }))

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalledTimes(1)
      expect(createProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Novo TCC AcadFlow',
          subtitle: 'Subtítulo do projeto',
          course: 'Ciência da Computação',
          institution: 'UFPE',
          academicDegree: 'GRADUACAO',
          advisorName: 'Dra. Ana',
          defenseCity: 'Recife',
          defenseYear: 2026,
          norm: 'ABNT',
          templateProfile: 'ABNT_GENERIC',
        }),
      )
    })

    expect(await screen.findByText('Destino do projeto')).toBeInTheDocument()
  }, 10000)

  it('cria projeto com template FEMAF quando o usuário seleciona o modelo institucional', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/projects/new', element: <ProjectWizard /> }],
      ['/projects/new'],
    )

    await user.type(screen.getByPlaceholderText(/inteligência artificial aplicada à educação/i), 'TCC FEMAF')

    const comboboxes = screen.getAllByRole('combobox')
    await user.click(comboboxes[2])
    await user.click(await screen.findByRole('option', { name: 'FEMAF' }))

    expect(screen.getByText(/regras institucionais de exportação do trabalho/i)).toBeInTheDocument()
    expect(await screen.findByText(/estrutura conforme padrão institucional FEMAF/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /criar projeto/i }))

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({
          templateProfile: 'FEMAF',
        }),
      )
    })
  })
})
