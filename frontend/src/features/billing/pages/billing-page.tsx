import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { billingQuery } from '@/features/billing/services/billing.service'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Switch } from '@/shared/ui/switch'

export function BillingPage() {
  const [annual, setAnnual] = useState(false)
  const { data, isLoading, isError, refetch } = useQuery(billingQuery)

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError || !data) {
    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Revenue"
        title="Planos e preços"
        description="Estrutura comercial mockada para Free, Pro Aluno, Defesa, Orientador e futura camada Institution."
        action={
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/80 px-4 py-3">
            <span className="text-sm text-muted-foreground">Mensal</span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className="text-sm font-medium text-foreground">Anual</span>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-4">
        {data.map((plan) => (
          <Card
            key={plan.id}
            className={`rounded-[30px] ${plan.recommended ? 'surface-card-strong ring-1 ring-primary/15' : 'surface-card'}`}
          >
            <CardHeader className="space-y-4">
              {plan.recommended ? (
                <div className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  Recomendado
                </div>
              ) : null}
              <div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <p className="mt-3 text-4xl font-semibold text-foreground">
                  {plan.price === 0 ? 'Grátis' : `R$ ${(annual ? plan.price * 10 : plan.price).toFixed(2)}`}
                </p>
                {plan.price !== 0 ? <p className="text-sm text-muted-foreground">por {annual ? 'ano' : 'mês'}</p> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm leading-6 text-muted-foreground">
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full rounded-2xl" variant={plan.recommended ? 'default' : 'outline'}>
                Selecionar plano
              </Button>
            </CardContent>
          </Card>
        ))}
        <Card className="rounded-[30px] border-dashed border-border bg-white/60">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Roadmap</p>
            <h3 className="text-2xl font-semibold text-foreground">Institution</h3>
            <p className="text-sm leading-7 text-muted-foreground">
              Camada futura para cursos e universidades com gestão multiusuário, métricas e governança.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
