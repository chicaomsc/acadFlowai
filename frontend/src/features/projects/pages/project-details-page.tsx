import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BookOpen, CalendarClock, FileStack, Pencil, Trash2, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { archiveProject, projectDetailsQuery, projectsQuery, updateProject } from '@/features/projects/services/projects.service'
import { clearActiveProjectId, resolveValidActiveProjectId, setActiveProjectId } from '@/shared/services/active-project.service'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { ProgressBar } from '@/shared/components/data-display/progress-bar'
import { SectionCard } from '@/shared/components/data-display/section-card'
import { StatCard } from '@/shared/components/data-display/stat-card'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import { isProjectNotFoundError } from '@/shared/services/project.service'

export function ProjectDetailsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { projectId = '' } = useParams()
  const { data, isLoading, isError, error, refetch } = useQuery(projectDetailsQuery(projectId))
  const {
    data: projects = [],
    isLoading: projectsLoading,
  } = useQuery(projectsQuery)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    subtitle: '',
    course: '',
    institution: '',
    academicDegree: '',
    advisorName: '',
    deadline: '',
    norm: 'ABNT' as 'ABNT' | 'APA' | 'Vancouver',
    defenseCity: '',
    defenseYear: '',
    theme: '',
    researchProblem: '',
    generalObjective: '',
    specificObjectives: '',
    keywords: '',
  })

  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId)
    }
  }, [projectId])

  useEffect(() => {
    if (!data) return

    setEditForm({
      title: data.project.title,
      subtitle: data.project.subtitle ?? '',
      course: data.project.course,
      institution: data.project.institution,
      academicDegree: data.project.academicDegree ?? '',
      advisorName: data.project.advisorName ?? '',
      deadline: toDateInputValue(data.project.deadline),
      norm: data.project.norm,
      defenseCity: data.project.defenseCity ?? '',
      defenseYear: data.project.defenseYear ? String(data.project.defenseYear) : '',
      theme: data.project.theme ?? '',
      researchProblem: data.project.researchProblem ?? '',
      generalObjective: data.project.generalObjective ?? '',
      specificObjectives: data.project.specificObjectives?.join('\n') ?? '',
      keywords: data.project.keywords?.join('; ') ?? '',
    })
  }, [data])

  useEffect(() => {
    if (!isError || !isProjectNotFoundError(error) || projectsLoading) return

    const nextProjectId = resolveValidActiveProjectId(
      projects
        .map((project) => project.id)
        .filter((candidateId) => candidateId !== projectId),
    )

    if (nextProjectId) {
      setActiveProjectId(nextProjectId)
      return
    }

    clearActiveProjectId()
  }, [error, isError, projectId, projects, projectsLoading])

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError) {
    if (isProjectNotFoundError(error)) {
      return (
        <div className="page-shell">
          <EmptyState
            icon={FileStack}
            title="Projeto não encontrado ou movido para a lixeira"
            description="O link atual não aponta mais para um projeto disponível. Volte para a lista para abrir outro TCC."
            action={
              <Button asChild className="rounded-2xl">
                <Link to="/projects">Voltar para projetos</Link>
              </Button>
            }
          />
        </div>
      )
    }

    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  if (!data) {
    return (
      <div className="page-shell">
        <EmptyState
          icon={FileStack}
          title="Projeto não encontrado ou movido para a lixeira"
          description="O link atual não aponta mais para um projeto disponível. Volte para a lista para abrir outro TCC."
          action={
            <Button asChild className="rounded-2xl">
              <Link to="/projects">Voltar para projetos</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const project = data.project

  async function handleUpdateProject() {
    if (saving) return

    setSaving(true)
    setFeedback(null)

    try {
      await updateProject(projectId, {
        title: editForm.title,
        subtitle: editForm.subtitle,
        course: editForm.course,
        institution: editForm.institution,
        academicDegree: editForm.academicDegree,
        advisorName: editForm.advisorName,
        deadline: editForm.deadline,
        norm: editForm.norm,
        theme: editForm.theme,
        researchProblem: editForm.researchProblem,
        generalObjective: editForm.generalObjective,
        specificObjectives: editForm.specificObjectives.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        defenseCity: editForm.defenseCity,
        defenseYear: editForm.defenseYear ? Number(editForm.defenseYear) : undefined,
        abstractPt: project.abstractPt ?? '',
        abstractEn: project.abstractEn ?? '',
        keywords: editForm.keywords.split(/;\s*|,\s*/).map((item) => item.trim()).filter(Boolean),
      })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['project-details', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['editor-project', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['export-status'] }),
      ])

      setEditDialogOpen(false)
      setFeedback({ tone: 'success', message: 'Projeto atualizado com sucesso.' })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível atualizar o projeto.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleArchiveProject() {
    if (archiving) return

    setArchiving(true)
    setFeedback(null)

    try {
      await archiveProject(projectId)
      const remainingProjects = (await getRefreshedProjects(queryClient))?.filter((project) => project.id !== projectId) ?? []
      const nextProjectId = resolveValidActiveProjectId(remainingProjects.map((project) => project.id))

      if (nextProjectId) {
        setActiveProjectId(nextProjectId)
      } else {
        clearActiveProjectId()
      }

      setArchiveDialogOpen(false)
      navigate(nextProjectId ? '/projects' : '/projects/new', {
        replace: true,
        state: {
          feedback: 'Projeto movido para a lixeira com sucesso.',
        },
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível arquivar o projeto.',
      })
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Projeto"
        title={data.project.title}
        description={
          data.project.subtitle ||
          data.project.theme ||
          'Projeto acadêmico pronto para entrar em escrita, revisão e exportação.'
        }
        action={
          <div className="flex flex-wrap gap-3">
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-2xl">
                  <Pencil className="h-4 w-4" />
                  Editar projeto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[calc(100vh-48px)] overflow-hidden p-0 sm:max-w-3xl">
                <DialogHeader className="border-b border-border bg-background px-6 py-5">
                  <DialogTitle>Editar projeto</DialogTitle>
                  <DialogDescription>Ajuste o briefing acadêmico do projeto. Resumo e abstract continuam concentrados no editor documental.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-5">
                  <div className="space-y-6 pb-4">
                    <ProjectSection title="Identificação" description="Dados centrais para nomear e enquadrar o trabalho.">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Título" className="md:col-span-2">
                          <Input
                            value={editForm.title}
                            onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                            className="h-12 rounded-2xl"
                          />
                        </Field>
                        <Field label="Subtítulo" className="md:col-span-2">
                          <Input
                            value={editForm.subtitle}
                            onChange={(event) => setEditForm((current) => ({ ...current, subtitle: event.target.value }))}
                            className="h-12 rounded-2xl"
                          />
                        </Field>
                        <Field label="Norma">
                          <Select
                            value={editForm.norm}
                            onValueChange={(value) => setEditForm((current) => ({ ...current, norm: value as 'ABNT' | 'APA' | 'Vancouver' }))}
                          >
                            <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ABNT">ABNT</SelectItem>
                              <SelectItem value="APA">APA</SelectItem>
                              <SelectItem value="Vancouver">Vancouver</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Grau acadêmico">
                          <Input
                            value={editForm.academicDegree}
                            onChange={(event) => setEditForm((current) => ({ ...current, academicDegree: event.target.value }))}
                            className="h-12 rounded-2xl"
                          />
                        </Field>
                      </div>
                    </ProjectSection>

                    <ProjectSection title="Instituição e curso" description="Contexto institucional do projeto.">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Instituição">
                          <Input
                            value={editForm.institution}
                            onChange={(event) => setEditForm((current) => ({ ...current, institution: event.target.value }))}
                            className="h-12 rounded-2xl"
                          />
                        </Field>
                        <Field label="Curso">
                          <Input
                            value={editForm.course}
                            onChange={(event) => setEditForm((current) => ({ ...current, course: event.target.value }))}
                            className="h-12 rounded-2xl"
                          />
                        </Field>
                      </div>
                    </ProjectSection>

                    <ProjectSection title="Defesa" description="Orientação, prazo e identificação formal da defesa.">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Orientador" className="md:col-span-2">
                          <Input
                            value={editForm.advisorName}
                            onChange={(event) => setEditForm((current) => ({ ...current, advisorName: event.target.value }))}
                            className="h-12 rounded-2xl"
                          />
                        </Field>
                        <Field label="Prazo">
                          <Input
                            type="date"
                            value={editForm.deadline}
                            onChange={(event) => setEditForm((current) => ({ ...current, deadline: event.target.value }))}
                            className="h-12 rounded-2xl"
                          />
                        </Field>
                        <Field label="Cidade da defesa">
                          <Input
                            value={editForm.defenseCity}
                            onChange={(event) => setEditForm((current) => ({ ...current, defenseCity: event.target.value }))}
                            className="h-12 rounded-2xl"
                          />
                        </Field>
                        <Field label="Ano da defesa">
                          <Input
                            type="number"
                            min="1900"
                            max="2999"
                            value={editForm.defenseYear}
                            onChange={(event) => setEditForm((current) => ({ ...current, defenseYear: event.target.value }))}
                            className="h-12 rounded-2xl"
                          />
                        </Field>
                      </div>
                    </ProjectSection>

                    <ProjectSection title="Pesquisa" description="Recorte temático e problema que sustentam o TCC.">
                      <div className="grid gap-4">
                        <Field label="Tema">
                          <Input
                            value={editForm.theme}
                            onChange={(event) => setEditForm((current) => ({ ...current, theme: event.target.value }))}
                            className="h-12 rounded-2xl"
                          />
                        </Field>
                        <Field label="Problema de pesquisa">
                          <Textarea
                            value={editForm.researchProblem}
                            onChange={(event) => setEditForm((current) => ({ ...current, researchProblem: event.target.value }))}
                            className="min-h-[120px] rounded-[24px]"
                          />
                        </Field>
                      </div>
                    </ProjectSection>

                    <ProjectSection title="Objetivos" description="Direção do estudo em nível geral e específico.">
                      <div className="grid gap-4">
                        <Field label="Objetivo geral">
                          <Textarea
                            value={editForm.generalObjective}
                            onChange={(event) => setEditForm((current) => ({ ...current, generalObjective: event.target.value }))}
                            className="min-h-[120px] rounded-[24px]"
                          />
                        </Field>
                        <Field label="Objetivos específicos">
                          <Textarea
                            value={editForm.specificObjectives}
                            onChange={(event) => setEditForm((current) => ({ ...current, specificObjectives: event.target.value }))}
                            className="min-h-[160px] rounded-[24px]"
                            placeholder="Um objetivo por linha"
                          />
                        </Field>
                      </div>
                    </ProjectSection>

                    <ProjectSection title="Metadata" description="Campos usados em apresentação, indexação e exportação do projeto.">
                      <div className="grid gap-4">
                        <Field label="Palavras-chave">
                          <Input
                            value={editForm.keywords}
                            onChange={(event) => setEditForm((current) => ({ ...current, keywords: event.target.value }))}
                            className="h-12 rounded-2xl"
                            placeholder="Ex: inteligência artificial; ensino superior"
                          />
                        </Field>
                      </div>
                    </ProjectSection>
                  </div>
                </div>
                <DialogFooter className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={() => void handleUpdateProject()} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar projeto'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-2xl">
                  <Trash2 className="h-4 w-4" />
                  Mover para a lixeira
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Arquivar projeto</DialogTitle>
                  <DialogDescription>O projeto sairá da lista principal, mas essa ação não representa exclusão definitiva.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={() => void handleArchiveProject()} disabled={archiving}>
                    {archiving ? 'Movendo...' : 'Mover para a lixeira'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button asChild className="rounded-2xl">
              <Link to={`/editor/${data.project.id}`}>
                Ir para o editor
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      {feedback ? (
        <p className={feedback.tone === 'success' ? 'text-sm text-primary' : 'text-sm text-destructive'}>
          {feedback.message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Progresso" value={`${data.project.progress}%`} helper="Andamento consolidado do projeto" icon={FileStack} />
        <StatCard title="Capítulos" value={data.chapters.length} helper="Estrutura montada com status separado" icon={BookOpen} />
        <StatCard title="Referências" value={data.references.length} helper="Associadas ao projeto atual" icon={BookOpen} />
        <StatCard title="Comentários" value={data.comments.length} helper="Retornos do orientador" icon={Users} />
      </div>

      <div className="content-grid">
        <div className="space-y-6">
          <SectionCard title="Resumo executivo" description="Briefing consolidado do TCC.">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-foreground">Problema de pesquisa</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.project.researchProblem}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Objetivo geral</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.project.generalObjective}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <MetaBlock label="Grau acadêmico" value={data.project.academicDegree} />
              <MetaBlock label="Cidade da defesa" value={data.project.defenseCity} />
              <MetaBlock
                label="Ano da defesa"
                value={data.project.defenseYear ? String(data.project.defenseYear) : ''}
              />
            </div>
            <div className="mt-5">
              <ProgressBar value={data.project.progress} label="Progresso do trabalho" />
            </div>
          </SectionCard>

          <SectionCard title="Objetivos específicos">
            <div className="grid gap-3">
              {data.project.specificObjectives?.map((item) => (
                <div key={item} className="rounded-[22px] border border-border bg-muted/30 px-4 py-4 text-sm text-foreground">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Metadata acadêmica" description="Campos mínimos usados para folha de rosto, resumo e identificação institucional.">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-foreground">Subtítulo</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.project.subtitle || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Resumo em português</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.project.abstractPt || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Abstract em inglês</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.project.abstractEn || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Palavras-chave</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {data.project.keywords?.length ? data.project.keywords.join(', ') : 'Não informado'}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Agenda acadêmica">
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 rounded-[22px] border border-border bg-white/70 px-4 py-4">
                <CalendarClock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Prazo final</p>
                  <p className="text-muted-foreground">{new Date(data.project.deadline).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
                <p className="font-medium text-foreground">Orientador</p>
                <p className="mt-1 text-muted-foreground">{data.project.advisorName ?? 'Não definido'}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Próximos itens">
            <div className="space-y-3">
              {data.tasks.slice(0, 4).map((task) => (
                <div key={task.id} className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
                  <p className="font-medium text-foreground">{task.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{task.status.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  )
}

function ProjectSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[24px] border border-border bg-muted/20 px-4 py-4 md:px-5 md:py-5">
      <div className="mb-4 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function MetaBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{value || 'Não informado'}</p>
    </div>
  )
}

function toDateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

async function getRefreshedProjects(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['projects'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['project-details'] }),
    queryClient.invalidateQueries({ queryKey: ['editor-project'] }),
    queryClient.invalidateQueries({ queryKey: ['export-status'] }),
  ])

  return queryClient.fetchQuery(projectsQuery)
}
