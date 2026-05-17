import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoginPage } from '@/features/auth/pages/login-page'
import { RegisterPage } from '@/features/auth/pages/register-page'
import { renderWithRouter } from '@/test/render-utils'

describe('auth pages', () => {
  it('renderiza login com e-mail, senha e link de recuperação', () => {
    renderWithRouter([{ path: '/login', element: <LoginPage /> }], ['/login'])

    expect(screen.getByRole('heading', { name: 'Acesse sua conta.' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Esqueci a senha' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('button', { name: /continuar com google/i })).toBeInTheDocument()
  })

  it('renderiza cadastro com nome, sem link de recuperação e CTA correto', () => {
    renderWithRouter([{ path: '/cadastro', element: <RegisterPage /> }], ['/cadastro'])

    expect(screen.getByRole('heading', { name: 'Crie sua conta.' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.queryByText('Esqueci a senha')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continuar com google/i })).toBeInTheDocument()
  })
})
