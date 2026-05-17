import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, FilePenLine, GraduationCap, Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { projectsQuery } from '@/features/projects/services/projects.service'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { ProgressBar } from '@/shared/components/data-display/progress-bar'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { SearchInput } from '@/shared/components/forms/search-input'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

const statusLabel = {
  planning: ['Planejamento', 'neutral'],
  writing: ['Em escrita', 'primary'],
  review: ['Em revisão', 'warning'],
  defense: ['Defesa', 'info'],
  completed: ['Concluído', 'success'],
} as const

export function ProjectsPage() {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const { data, isLoading, isError, refetch } = useQuery(projectsQuery)
  const feedbackMessage =
    typeof location.state === 'object' &&
    location.state &&
    'feedback' in location.state &&
    typeof location.state.feedback === 'string'
      ? location.state.feedback
      : ''

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((project) => {
      const matcher = `${project.title} ${project.course} ${project.institution}`.toLowerCase()
      return matcher.includes(query.toLowerCase())
    })
  }, [data, query])

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError || !data) {
    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Portfólio"
        title="Projetos de TCC"
        description="Gerencie seus TCCs, acompanhe o andamento e entre direto no fluxo de escrita com dados reais."
        action={
          <Button asChild className="rounded-2xl">
            <Link to="/projects/new">
              <Plus className="h-4 w-4" />
              Novo projeto
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full max-w-lg">
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar por título, curso ou instituição..." />
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} projeto(s) disponíveis na sua conta.</p>
      </div>

      {feedbackMessage ? <p className="text-sm text-primary">{feedbackMessage}</p> : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum projeto encontrado"
          description="Ajuste o filtro atual ou crie um novo projeto para iniciar o fluxo de escrita."
          action={
            <Button asChild>
              <Link to="/projects/new">Criar projeto</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {filtered.map((project) => {
            const [label, tone] = statusLabel[project.status]
            const daysToDeadline = Math.ceil(
              (new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            )

            return (
              <Card key={project.id} className="surface-card rounded-[30px]">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge label={label} tone={tone} />
                    <span className="text-xs text-muted-foreground">{project.norm}</span>
                  </div>
                  <div className="space-y-2.5">
                    <CardTitle className="text-[1.35rem] leading-8">
                      <Link to={`/projects/${project.id}`} className="hover:text-primary">
                        {project.title}
                      </Link>
                    </CardTitle>
                    <p className="text-sm leading-6 text-muted-foreground">{project.institution}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>{project.course}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      <span>{daysToDeadline > 0 ? `${daysToDeadline} dias para a entrega` : 'Prazo vencido'}</span>
                    </div>
                  </div>
                  <ProgressBar value={project.progress} label="Progresso" helper={`${project.progress}%`} />
                  <div className="flex items-center justify-between gap-3">
                    <Button variant="outline" asChild className="rounded-2xl">
                      <Link to={`/projects/${project.id}`}>Ver detalhes</Link>
                    </Button>
                    <Button asChild className="rounded-2xl">
                      <Link to={`/editor/${project.id}`}>
                        Abrir editor
                        <FilePenLine className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
