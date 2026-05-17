import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { chapterQuery, chaptersQuery, editorProjectQuery } from '@/features/editor/services/editor.service'
import { clearActiveProjectId, resolveValidActiveProjectId, setActiveProjectId } from '@/shared/services/active-project.service'
import { projectsQuery } from '@/features/projects/services/projects.service'
import { updateChapterContent } from '@/shared/services/chapter.service'
import { isProjectNotFoundError } from '@/shared/services/project.service'
import { ProgressBar } from '@/shared/components/data-display/progress-bar'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Separator } from '@/shared/ui/separator'
import { Textarea } from '@/shared/ui/textarea'

const responses: Record<string, string> = {
  improve:
    'Texto refinado: a introdução ganha maior precisão conceitual, reduz repetições e fortalece o vínculo entre contexto brasileiro e revisão internacional.',
  academic:
    'Sugestões: substituir expressões coloquiais, explicitar recorte temporal e incluir verbos de análise mais rigorosos.',
  references:
    'Referências sugeridas: VanLehn (2011), Woolf (2009) e Anderson et al. (1995), com encaixe na fundamentação teórica.',
  review:
    'Conformidade ABNT: revisar citações diretas longas, consolidar notas de rodapé e validar lista final de referências.',
}

const chapterTargets = {
  introduction: 500,
  theoretical: 900,
  methodology: 700,
  results: 800,
  conclusion: 450,
  references: 120,
} as const

