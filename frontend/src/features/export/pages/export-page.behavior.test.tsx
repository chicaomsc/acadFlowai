import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExportPage } from '@/features/export/pages/export-page'
import { renderWithRouter } from '@/test/render-utils'

const getActiveProjectIdMock = vi.fn()
const setActiveProjectIdMock = vi.fn()
const generateExportArtifactMock = vi.fn()
const downloadExportArtifactMock = vi.fn()
const downloadPdfExportArtifactMock = vi.fn()
const exportStatusQueryMock = vi.fn()

vi.mock('@/shared/services/active-project.service', () => ({
  getActiveProjectId: () => getActiveProjectIdMock(),
  setActiveProjectId: (...args: unknown[]) => setActiveProjectIdMock(...args),
}))

vi.mock('@/shared/services/export.service', () => ({
  generateExportArtifact: (...args: unknown[]) => generateExportArtifactMock(...args),
  downloadExportArtifact: (...args: unknown[]) => downloadExportArtifactMock(...args),
  downloadPdfExportArtifact: (...args: unknown[]) => downloadPdfExportArtifactMock(...args),
}))

vi.mock('@/features/export/services/export.service', () => ({
  exportStatusQuery: (...args: unknown[]) => exportStatusQueryMock(...args),
}))

vi.mock('@/features/projects/services/projects.service', () => ({
  projectDetailsQuery: (projectId: string) => ({
    queryKey: ['project-details', projectId],
    queryFn: async () => ({
      project: {
        id: projectId,
        title: 'Projeto ativo',
        subtitle: '',
        course: 'Direito',
        institution: 'FEMAF',
        academicDegree: 'GRADUACAO',
        advisorName: 'Profa. Maria',
        norm: 'ABNT',
        templateProfile: 'FEMAF',
        deadline: new Date('2026-12-10'),
        status: 'writing',
        progress: 90,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-05-01'),
        theme: '',
        researchProblem: '',
        generalObjective: '',
        specificObjectives: [],
        defenseCity: '',
        defenseYear: 2026,
        abstractPt: '',
        abstractEn: '',
        keywords: [],
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
}))

describe('export page behavior', () => {
  beforeEach(() => {
    getActiveProjectIdMock.mockReset()
    setActiveProjectIdMock.mockReset()
    generateExportArtifactMock.mockReset()
    downloadExportArtifactMock.mockReset()
    downloadPdfExportArtifactMock.mockReset()
    exportStatusQueryMock.mockReset()

    exportStatusQueryMock.mockImplementation((_projectId: string | undefined, format: string) => ({
      queryKey: ['export-status', 'project-1', format],
      queryFn: async () => ({
        projectId: 'project-1',
        format,
        ready: true,
        progress: 100,
        pendingItems: [],
        completedItems: ['Tudo certo'],
        chapterCoverage: { total: 6, completed: 6 },
        referenceCoverage: { total: 2, cited: 2 },
      }),
    }))
  })

  it('mostra empty state quando não há projeto ativo', async () => {
    getActiveProjectIdMock.mockReturnValue(null)

    renderWithRouter([{ path: '/export', element: <ExportPage /> }], ['/export'])

    expect(await screen.findByText('Selecione um projeto para exportar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar projeto' })).toHaveAttribute('href', '/projects/new')
    expect(screen.getByRole('link', { name: 'Selecionar projeto' })).toHaveAttribute('href', '/projects')
  })

  it('recupera o botão após falha na geração e mostra erro amigável', async () => {
    const user = userEvent.setup()
    getActiveProjectIdMock.mockReturnValue('project-1')
    generateExportArtifactMock.mockRejectedValue(new Error('Falha simulada ao exportar.'))

    renderWithRouter([{ path: '/projects/:projectId/export', element: <ExportPage /> }], ['/projects/project-1/export'])

    expect(await screen.findByRole('heading', { name: 'Exportação' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Exportar DOCX' }))

    await waitFor(() => {
      expect(screen.getByText('Não foi possível gerar a exportação')).toBeInTheDocument()
      expect(screen.getByText('Falha simulada ao exportar.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Exportar DOCX' })).toBeInTheDocument()
    })
  })

  it('mostra erro amigável quando o download do DOCX falha', async () => {
    const user = userEvent.setup()
    getActiveProjectIdMock.mockReturnValue('project-1')
    generateExportArtifactMock.mockResolvedValue({
      projectId: 'project-1',
      format: 'docx',
      fileName: 'tcc-final.docx',
      downloadUrl: 'http://localhost:8080/downloads/tcc-final.docx',
      generatedAt: new Date(),
    })
    downloadExportArtifactMock.mockRejectedValue(new Error('Falha ao baixar o DOCX autenticado.'))

    renderWithRouter([{ path: '/projects/:projectId/export', element: <ExportPage /> }], ['/projects/project-1/export'])

    expect(await screen.findByRole('heading', { name: 'Exportação' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Exportar DOCX' }))
    expect(await screen.findByRole('button', { name: 'Baixar DOCX' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Baixar DOCX' }))

    await waitFor(() => {
    expect(screen.getByText('Não foi possível baixar o DOCX')).toBeInTheDocument()
    expect(screen.getByText('Falha ao baixar o DOCX autenticado.')).toBeInTheDocument()
    })
  })

  it('mostra o botão PDF, exporta com loading e preserva o DOCX disponível', async () => {
    const user = userEvent.setup()
    getActiveProjectIdMock.mockReturnValue('project-1')

    let resolvePdfDownload: (() => void) | undefined
    downloadPdfExportArtifactMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePdfDownload = resolve
      }),
    )

    renderWithRouter([{ path: '/projects/:projectId/export', element: <ExportPage /> }], ['/projects/project-1/export'])

    expect(await screen.findByRole('heading', { name: 'Exportação' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar DOCX' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }))
    expect(screen.getByRole('button', { name: 'Exportando PDF...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Exportar DOCX' })).toBeEnabled()

    resolvePdfDownload?.()

    await waitFor(() => {
      expect(downloadPdfExportArtifactMock).toHaveBeenCalledWith('project-1', 'Projeto ativo.pdf')
      expect(screen.getByText('Download iniciado')).toBeInTheDocument()
      expect(screen.getByText(/O download de Projeto ativo\.pdf foi iniciado com sucesso\./)).toBeInTheDocument()
    })
  })

  it('mostra erro amigável quando o PDF retorna falha 502', async () => {
    const user = userEvent.setup()
    getActiveProjectIdMock.mockReturnValue('project-1')
    downloadPdfExportArtifactMock.mockRejectedValue(new Error('Falha ao converter documento para PDF.'))

    renderWithRouter([{ path: '/projects/:projectId/export', element: <ExportPage /> }], ['/projects/project-1/export'])

    expect(await screen.findByRole('heading', { name: 'Exportação' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }))

    await waitFor(() => {
      expect(screen.getByText('Não foi possível baixar o PDF')).toBeInTheDocument()
      expect(screen.getByText('Falha ao converter documento para PDF.')).toBeInTheDocument()
    })
  })

  it('mostra a mensagem do backend quando o PDF falha com erro informado', async () => {
    const user = userEvent.setup()
    getActiveProjectIdMock.mockReturnValue('project-1')
    downloadPdfExportArtifactMock.mockRejectedValue(new Error('Preencha os metadados obrigatórios.'))

    renderWithRouter([{ path: '/projects/:projectId/export', element: <ExportPage /> }], ['/projects/project-1/export'])

    expect(await screen.findByRole('heading', { name: 'Exportação' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }))

    await waitFor(() => {
      expect(screen.getByText('Não foi possível baixar o PDF')).toBeInTheDocument()
      expect(screen.getByText('Preencha os metadados obrigatórios.')).toBeInTheDocument()
    })
  })

  it('agrupa pendências reais por metadata, resumo, capítulos e referências', async () => {
    getActiveProjectIdMock.mockReturnValue('project-1')
    exportStatusQueryMock.mockImplementation((_projectId: string | undefined, format: string) => ({
      queryKey: ['export-status', 'project-1', format],
      queryFn: async () => ({
        projectId: 'project-1',
        format,
        ready: false,
        progress: 48,
        pendingItems: [
          'Título não informado.',
          'Orientador não informado.',
          'Cidade de defesa não informada.',
          'Ano de defesa não informado.',
          'Resumo em português não informado.',
          'Capítulo de metodologia ainda não possui conteúdo suficiente.',
          'Existem referências cadastradas sem citação no texto.',
        ],
        completedItems: [],
        chapterCoverage: { total: 6, completed: 2 },
        referenceCoverage: { total: 3, cited: 1 },
      }),
    }))

    renderWithRouter([{ path: '/projects/:projectId/export', element: <ExportPage /> }], ['/projects/project-1/export'])

    expect(await screen.findByText('Metadata acadêmica')).toBeInTheDocument()
    expect(screen.getByText('Resumo')).toBeInTheDocument()
    expect(screen.getByText('Capítulos')).toBeInTheDocument()
    expect(screen.getByText('Referências')).toBeInTheDocument()
    expect(screen.getByText('Título não informado.')).toBeInTheDocument()
    expect(screen.getByText('Orientador não informado.')).toBeInTheDocument()
    expect(screen.getByText('Cidade de defesa não informada.')).toBeInTheDocument()
    expect(screen.getByText('Ano de defesa não informado.')).toBeInTheDocument()
    expect(screen.getByText('Resumo em português não informado.')).toBeInTheDocument()
    expect(screen.getByText('Capítulo de metodologia ainda não possui conteúdo suficiente.')).toBeInTheDocument()
    expect(screen.getByText('Existem referências cadastradas sem citação no texto.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar DOCX' })).toBeDisabled()
  })

  it('mantém PDF bloqueado mesmo quando o projeto está pronto', async () => {
    const user = userEvent.setup()
    getActiveProjectIdMock.mockReturnValue('project-1')

    renderWithRouter([{ path: '/projects/:projectId/export', element: <ExportPage /> }], ['/projects/project-1/export'])

    expect(await screen.findByRole('heading', { name: 'Exportação' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /pdf/i }))

    expect(await screen.findByText('Arquivo selecionado: PDF')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar DOCX' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeEnabled()
    expect(generateExportArtifactMock).not.toHaveBeenCalled()
  })

  it('exibe o template aplicado na ação final de exportação', async () => {
    getActiveProjectIdMock.mockReturnValue('project-1')

    renderWithRouter([{ path: '/projects/:projectId/export', element: <ExportPage /> }], ['/projects/project-1/export'])

    expect(await screen.findByText('Projeto em exportação')).toBeInTheDocument()
    expect(screen.getByText('Exportando projeto')).toBeInTheDocument()
    expect(screen.getByText('Projeto ativo')).toBeInTheDocument()
    expect(await screen.findByText('Exportando com modelo FEMAF')).toBeInTheDocument()
    expect(screen.getByText('Você está exportando o projeto Projeto ativo')).toBeInTheDocument()
  })

  it('permite usar a rota contextual por projectId', async () => {
    getActiveProjectIdMock.mockReturnValue(null)

    renderWithRouter(
      [{ path: '/projects/:projectId/export', element: <ExportPage /> }],
      ['/projects/project-1/export'],
    )

    expect(await screen.findByText('Projeto ativo')).toBeInTheDocument()
    expect(screen.getByText('Exportando com modelo FEMAF')).toBeInTheDocument()
  })
})
