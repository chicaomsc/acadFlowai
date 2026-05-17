import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EditorPage } from '@/features/editor/pages/editor-page'
import { getChapter } from '@/shared/services/chapter.service'
import { renderWithRouter } from '@/test/render-utils'

describe('editor page', () => {
  it('permite navegar entre capítulos e salvar conteúdo mockado', async () => {
    const user = userEvent.setup()

    renderWithRouter([{ path: '/editor/:projectId', element: <EditorPage /> }], ['/editor/project-1'])

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
})
