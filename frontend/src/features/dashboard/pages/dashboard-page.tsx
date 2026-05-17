import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { dashboardQuery } from '@/features/dashboard/services/dashboard.service'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { ProgressBar } from '@/shared/components/data-display/progress-bar'
import { SectionCard } from '@/shared/components/data-display/section-card'
import { StatCard } from '@/shared/components/data-display/stat-card'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'

const chapterStatusTone = {
  not_started: 'neutral',
  writing: 'primary',
  review: 'warning',
  approved: 'success',
} as const

const chapterStatusLabel = {
  not_started: 'Não iniciado',
  writing: 'Em escrita',
  review: 'Em revisão',
  approved: 'Aprovado',
} as const

const taskStatusLabel = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  completed: 'Concluída',
} as const

const taskPriorityTone = {
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
} as const

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery(dashboardQuery)

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError || !data) {
    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  if (!data.activeProject.id || data.chapters.length === 0) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Painel de execução"
          title="Seu TCC está em andamento"
          description="Crie seu primeiro projeto para começar o fluxo real com capítulos e salvamento no backend."
        />
        <EmptyState
          icon={FileText}
          title="Nenhum projeto ativo ainda"
          description="Depois de criar o TCC, o dashboard passa a compor os dados reais do projeto e dos capítulos."
          action={
            <Button asChild className="rounded-2xl">
              <Link to="/projects/new">Criar projeto</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const pendingTasks = data.timelineTasks
    .filter((task) => task.status !== 'completed')
    .slice()
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.getTime() - b.dueDate.getTime()
    })

  const nextTask = pendingTasks[0]
  const chapterInProgress = data.chapters.find((chapter) => chapter.status === 'writing') ?? data.chapters[0]
  const reviewChapter = data.chapters.find((chapter) => chapter.status === 'review')
  const latestComments = data.advisorComments.slice(0, 2)
  const weeklyWords = data.stats.weeklyProgress.reduce((sum, entry) => sum + entry.words, 0)
  const weeklyPeak = [...data.stats.weeklyProgress].sort((a, b) => b.words - a.words)[0]

  const formatShortDate = (value?: Date) =>
    value
      ? new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: 'short',
        }).format(value)
      : 'Sem data'

  const aiAlerts = [
    {
      id: 'citation-gap',
      title: 'Há referências relevantes ainda fora do texto',
      description: 'Use a próxima sessão de escrita para conectar pelo menos duas fontes à metodologia.',
      tone: 'warning' as const,
      icon: TriangleAlert,
    },
    {
      id: 'review-focus',
      title: reviewChapter
        ? `${reviewChapter.title} pede fechamento de revisão`
        : 'O capítulo atual ainda pode ganhar profundidade',
      description: reviewChapter
        ? 'Consolide os comentários do orientador antes de avançar para a próxima seção.'
        : 'A IA sugere reforçar articulação entre problema e objetivo geral.',
      tone: 'info' as const,
      icon: Sparkles,
    },
    {
      id: 'deadline-focus',
      title: nextTask ? `Sua próxima entrega é ${formatShortDate(nextTask.dueDate)}` : 'Defina a próxima entrega do cronograma',
      description: nextTask
        ? `${nextTask.title} é o item com maior impacto no avanço desta semana.`
        : 'Escolha um marco curto para orientar a próxima sessão de escrita.',
      tone: 'primary' as const,
      icon: CalendarClock,
    },
  ]

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Painel de execução"
        title="Seu TCC está em andamento"
        description="Comece pelo próximo passo mais importante: avançar o capítulo ativo, fechar a meta da semana e responder aos alertas que destravam o projeto."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="section-spacing">
          <SectionCard
            title="Continuar escrita"
            description="Este é o ponto de maior impacto no seu avanço agora."
            action={
              <Button asChild className="rounded-2xl">
                <Link to={`/editor/${data.activeProject.id}`}>
                  Abrir editor
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            }
            className="surface-card-strong h-auto self-start border-primary/12 bg-[linear-gradient(180deg,rgba(18,44,90,0.05),rgba(255,255,255,0.96))]"
          >
            <div className="grid h-auto gap-5 lg:items-start lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge
                    label={chapterStatusLabel[chapterInProgress.status]}
                    tone={chapterStatusTone[chapterInProgress.status]}
                  />
                  <span className="text-sm text-muted-foreground">
                    {chapterInProgress.wordCount} palavras no capítulo atual
                  </span>
                </div>

                <div className="space-y-3">
                  <h2 className="text-[2rem] font-semibold leading-tight tracking-tight text-foreground">
                    {chapterInProgress.title}
                  </h2>
                  <ProgressBar
                    value={data.stats.totalProgress}
                    label="Progresso total do projeto"
                    helper={`${data.stats.chaptersCompleted} de ${data.stats.totalChapters} capítulos já têm base estruturada`}
                  />
                  <p
                    className="max-w-3xl overflow-hidden text-[15px] leading-7 text-muted-foreground"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {chapterInProgress.content ||
                      'O capítulo ainda está em branco. Use a IA para criar uma primeira estrutura e ganhar tração.'}
                  </p>
                </div>

                <div className="grid gap-2.5">
                  <div className="rounded-[22px] border border-border bg-white/72 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Próxima meta
                    </p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {nextTask?.title ?? 'Definir nova entrega'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {nextTask ? `Prazo em ${formatShortDate(nextTask.dueDate)}` : 'Escolha um marco para esta semana'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-border bg-white/72 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Ritmo recente
                    </p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {weeklyWords} palavras na semana
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pico em {weeklyPeak.day} com {weeklyPeak.words} palavras
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-border bg-white/72 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Atenção agora
                    </p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {data.stats.pendingReviews} revisão{data.stats.pendingReviews > 1 ? 'ões' : ''}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Feche pendências antes de abrir novos capítulos
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-primary/10 bg-white/78 p-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    O que fazer agora
                  </p>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="flex items-start gap-3 rounded-[18px] bg-primary/6 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Avance o capítulo ativo</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Finalize a próxima seção da {chapterInProgress.title.toLowerCase()}.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-[18px] border border-border bg-white/84 px-4 py-3">
                    <Clock3 className="mt-0.5 h-4.5 w-4.5 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Feche a meta da semana</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {nextTask?.title ?? 'Defina uma entrega objetiva'} para manter o cronograma.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-[18px] border border-border bg-white/84 px-4 py-3">
                    <TriangleAlert className="mt-0.5 h-4.5 w-4.5 text-rose-600" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Responda aos alertas críticos</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Revise referências soltas e comentários antes da próxima entrega.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <section className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Progresso geral"
              value={`${data.stats.totalProgress}%`}
              helper="Seu projeto já tem base suficiente para manter ritmo de execução."
              footer={`${data.stats.totalChapters - data.stats.chaptersCompleted} capítulos ainda pedem desenvolvimento`}
              icon={TrendingUp}
              tone="primary"
              emphasis
              progress={data.stats.totalProgress}
            />
            <StatCard
              title="Capítulos ativos"
              value={`${data.stats.chaptersCompleted}/${data.stats.totalChapters}`}
              helper="Acompanhe quantas frentes já saíram do zero."
              footer={`${data.stats.pendingReviews} capítulos estão aguardando revisão ou retorno`}
              icon={FileText}
              tone="neutral"
            />
            <StatCard
              title="Base bibliográfica"
              value={data.stats.referencesCount}
              helper="Referências cadastradas para sustentar os próximos argumentos."
              footer="Priorize citar as fontes centrais no capítulo em andamento"
              icon={BookOpen}
              tone="info"
            />
          </section>
        </div>

        <div className="section-spacing">
          <SectionCard
            title="Próxima meta"
            description="Seu cronograma precisa desta entrega para continuar consistente."
            className="surface-card-strong h-auto self-start border-amber-100 bg-[linear-gradient(180deg,rgba(245,158,11,0.04),rgba(255,255,255,0.94))]"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold tracking-tight text-foreground">
                    {formatShortDate(nextTask?.dueDate)}
                  </p>
                  <p className="mt-2 text-base font-medium text-foreground">
                    {nextTask?.title ?? 'Defina a próxima entrega'}
                  </p>
                </div>
                {nextTask ? (
                  <StatusBadge
                    label={taskStatusLabel[nextTask.status]}
                    tone={taskPriorityTone[nextTask.priority]}
                  />
                ) : null}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {nextTask?.description ||
                  'Escolha um marco claro para orientar sua próxima sessão de escrita e revisão.'}
              </p>
              <Button variant="outline" asChild className="w-full rounded-2xl">
                <Link to="/timeline">Abrir cronograma</Link>
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Alertas da IA"
            description="Sinais que merecem atenção antes do próximo avanço."
            className="h-auto self-start"
          >
          <div className="space-y-2">
            {aiAlerts.map((alert) => {
              const Icon = alert.icon
              return (
                <Card
                  key={alert.id}
                  className={
                    alert.tone === 'warning'
                      ? 'rounded-3xl border-amber-100 bg-amber-50/70'
                      : alert.tone === 'info'
                        ? 'rounded-3xl border-sky-100 bg-sky-50/70'
                        : 'rounded-3xl border-primary/10 bg-primary/5'
                  }
                >
                    <CardContent className="flex gap-3 px-5 pt-1.5 pb-5">
                      <Icon
                        className={
                          alert.tone === 'warning'
                            ? 'mt-0.5 h-5 w-5 text-amber-700'
                          : alert.tone === 'info'
                            ? 'mt-0.5 h-5 w-5 text-sky-700'
                            : 'mt-0.5 h-5 w-5 text-primary'
                      }
                    />
                    <div>
                      <p className="font-medium text-foreground">{alert.title}</p>
                      <p className="text-sm leading-5 text-muted-foreground">{alert.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          </SectionCard>
        </div>
      </div>

      <div className="content-grid">
        <SectionCard title="Prioridades da semana" description="Itens que movem o projeto sem dispersão.">
          <div className="space-y-3">
            {pendingTasks.slice(0, 3).map((task, index) => (
              <div
                key={task.id}
                className="flex items-start justify-between gap-4 rounded-[22px] border border-border bg-white/70 px-4 py-4"
              >
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-sm font-semibold text-foreground">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{task.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {task.description || 'Transforme esta entrega em uma etapa clara do cronograma.'}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {task.dueDate ? `Prazo ${formatShortDate(task.dueDate)}` : 'Sem data definida'}
                    </p>
                  </div>
                </div>
                <StatusBadge label={taskStatusLabel[task.status]} tone={taskPriorityTone[task.priority]} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Comentários recentes" description="Retornos que afetam sua próxima sessão de escrita.">
          <div className="space-y-3">
            {latestComments.map((comment) => (
              <div key={comment.id} className="rounded-[22px] border border-border bg-white/70 px-4 py-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{comment.advisorName}</p>
                  <StatusBadge
                    label={comment.resolved ? 'Resolvido' : 'Pendente'}
                    tone={comment.resolved ? 'success' : 'warning'}
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{comment.content}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Capítulos" description="Veja rapidamente onde escrever, revisar ou consolidar.">
          <div className="space-y-3">
            {data.chapters.map((chapter) => (
              <Link
                key={chapter.id}
                to={`/editor/${chapter.projectId}`}
                className="flex items-center justify-between rounded-[22px] border border-border bg-white/65 px-4 py-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted font-semibold text-foreground">
                    {chapter.order}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{chapter.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {chapter.wordCount} palavras{chapter.status === 'review' ? ' · aguardando validação' : ''}
                    </p>
                  </div>
                </div>
                <StatusBadge
                  label={chapterStatusLabel[chapter.status]}
                  tone={chapterStatusTone[chapter.status]}
                />
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Estado geral"
          description="Resumo rápido do que já está sólido e do que ainda exige atenção."
          className="h-full"
        >
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-start gap-3 rounded-[22px] border border-emerald-100 bg-emerald-50/65 px-4 py-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <p className="font-medium text-foreground">Base do projeto consolidada</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  O tema, a estrutura inicial e as referências principais já sustentam a próxima fase da escrita.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[22px] border border-border bg-white/70 px-4 py-4">
              <Clock3 className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Janela atual de avanço</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  O maior ganho agora vem de concluir {chapterInProgress.title.toLowerCase()} e encaixar a próxima entrega do cronograma.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Ritmo semanal"
          description="Seu volume recente de escrita, sem tirar o foco da próxima ação."
          className="xl:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {data.stats.weeklyProgress.map((entry) => (
              <div key={entry.day} className="space-y-3 rounded-[22px] bg-muted/45 p-3 text-center">
                <div className="mx-auto flex h-28 items-end justify-center">
                  <div
                    className="w-8 rounded-t-2xl bg-primary/85"
                    style={{ height: `${Math.max(entry.words / 6, 12)}px` }}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{entry.day}</p>
                  <p className="text-sm font-semibold text-foreground">{entry.words}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
