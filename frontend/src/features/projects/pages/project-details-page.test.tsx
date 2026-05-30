import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectDetailsPage } from '@/features/projects/pages/project-details-page'
import { renderWithRouter } from '@/test/render-utils'

const updateProjectMock = vi.fn()

type MockTemplateProfile = 'ABNT_GENERIC' | 'FEMAF' | undefined

const projectDetailsState = {
  templateProfile: 'ABNT_GENERIC' as MockTemplateProfile,
}

vi.mock('@/features/projects/services/projects.service', () => ({
  projectDetailsQuery: (projectId: string) => ({
    queryKey: ['project-details', projectId, projectDetailsState.templateProfile ?? 'none'],
    queryFn: async () => ({
      project: {
        id: projectId,
        title: 'Projeto com template',
        subtitle: '',
        course: 'Direito',
        institution: 'FEMAF',
        academicDegree: 'GRADUACAO',
        advisorName: 'Profa. Maria',
        norm: 'ABNT',
        templateProfile: projectDetailsState.templateProfile,
        deadline: new Date('2026-12-10'),
        status: 'writing',
        progress: 40,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-05-01'),
        theme: 'Tema',
        researchProblem: 'Problema',
        generalObjective: 'Objetivo',
        specificObjectives: ['Objetivo 1'],
        defenseCity: 'Formosa',
        defenseYear: 2026,
        abstractPt: '',
        abstractEn: '',
        keywords: ['direito'],
        userId: 'user-1',
        chapterIds: [],
        referenceIds: [],
        timelineTaskIds: [],
        advisorCommentIds: [],
        references: [],
        timelineTasks: [],
        totalReferences: 0,
        citedReferences: 0,
        pendingReferences: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        exportReady: true,
        exportProgress: 100,
        pendingExportItems: [],
      },
      chapters: [],
    }),
  }),
  projectsQuery: {
    queryKey: ['projects'],
    queryFn: async () => [],
  },
  updateProject: (...args: unknown[]) => updateProjectMock(...args),
  archiveProject: vi.fn(),
}))

describe('project details page', () => {
  beforeEach(() => {
    updateProjectMock.mockReset()
    updateProjectMock.mockResolvedValue({})
    projectDetailsState.templateProfile = 'ABNT_GENERIC'
  })

  it('exibe fallback ABNT Genérico quando o projeto vem sem templateProfile', async () => {
    projectDetailsState.templateProfile = undefined

    renderWithRouter(
      [{ path: '/projects/:projectId', element: <ProjectDetailsPage /> }],
      ['/projects/project-1'],
    )

    expect(await screen.findByRole('heading', { name: 'Projeto com template' })).toBeInTheDocument()
    expect(screen.getByText('ABNT Genérico')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /editar projeto/i }))
    expect(await screen.findByRole('dialog', { name: 'Editar projeto' })).toBeInTheDocument()
  })

  it('permite alterar projeto de ABNT Genérico para FEMAF', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/projects/:projectId', element: <ProjectDetailsPage /> }],
      ['/projects/project-1'],
    )

    expect(await screen.findByRole('heading', { name: 'Projeto com template' })).toBeInTheDocument()
    expect(screen.getByText('ABNT Genérico')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /editar projeto/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Editar projeto' })
    const comboboxes = within(dialog).getAllByRole('combobox')
    await user.click(comboboxes[2])
    await user.click(await screen.findByRole('option', { name: 'FEMAF' }))

    expect(within(dialog).getByText(/padrão institucional FEMAF/i)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /salvar projeto/i }))

    await waitFor(() => {
      expect(updateProjectMock).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          templateProfile: 'FEMAF',
        }),
      )
    })
  })

  it('permite alterar projeto de FEMAF para ABNT Genérico e remove o aviso', async () => {
    const user = userEvent.setup()
    projectDetailsState.templateProfile = 'FEMAF'

    renderWithRouter(
      [{ path: '/projects/:projectId', element: <ProjectDetailsPage /> }],
      ['/projects/project-1'],
    )

    expect(await screen.findByRole('heading', { name: 'Projeto com template' })).toBeInTheDocument()
    expect(screen.getByText('FEMAF')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /editar projeto/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Editar projeto' })
    expect(within(dialog).getByText(/padrão institucional FEMAF/i)).toBeInTheDocument()

    const comboboxes = within(dialog).getAllByRole('combobox')
    await user.click(comboboxes[2])
    await user.click(await screen.findByRole('option', { name: 'ABNT Genérico' }))

    await waitFor(() => {
      expect(within(dialog).queryByText(/padrão institucional FEMAF/i)).not.toBeInTheDocument()
    })

    await user.click(within(dialog).getByRole('button', { name: /salvar projeto/i }))

    await waitFor(() => {
      expect(updateProjectMock).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          templateProfile: 'ABNT_GENERIC',
        }),
      )
    })
  })
})
