import { Sparkles } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ProjectWizard } from '@/features/projects/components/project-wizard'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { Card, CardContent } from '@/shared/ui/card'

export function NewProjectPage() {
  const location = useLocation()
  const feedbackMessage =
    typeof location.state === 'object' &&
    location.state &&
    'feedback' in location.state &&
    typeof location.state.feedback === 'string'
      ? location.state.feedback
      : ''

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Onboarding do projeto"
        title="Criar novo TCC"
        description="Wizard incremental para sair do briefing e chegar a uma estrutura inicial coerente."
      />

      {feedbackMessage ? <p className="text-sm text-primary">{feedbackMessage}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="surface-card-strong rounded-[30px]">
          <CardContent className="pt-6">
            <ProjectWizard />
          </CardContent>
        </Card>
        <Card className="academic-gradient premium-panel rounded-[30px] border-none text-white">
          <CardContent className="space-y-5 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Migração já orientada a domínio</h3>
              <p className="mt-2 text-sm leading-7 text-white/78">
                Os campos do wizard já refletem entidades, casos de uso e payloads que podem virar APIs depois.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-white/86">
              <li>Projeto, orientador, norma, objetivos e prazo em estruturas separáveis.</li>
              <li>Estrutura conectada ao fluxo real de projetos, capítulos e persistência do TCC.</li>
              <li>Fluxo coerente com o visual premium do projeto original.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
