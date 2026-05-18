import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EditorPage } from '@/features/editor/pages/editor-page'
import { getChapter } from '@/shared/services/chapter.service'
import { renderWithRouter } from '@/test/render-utils'

describe('editor page', () => {
  it('permite navegar entre capítulos e salvar conteúdo mockado', async () => {
    const user = userEvent.setup()

    renderWithRouter([
      { path: '/editor/:projectId', element: <EditorPage /> },
      { path: '/editor/:projectId/:nodeId', element: <EditorPage /> },
    ], ['/editor/project-1'])

    expect(await screen.findByRole('heading', { name: 'Introdução' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /fundamentação teórica/i }))
    expect(await screen.findByRole('heading', { name: 'Fundamentação Teórica' })).toBeInTheDocument()

    const textarea = screen.getByPlaceholderText('Comece a escrever aqui...')
    await user.clear(textarea)
    await user.type(textarea, 'Texto salvo pelo teste de integração visual.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-2')
      expect(updatedChapter?.content).toBe('Texto salvo pelo teste de integração visual.')
      expect(updatedChapter?.wordCount).toBeGreaterThan(0)
    })
  })

  it('restaura o capítulo ativo pela rota após refresh', async () => {
    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    expect(await screen.findByRole('heading', { name: 'Metodologia' })).toBeInTheDocument()
  })

  it('restaura resumo e abstract pela rota após refresh', async () => {
    const { unmount } = renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/summary'],
    )

    expect(await screen.findByText('Síntese acadêmica em português com foco em clareza, densidade e fechamento conceitual.')).toBeInTheDocument()

    unmount()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/abstract'],
    )

    expect(await screen.findByText('Versão internacional do resumo, com linguagem objetiva e vocabulário acadêmico consistente.')).toBeInTheDocument()
  })

  it('cai para o primeiro capítulo válido quando o chapterId da rota é inválido', async () => {
    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-invalido'],
    )

    expect(await screen.findByRole('heading', { name: 'Introdução' })).toBeInTheDocument()
  })
})
