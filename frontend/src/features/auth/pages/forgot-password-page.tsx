import { Link } from 'react-router-dom'
import { ArrowRight, MailCheck } from 'lucide-react'
import { AuthField } from '@/features/auth/components/auth-field'
import { Button } from '@/shared/ui/button'

export function ForgotPasswordPage() {
  return (
    <>
      <div>
        <p className="mb-3 font-sans text-[10px] font-normal uppercase tracking-[0.22em] text-muted-foreground/78">
          Recuperação
        </p>
        <h2 className="mb-2.5 font-serif text-[31px] leading-[1.14] tracking-[-0.03em] text-foreground">
          Redefina sua senha.
        </h2>
        <p className="mb-8 max-w-[292px] font-sans text-[13px] font-normal leading-[1.72] text-muted-foreground/92">
          Enviaremos um link seguro para o e-mail cadastrado para você acessar sua conta
          novamente.
        </p>
      </div>

      <form className="space-y-6">
        <AuthField
          id="email"
          type="email"
          label="E-mail"
          placeholder="voce@universidade.br"
          icon={MailCheck}
        />

        <Button className="auth-primary-button w-full gap-2.5">
          Enviar link de recuperação
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center font-sans text-[12px] font-light text-muted-foreground/92">
        Lembrou da senha?{' '}
        <Link
          to="/login"
          className="auth-link font-medium text-foreground underline underline-offset-2"
        >
          Voltar para login
        </Link>
      </p>
    </>
  )
}
