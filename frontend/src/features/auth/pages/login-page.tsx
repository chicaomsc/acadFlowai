import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { AuthField } from '@/features/auth/components/auth-field'
import { GoogleIcon } from '@/features/auth/components/google-icon'
import { getProjects } from '@/shared/services/project.service'
import { getStoredActiveProjectId, syncActiveProjectId } from '@/shared/services/active-project.service'
import { useAppShellStore } from '@/shared/services/app-store'
import { login } from '@/shared/services/auth.service'
import { Button } from '@/shared/ui/button'

export function LoginPage() {
  const navigate = useNavigate()
  const setCurrentUser = useAppShellStore((state) => state.setCurrentUser)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  return (
    <>
      <div className="space-y-0">
        <p className="mb-3 font-sans text-[10px] font-normal uppercase tracking-[0.22em] text-muted-foreground/78">
          Acesso
        </p>
        <h2 className="mb-2.5 font-serif text-[25px] leading-[1.14] tracking-[-0.03em] text-foreground">
          Acesse sua conta.
        </h2>
        <p className="mb-8 max-w-73 font-sans text-[13px] font-normal leading-[1.72] text-muted-foreground/92">
          Entre para continuar escrevendo seu TCC.
        </p>
      </div>

      <form
        className="space-y-6"
        onSubmit={async (event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          const email = String(formData.get('email') ?? '')
          const password = String(formData.get('password') ?? '')

          setSubmitting(true)
          setErrorMessage('')

          try {
            const user = await login(email, password)
            setCurrentUser(user)
            const projects = await getProjects()
            const activeProjectId = syncActiveProjectId(
              projects.map((project) => project.id),
              getStoredActiveProjectId(),
            )

            if (activeProjectId) {
              navigate('/dashboard')
            } else {
              navigate('/projects/new')
            }
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Não foi possível entrar.')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <div className="space-y-4">
          <AuthField
            id="email"
            type="email"
            label="E-mail"
            placeholder="voce@universidade.br"
            icon={Mail}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between font-sans text-[12px] font-medium text-foreground">
              <label htmlFor="password">Senha</label>
              <Link
                to="/forgot-password"
                className="auth-link font-normal text-[color:var(--auth-focus)] hover:text-[#132338]"
              >
                Esqueci a senha
              </Link>
            </div>
            <AuthField
              id="password"
              type="password"
              placeholder="••••••••"
              icon={LockKeyhole}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="auth-primary-button w-full gap-2.5"
          disabled={submitting}
        >
          {submitting ? 'Entrando...' : 'Entrar'}
          <ArrowRight className="h-4 w-4" />
        </Button>

        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="auth-secondary-button w-full gap-2.5"
        >
          <GoogleIcon />
          Continuar com Google
        </Button>
      </form>

      <p className="mt-6 text-center font-sans text-[12px] font-light text-muted-foreground/92">
        Sem conta?{' '}
        <Link
          to="/cadastro"
          className="auth-link font-medium text-foreground underline underline-offset-2"
        >
          Criar grátis
        </Link>
      </p>
    </>
  )
}