export function EditorPage() {
  const navigate = useNavigate()
  const { projectId = '' } = useParams()
  const projectQuery = useQuery(editorProjectQuery(projectId))
  const chaptersListQuery = useQuery(chaptersQuery(projectId))
  const { data: projects = [], isLoading: projectsLoading } = useQuery(projectsQuery)
  const queryClient = useQueryClient()
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [aiOpen, setAiOpen] = useState(true)
  const [aiText, setAiText] = useState('Selecione uma ação para gerar revisão textual mockada.')
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const lastSavedContentRef = useRef('')
  const latestContentRef = useRef('')
  const hydratedChapterIdRef = useRef<string | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const chapters = chaptersListQuery.data ?? projectQuery.data?.chapters ?? []
  const selectedChapterQuery = useQuery(chapterQuery(selectedChapterId))

  const selectedChapter = useMemo(
    () => selectedChapterQuery.data ?? chapters.find((chapter) => chapter.id === selectedChapterId) ?? chapters[0] ?? null,
    [chapters, selectedChapterId, selectedChapterQuery.data],
  )

  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId)
    }
  }, [projectId])

  useEffect(() => {
    const resourceMissing =
      isProjectNotFoundError(projectQuery.error) ||
      isProjectNotFoundError(chaptersListQuery.error)

    if (!resourceMissing || projectsLoading) return

    const nextProjectId = resolveValidActiveProjectId(
      projects
        .map((project) => project.id)
        .filter((candidateId) => candidateId !== projectId),
    )

    if (nextProjectId) {
      setActiveProjectId(nextProjectId)
      navigate(`/editor/${nextProjectId}`, { replace: true })
      return
    }

    clearActiveProjectId()
    navigate('/projects/new', { replace: true })
  }, [chaptersListQuery.error, navigate, projectId, projectQuery.error, projects, projectsLoading])

  useEffect(() => {
    if (chapters.length && !selectedChapterId) {
      setSelectedChapterId(chapters[0].id)
    }
  }, [chapters, selectedChapterId])

  useEffect(() => {
    if (selectedChapter && hydratedChapterIdRef.current !== selectedChapter.id) {
      hydratedChapterIdRef.current = selectedChapter.id
      setContent(selectedChapter.content)
      lastSavedContentRef.current = selectedChapter.content
      latestContentRef.current = selectedChapter.content
      setSaveState('idle')
    }
  }, [selectedChapter])

  const saveCurrentContent = useCallback(async () => {
    if (!selectedChapter) return false

    const draft = latestContentRef.current
    if (draft === selectedChapter.content || draft === lastSavedContentRef.current) return false

    setSaveState('saving')
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    await updateChapterContent(selectedChapter.id, draft)
    lastSavedContentRef.current = draft
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['editor-project', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project-details', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['chapters', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['chapter', selectedChapter.id] }),
      queryClient.invalidateQueries({ queryKey: ['references'] }),
      queryClient.invalidateQueries({ queryKey: ['timeline'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] }),
      queryClient.invalidateQueries({ queryKey: ['export-status'] }),
    ])
    setSaveState('saved')
    window.setTimeout(() => setSaveState((current) => (current === 'saved' ? 'idle' : current)), 1500)
    return true
  }, [projectId, queryClient, selectedChapter])

  useEffect(() => {
    if (!selectedChapter) return
    if (content === selectedChapter.content || content === lastSavedContentRef.current) return

    setSaveState('saving')
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      void saveCurrentContent()
    }, 900)

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [content, selectedChapter, saveCurrentContent])

  useEffect(() => {
    latestContentRef.current = content
  }, [content])

  useEffect(() => {
    return () => {
      void saveCurrentContent()
    }
  }, [saveCurrentContent])

  if (projectQuery.isLoading || chaptersListQuery.isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (projectQuery.isError || chaptersListQuery.isError || !projectQuery.data) {
    const resourceMissing =
      isProjectNotFoundError(projectQuery.error) ||
      isProjectNotFoundError(chaptersListQuery.error)

    if (resourceMissing) {
      return (
        <div className="page-shell">
          <EmptyState
            icon={BookOpen}
            title="Projeto não encontrado ou movido para a lixeira"
            description="O editor não encontrou esse projeto. Abra outro TCC disponível ou crie um novo projeto."
            action={
              <Button asChild className="rounded-2xl">
                <Link to="/projects">Voltar para projetos</Link>
              </Button>
            }
          />
        </div>
      )
    }

    return (
      <div className="page-shell">
        <ErrorState
          onRetry={() => {
            void projectQuery.refetch()
            void chaptersListQuery.refetch()
          }}
        />
      </div>
    )
  }

  if (!chapters.length) {
    return (
      <div className="page-shell">
        <EmptyState
          icon={BookOpen}
          title="Nenhum capítulo disponível"
          description="O projeto atual ainda não retornou capítulos da API."
        />
      </div>
    )
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length
  const targetWords = selectedChapter ? chapterTargets[selectedChapter.type] : 500
  const progressValue = Math.min(100, Math.round((wordCount / targetWords) * 100))
  const excerpt = content
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')

  const contextualAlerts = [
    wordCount < targetWords * 0.45
      ? {
          id: 'length',
          title: `Meta parcial abaixo do esperado`,
          description: `Você está em ${wordCount} / ${targetWords} palavras. Vale fechar a próxima seção antes de revisar estilo.`,
          tone: 'warning' as const,
          icon: CircleDashed,
        }
      : {
          id: 'length-ok',
          title: `Volume adequado para esta sessão`,
          description: `O capítulo já sustenta revisão fina. Foque em transições e precisão conceitual.`,
          tone: 'success' as const,
          icon: CheckCircle2,
        },
    content.includes('IA') || content.includes('inteligência artificial')
      ? {
          id: 'concept',
          title: `Conceito recorrente detectado no trecho atual`,
          description: `A IA sugere variar a formulação de "inteligência artificial" e explicitar melhor o recorte aplicado ao TCC.`,
          tone: 'info' as const,
          icon: Sparkles,
        }
      : {
          id: 'cohesion',
          title: `Trecho atual pede amarração argumentativa`,
          description: `Conecte problema, objetivo e justificativa no mesmo parágrafo para reforçar a linha de raciocínio.`,
          tone: 'info' as const,
          icon: Sparkles,
        },
    {
      id: 'abnt',
      title: `Checklist rápido de revisão`,
      description: `Verifique se o trecho visível abre com contexto, cita a fonte central e encerra com ponte para a próxima seção.`,
      tone: 'primary' as const,
      icon: AlertCircle,
    },
  ]

  const contextualSuggestions = [
    {
      key: 'improve',
      label: 'Reescrever o trecho atual com mais clareza',
      helper: excerpt
        ? `Baseado no parágrafo que começa com: "${excerpt.slice(0, 88)}${excerpt.length > 88 ? '...' : ''}"`
        : 'Crie uma primeira formulação mais objetiva para o trecho atual.',
      icon: Wand2,
    },
    {
      key: 'academic',
      label: 'Ajustar tom acadêmico deste capítulo',
      helper: `Prioridade em ${selectedChapter?.title.toLowerCase() ?? 'capítulo atual'}.`,
      icon: BookOpen,
    },
    {
      key: 'references',
      label: 'Sugerir fontes para sustentar o argumento',
      helper: 'Use quando o texto já tem direção, mas ainda falta apoio bibliográfico.',
      icon: Sparkles,
    },
    {
      key: 'review',
      label: 'Revisar aderência ABNT do trecho',
      helper: 'Cheque coesão, citação e consistência estrutural antes de salvar.',
      icon: CheckCircle2,
    },
  ] as const

  return (
    <div className="flex h-[calc(100vh-84px)] min-h-[700px] bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0))]">
      <aside className="hidden w-[314px] border-r border-border bg-white/72 lg:flex lg:flex-col">
        <div className="border-b border-border px-5 py-5">
          <p className="type-card text-foreground">{projectQuery.data.project.title}</p>
          <p className="type-meta mt-1 text-muted-foreground">{chapters.length} capítulos nesta estrutura</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-3">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => {
                  void (async () => {
                    await saveCurrentContent()
                    setSelectedChapterId(chapter.id)
                  })()
                }}
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all ${
                  selectedChapter?.id === chapter.id
                    ? 'border-primary/15 bg-primary/8 text-primary shadow-sm'
                    : 'border-transparent bg-transparent hover:border-white/70 hover:bg-muted/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="type-label truncate text-current">{chapter.title}</p>
                      <p className="type-meta mt-1 text-muted-foreground">{chapter.wordCount} palavras</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-xs font-semibold text-muted-foreground">
                      {chapter.order}
                    </div>
                  </div>
                  <StatusBadge
                    label={
                      chapter.status === 'not_started'
                        ? 'Não iniciado'
                        : chapter.status === 'writing'
                          ? 'Em escrita'
                          : chapter.status === 'review'
                            ? 'Em revisão'
                            : 'Aprovado'
                    }
                    tone={
                      chapter.status === 'approved'
                        ? 'success'
                        : chapter.status === 'review'
                          ? 'warning'
                          : chapter.status === 'writing'
                            ? 'primary'
                            : 'neutral'
                    }
                  />
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-border bg-white/80 px-4 py-4 md:px-6">
          <div className="space-y-2">
            <h1 className="type-heading text-foreground">{selectedChapter?.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <p className="type-body-sm text-muted-foreground">
                {wordCount} palavras no texto atual
              </p>
              <StatusBadge label={`${wordCount} / ${targetWords}`} tone={progressValue >= 100 ? 'success' : 'info'} />
              <StatusBadge
                label={saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? 'Salvo' : 'Auto-save ativo'}
                tone={saveState === 'saving' ? 'warning' : saveState === 'saved' ? 'success' : 'neutral'}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!selectedChapter) return
                if (saveTimeoutRef.current) {
                  window.clearTimeout(saveTimeoutRef.current)
                  saveTimeoutRef.current = null
                }
                setSaving(true)
                setSaveState('saving')
                await updateChapterContent(selectedChapter.id, latestContentRef.current)
                lastSavedContentRef.current = latestContentRef.current
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
                  queryClient.invalidateQueries({ queryKey: ['editor-project', projectId] }),
                  queryClient.invalidateQueries({ queryKey: ['project-details', projectId] }),
                  queryClient.invalidateQueries({ queryKey: ['chapters', projectId] }),
                  queryClient.invalidateQueries({ queryKey: ['chapter', selectedChapter.id] }),
                  queryClient.invalidateQueries({ queryKey: ['references'] }),
                  queryClient.invalidateQueries({ queryKey: ['timeline'] }),
                  queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] }),
                  queryClient.invalidateQueries({ queryKey: ['export-status'] }),
                ])
                setSaving(false)
                setSaveState('saved')
              }}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setAiOpen((current) => !current)}>
              {aiOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-[860px] rounded-[32px] border border-primary/10 bg-white/84 px-6 py-8 shadow-[0_24px_50px_rgba(20,33,61,0.06)] md:px-10 md:py-10">
              <div className="mb-6 space-y-4 border-b border-border/70 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="type-meta uppercase tracking-[0.2em] text-muted-foreground">Sessão ativa</p>
                    <p className="type-body-sm mt-1 text-muted-foreground">
                      Meta desta escrita: consolidar {selectedChapter?.title.toLowerCase()} com clareza e suporte acadêmico.
                    </p>
                  </div>
                  <StatusBadge label={progressValue >= 100 ? 'Meta atingida' : 'Escrita em progresso'} tone={progressValue >= 100 ? 'success' : 'info'} />
                </div>
                <ProgressBar
                  value={progressValue}
                  label="Meta de palavras do capítulo"
                  helper={`${wordCount} / ${targetWords} palavras para esta sessão`}
                />
              </div>

              <div className="rounded-[28px] border border-primary/10 bg-[linear-gradient(180deg,rgba(24,53,104,0.02),rgba(255,255,255,0.72))] px-5 py-5 md:px-6">
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="min-h-[720px] resize-none border-none bg-transparent p-0 text-[15.5px] leading-[1.85] shadow-none focus-visible:ring-0"
                  placeholder="Comece a escrever aqui..."
                />
              </div>
            </div>
          </div>

          {aiOpen ? (
            <aside className="hidden w-[380px] border-l border-border bg-muted/25 xl:flex xl:flex-col">
              <div className="border-b border-border px-5 py-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="type-card text-foreground">IA contextual</p>
                </div>
                <p className="type-meta mt-1 text-muted-foreground">
                  Sugestões baseadas no capítulo ativo e no texto visível.
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-5 p-5">
                  <div className="rounded-[24px] border border-primary/10 bg-primary/5 px-4 py-4">
                    <p className="type-meta uppercase tracking-[0.18em] text-primary">Leitura atual</p>
                    <p className="type-body-sm mt-2 text-muted-foreground">
                      {excerpt
                        ? excerpt
                        : 'Escreva o primeiro parágrafo para destravar análise contextual e sugestões mais precisas.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {contextualAlerts.map((alert) => {
                      const Icon = alert.icon
                      return (
                        <div
                          key={alert.id}
                          className={
                            alert.tone === 'warning'
                              ? 'rounded-[22px] border border-amber-100 bg-amber-50/75 px-4 py-4'
                              : alert.tone === 'success'
                                ? 'rounded-[22px] border border-emerald-100 bg-emerald-50/75 px-4 py-4'
                                : alert.tone === 'primary'
                                  ? 'rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-4'
                                  : 'rounded-[22px] border border-sky-100 bg-sky-50/75 px-4 py-4'
                          }
                        >
                          <div className="flex gap-3">
                            <Icon className="mt-0.5 h-4.5 w-4.5 text-current" />
                            <div>
                              <p className="type-label text-foreground">{alert.title}</p>
                              <p className="type-body-sm mt-1 text-muted-foreground">{alert.description}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="type-label text-foreground">Ações sugeridas para este trecho</p>
                    {contextualSuggestions.map(({ key, label, helper, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAiText(responses[key])}
                        className="w-full rounded-[22px] border border-border bg-white px-4 py-4 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="mt-0.5 h-5 w-5 text-primary" />
                          <div>
                            <p className="type-label text-foreground">{label}</p>
                            <p className="type-body-sm mt-1 text-muted-foreground">{helper}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <Separator />

                  <div className="rounded-[24px] border border-border bg-white px-4 py-4">
                    <p className="type-label text-foreground">Resposta da IA</p>
                    <p className="type-body-sm mt-3 whitespace-pre-wrap text-muted-foreground">{aiText}</p>
                  </div>
                </div>
              </ScrollArea>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
