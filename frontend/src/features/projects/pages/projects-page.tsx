import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, CalendarClock, Download, FilePenLine, GraduationCap, MoreHorizontal, Plus, Presentation, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { archiveProject, projectsQuery } from '@/features/projects/services/projects.service'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { ProgressBar } from '@/shared/components/data-display/progress-bar'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { SearchInput } from '@/shared/components/forms/search-input'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

const statusLabel = {
  planning: ['Planejamento', 'neutral'],
  writing: ['Em escrita', 'primary'],
  review: ['Em revisão', 'warning'],
  defense: ['Defesa', 'info'],
  completed: ['Concluído', 'success'],
} as const

type ExportFormatOption = 'docx' | 'pdf' | 'slides'

const exportFormatMeta: Record<ExportFormatOption, { label: string; helper: string; available: boolean }> = {
  docx: {
    label: 'DOCX',
    helper: 'Documento editável pronto para exportação agora.',
    available: true,
  },
  pdf: {
    label: 'PDF',
    helper: 'Formato final diagramado. Em breve.',
    available: false,
  },
  slides: {
    label: 'Slides acadêmicos',
    helper: 'Apresentação de defesa com estrutura acadêmica. Em breve.',
    available: false,
  },
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [actionFeedback, setActionFeedback] = useState('')
  const [archivingProjectId, setArchivingProjectId] = useState<string | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedExportProject, setSelectedExportProject] = useState<{ id: string; title: string } | null>(null)
  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormatOption>('docx')
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

  async function handleArchiveProject(projectId: string) {
    if (archivingProjectId) return

    setArchivingProjectId(projectId)
    setActionFeedback('')

    try {
      await archiveProject(projectId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      setActionFeedback('Projeto movido para a lixeira com sucesso.')
    } catch (error) {
      setActionFeedback(error instanceof Error ? error.message : 'Não foi possível arquivar o projeto.')
    } finally {
      setArchivingProjectId(null)
    }
  }

  function openExportDialog(project: { id: string; title: string }, format: ExportFormatOption) {
    setSelectedExportProject(project)
    setSelectedExportFormat(format)
    setExportDialogOpen(true)
  }

  function handleConfirmExportFormat() {
    if (!selectedExportProject) return

    navigate(`/projects/${selectedExportProject.id}/export?format=${selectedExportFormat}`)
    setExportDialogOpen(false)
  }

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
      {actionFeedback ? <p className="text-sm text-primary">{actionFeedback}</p> : null}

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
              <Card key={project.id} className="surface-card h-full rounded-[30px]">
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
                <CardContent className="flex h-full flex-col space-y-5">
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
                  <div className="mt-auto pt-2">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <Button variant="outline" asChild className="w-full rounded-2xl">
                        <Link to={`/projects/${project.id}`}>Ver detalhes</Link>
                      </Button>
                      <Button asChild className="w-full rounded-2xl">
                        <Link to={`/editor/${project.id}`}>
                          Abrir editor
                          <FilePenLine className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-2xl"
                            aria-label={`Ações do projeto ${project.title}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60 rounded-[18px]">
                          <DropdownMenuLabel>Ações do projeto</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              openExportDialog({ id: project.id, title: project.title }, 'docx')
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Exportar DOCX
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              openExportDialog({ id: project.id, title: project.title }, 'pdf')
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Exportar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              openExportDialog({ id: project.id, title: project.title }, 'slides')
                            }}
                          >
                            <Presentation className="mr-2 h-4 w-4" />
                            Exportar Slides
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled>
                            Duplicar projeto
                            <span className="ml-auto text-xs text-muted-foreground">Em breve</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              void handleArchiveProject(project.id)
                            }}
                            disabled={archivingProjectId === project.id}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            {archivingProjectId === project.id ? 'Arquivando...' : 'Arquivar projeto'}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir projeto
                            <span className="ml-auto text-xs text-muted-foreground">Em breve</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Escolha o formato de exportação</DialogTitle>
            <DialogDescription>
              {selectedExportProject
                ? `Selecione como deseja exportar o projeto ${selectedExportProject.title}.`
                : 'Selecione como deseja exportar este projeto.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(Object.keys(exportFormatMeta) as ExportFormatOption[]).map((format) => {
              const meta = exportFormatMeta[format]
              const selected = selectedExportFormat === format

              return (
                <button
                  key={format}
                  type="button"
                  onClick={() => setSelectedExportFormat(format)}
                  className={`flex w-full items-start justify-between gap-4 rounded-[22px] border px-4 py-4 text-left transition-colors ${
                    selected
                      ? 'border-primary/45 bg-primary/5'
                      : 'border-border bg-white/70 hover:bg-muted/25'
                  }`}
                >
                  <div>
                    <p className="font-medium text-foreground">{meta.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{meta.helper}</p>
                  </div>
                  {!meta.available ? (
                    <span className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      Em breve
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmExportFormat} disabled={!exportFormatMeta[selectedExportFormat].available}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
