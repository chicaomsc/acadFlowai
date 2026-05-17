import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ReferencesPage } from '@/features/references/pages/references-page'
import { renderWithProviders } from '@/test/render-utils'

describe('references page', () => {
  it('filtra referências por busca textual', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ReferencesPage />)

    expect(await screen.findByRole('heading', { name: 'Referências' })).toBeInTheDocument()
    expect(screen.getByText('Cognitive tutors: Lessons learned')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Buscar por título ou autor...'), 'VanLehn')

    await waitFor(() => {
      expect(screen.getAllByText(/The relative effectiveness of human tutoring/i).length).toBeGreaterThan(0)
      expect(screen.queryByText('Cognitive tutors: Lessons learned')).not.toBeInTheDocument()
    })
  })

  it('permite marcar uma referência como citada', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ReferencesPage />)

    const title = await screen.findByText('The relative effectiveness of human tutoring, intelligent tutoring systems, and other tutoring systems')
    const card = title.closest('[data-slot="card"]')

    expect(card).not.toBeNull()
    expect(within(card as HTMLElement).getByText('Sem citação')).toBeInTheDocument()

    await user.click(within(card as HTMLElement).getByRole('button', { name: 'Marcar como citado' }))

    await waitFor(() => {
      expect(within(card as HTMLElement).getByText('Citado')).toBeInTheDocument()
    })
  })
})
