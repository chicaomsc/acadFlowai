import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ExportPage } from '@/features/export/pages/export-page'
import { renderWithRouter } from '@/test/render-utils'

describe('export page', () => {
  it('exibe pendências reais e permite trocar o formato simulado', async () => {
    const user = userEvent.setup()
    renderWithRouter([{ path: '/projects/:projectId/export', element: <ExportPage /> }], ['/projects/project-1/export'])

    expect(await screen.findByRole('heading', { name: 'Exportação' })).toBeInTheDocument()
    expect(screen.getByText(/você está exportando o projeto/i)).toBeInTheDocument()
    expect(screen.getByText('Pendências atuais')).toBeInTheDocument()
    expect(screen.getByText('Existem referências cadastradas sem citação no texto.')).toBeInTheDocument()
    expect(screen.getByText('Exportando com modelo ABNT Genérico')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /slides/i }))

    expect(await screen.findByText('Arquivo selecionado: SLIDES')).toBeInTheDocument()
  })
})
