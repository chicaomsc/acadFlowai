import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, Mail, User } from 'lucide-react'
import { AuthField } from '@/features/auth/components/auth-field'
import { GoogleIcon } from '@/features/auth/components/google-icon'
import { getProjects } from '@/shared/services/project.service'
import { getActiveProjectId, setActiveProjectId } from '@/shared/services/active-project.service'
import { useAppShellStore } from '@/shared/services/app-store'
import { register } from '@/shared/services/auth.service'
import { Button } from '@/shared/ui/button'

export function RegisterPage() {
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
        <h2 className="mb-2 font-serif text-[25px] leading-[1.14] tracking-[-0.03em] text-foreground">
          Crie sua conta.
        </h2>
        <p className="mb-4 max-w-73 font-sans text-[13px] font-normal leading-[1.72] text-muted-foreground/92">
          Organize seu TCC em um workspace só.
        </p>
      </div>

      <form
        className="space-y-2"
        onSubmit={async (event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          setSubmitting(true)
          setErrorMessage('')

          try {
            const user = await register({
              name: String(formData.get('name') ?? ''),
              email: String(formData.get('email') ?? ''),
              password: String(formData.get('password') ?? ''),
            })
            setCurrentUser(user)
            const projects = await getProjects()
            const activeProjectId = getActiveProjectId() ?? projects[0]?.id ?? null

            if (activeProjectId) {
              setActiveProjectId(activeProjectId)
              navigate('/dashboard')
            } else {
              navigate('/projects/new')
            }
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Não foi possível criar a conta.')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <div className="space-y-3">
          <AuthField
            id="name"
            label="Nome"
            placeholder="Seu nome"
            icon={User}
          />
          <AuthField
            id="email"
            type="email"
            label="E-mail"
            placeholder="voce@universidade.br"
            icon={Mail}
          />
          <AuthField
            id="password"
            type="password"
            label="Senha"
            placeholder="Crie uma senha"
            icon={LockKeyhole}
          />
        </div>

        <Button type="submit" className="auth-primary-button w-full gap-2.5" disabled={submitting}>
          {submitting ? 'Criando conta...' : 'Criar conta'}
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
        Já tem conta?{' '}
        <Link
          to="/login"
          className="auth-link font-medium text-foreground underline underline-offset-2"
        >
          Entrar
        </Link>
      </p>
    </>
  )
}
