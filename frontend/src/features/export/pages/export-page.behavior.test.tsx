import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExportPage } from '@/features/export/pages/export-page'
import { renderWithProviders, renderWithRouter } from '@/test/render-utils'

const getActiveProjectIdMock = vi.fn()
const generateExportArtifactMock = vi.fn()
const downloadExportArtifactMock = vi.fn()
const exportStatusQueryMock = vi.fn()

vi.mock('@/shared/services/active-project.service', () => ({
  getActiveProjectId: () => getActiveProjectIdMock(),
}))

vi.mock('@/shared/services/export.service', () => ({
  generateExportArtifact: (...args: unknown[]) => generateExportArtifactMock(...args),
  downloadExportArtifact: (...args: unknown[]) => downloadExportArtifactMock(...args),
}))

vi.mock('@/features/export/services/export.service', () => ({
  exportStatusQuery: (...args: unknown[]) => exportStatusQueryMock(...args),
}))

describe('export page behavior', () => {
  beforeEach(() => {
    getActiveProjectIdMock.mockReset()
    generateExportArtifactMock.mockReset()
    downloadExportArtifactMock.mockReset()
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

    renderWithProviders(<ExportPage />)

    expect(await screen.findByRole('heading', { name: 'Exportação' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Gerar DOCX' }))

    await waitFor(() => {
      expect(screen.getByText('Não foi possível gerar a exportação')).toBeInTheDocument()
      expect(screen.getByText('Falha simulada ao exportar.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Gerar DOCX' })).toBeInTheDocument()
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

    renderWithProviders(<ExportPage />)

    expect(await screen.findByRole('heading', { name: 'Exportação' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Gerar DOCX' }))
    expect(await screen.findByRole('button', { name: 'Baixar DOCX' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Baixar DOCX' }))

    await waitFor(() => {
      expect(screen.getByText('Não foi possível baixar o DOCX')).toBeInTheDocument()
      expect(screen.getByText('Falha ao baixar o DOCX autenticado.')).toBeInTheDocument()
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

    renderWithProviders(<ExportPage />)

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
    expect(screen.getByRole('button', { name: 'Gerar DOCX' })).toBeDisabled()
  })

  it('mantém PDF bloqueado mesmo quando o projeto está pronto', async () => {
    const user = userEvent.setup()
    getActiveProjectIdMock.mockReturnValue('project-1')

    renderWithProviders(<ExportPage />)

    expect(await screen.findByRole('heading', { name: 'Exportação' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /pdf/i }))

    expect(await screen.findByText('Formato ainda não liberado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gerar DOCX' })).toBeDisabled()
    expect(generateExportArtifactMock).not.toHaveBeenCalled()
  })
})
