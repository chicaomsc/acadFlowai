import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  FileImage,
  FileSpreadsheet,
  LayoutPanelTop,
  LoaderCircle,
  Link2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Quote,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { chapterCitationsQuery, projectCitationsQuery } from '@/features/editor/services/citations.service'
import { chapterQuery, chaptersQuery, editorProjectQuery } from '@/features/editor/services/editor.service'
import { referencesQuery } from '@/features/references/services/references.service'
import { clearActiveProjectId, resolveValidActiveProjectId, setActiveProjectId } from '@/shared/services/active-project.service'
import { createCitation, deleteCitation } from '@/shared/services/citation.service'
import { createReference } from '@/shared/services/reference.service'
import { projectsQuery } from '@/features/projects/services/projects.service'
import { updateChapterContent } from '@/shared/services/chapter.service'
import { isProjectNotFoundError, updateProject } from '@/shared/services/project.service'
import { countWords } from '@/shared/utils/domain-logic'
import { Button } from '@/shared/ui/button'
import { ProgressBar } from '@/shared/components/data-display/progress-bar'
import { SectionCard } from '@/shared/components/data-display/section-card'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Separator } from '@/shared/ui/separator'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import type { Chapter, Citation, CitationDisplayMode, CitationType, Reference } from '@/shared/types/contracts'

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
} as const

type DocumentStatus = 'completed' | 'writing' | 'pending'
type ProjectNodeId = 'abstractPt' | 'abstractEn' | 'references'
type EditorNodeId = ProjectNodeId | `chapter:${string}`
type CitationFormState = {
  referenceId: string
  type: CitationType
  displayMode: CitationDisplayMode
  page: string
  quotedText: string
  apudAuthor: string
  apudYear: string
}
type ChapterEditorHandle = {
  focusAtEnd: () => void
  insertCitation: (citationId: string, citation?: Citation) => string
}
type QuickReferenceFormState = {
  type: 'article' | 'book' | 'website'
  authors: string
  title: string
  year: string
  source: string
  url: string
}

const CITE_MARKER_REGEX = /\[\[@CITE:([^\]]+)\]\]/g
const defaultCitationFormState: CitationFormState = {
  referenceId: '',
  type: 'indirect',
  displayMode: 'parenthetical',
  page: '',
  quotedText: '',
  apudAuthor: '',
  apudYear: '',
}

const citationTypeOptions: Array<{ value: CitationType; label: string; helper: string }> = [
  { value: 'indirect', label: 'Indireta', helper: 'Paráfrase com base na obra escolhida.' },
  { value: 'direct_short', label: 'Direta curta', helper: 'Trecho literal curto, integrado ao parágrafo.' },
  { value: 'direct_long', label: 'Direta longa', helper: 'Trecho literal longo, tratado como bloco.' },
  { value: 'apud', label: 'Apud', helper: 'Citação de citação com autor e ano intermediários.' },
]
const quickReferenceDefaultFormState: QuickReferenceFormState = {
  type: 'article',
  authors: '',
  title: '',
  year: '',
  source: '',
  url: '',
}

function isChapterNode(nodeId: EditorNodeId) {
  return nodeId.startsWith('chapter:')
}

function getChapterIdFromNode(nodeId: EditorNodeId) {
  return isChapterNode(nodeId) ? nodeId.replace('chapter:', '') : null
}

function getRouteNodeFromEditorNode(nodeId: EditorNodeId): string {
  if (nodeId === 'abstractPt') return 'summary'
  if (nodeId === 'abstractEn') return 'abstract'
  if (nodeId === 'references') return 'references'
  return getChapterIdFromNode(nodeId) ?? ''
}

function getEditorNodeFromRouteNode(
  routeNode: string | undefined,
  availableChapterIds: string[],
): EditorNodeId | null {
  if (!routeNode) return null
  if (routeNode === 'summary') return 'abstractPt'
  if (routeNode === 'abstract') return 'abstractEn'
  if (routeNode === 'references') return 'references'
  if (availableChapterIds.includes(routeNode)) return `chapter:${routeNode}`
  return null
}

function buildCitationMarker(citationId: string) {
  return `[[@CITE:${citationId}]]`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getPrimaryAuthorSurname(reference: Reference) {
  const primary = reference.authors[0] ?? 'AUTOR'
  return primary.split(',')[0]?.trim() || primary.trim()
}

function formatCitationAuthorLabel(reference?: Reference, variant: 'upper' | 'title' = 'upper') {
  if (!reference) return 'Referência sem vínculo'

  const formatSurname = (author: string) => {
    const rawSurname = author.split(',')[0]?.trim() || author.trim()
    if (variant === 'title') {
      return rawSurname.charAt(0).toUpperCase() + rawSurname.slice(1).toLowerCase()
    }
    return rawSurname.toUpperCase()
  }

  const primarySurname = formatSurname(getPrimaryAuthorSurname(reference))
  const secondarySurname = reference.authors[1] ? formatSurname(reference.authors[1]) : undefined
  const authorsLabel = secondarySurname ? `${primarySurname}; ${secondarySurname}` : primarySurname
  const suffix = reference.authors.length > 2 ? ' et al.' : ''
  return `${authorsLabel}${suffix}`
}

function formatCitationReference(reference?: Reference) {
  if (!reference) return 'Referência sem vínculo'

  const authorsLabel = formatCitationAuthorLabel(reference)
  return `${authorsLabel}, ${reference.year}`
}

export function resolveCitationDisplayMode(citation?: Pick<Citation, 'displayMode' | 'citationDisplayMode'>): CitationDisplayMode {
  if (citation?.citationDisplayMode === 'narrative' || citation?.displayMode === 'narrative') {
    return 'narrative'
  }

  return 'parenthetical'
}

function getCitationTypeLabel(type: CitationType) {
  return citationTypeOptions.find((option) => option.value === type)?.label ?? 'Citação'
}

function getQuickReferenceSourceLabel(type: QuickReferenceFormState['type']) {
  switch (type) {
    case 'book':
      return 'Editora'
    case 'website':
      return 'Site'
    case 'article':
    default:
      return 'Periódico'
  }
}

function buildCitationPreviewLabel(citation?: Citation) {
  if (!citation) return '[Citação removida]'

  const base = formatCitationReference(citation.reference)
  const page = citation.page ? `, p. ${citation.page}` : ''
  const apud = citation.type === 'apud' && citation.apudAuthor
    ? ` apud ${citation.apudAuthor}${citation.apudYear ? `, ${citation.apudYear}` : ''}`
    : ''

  return `[Citação: ${base}${page}${apud}]`
}

export function buildCitationAbntPreview(citation?: Citation) {
  if (!citation?.reference) return '(Citação não encontrada)'

  const base = formatCitationReference(citation.reference)
  const page = citation.page ? `, p. ${citation.page}` : ''
  if (resolveCitationDisplayMode(citation) === 'narrative') {
    const narrativeBase = formatCitationAuthorLabel(citation.reference, 'title')

    if (citation.type === 'apud' && citation.apudAuthor) {
      const apudAuthor = citation.apudAuthor.charAt(0).toUpperCase() + citation.apudAuthor.slice(1).toLowerCase()
      return `${narrativeBase} apud ${apudAuthor} (${citation.apudYear ?? '?'})`
    }

    return `${narrativeBase} (${citation.reference.year}${page})`
  }

  const apud = citation.type === 'apud' && citation.apudAuthor
    ? ` apud ${citation.apudAuthor}${citation.apudYear ? `, ${citation.apudYear}` : ''}`
    : ''
  return `(${base}${page}${apud})`
}

function replaceCitationMarkers(content: string, citationsMap: Map<string, Citation>) {
  return content.replace(CITE_MARKER_REGEX, (_, citationId: string) => buildCitationPreviewLabel(citationsMap.get(citationId)))
}

export function extractCitationIds(content: string) {
  return Array.from(content.matchAll(CITE_MARKER_REGEX), (match) => match[1])
}

function getCitationChipLabel(citation?: Citation) {
  return citation ? buildCitationAbntPreview(citation) : '(Citação não encontrada)'
}

function getCitationChipTooltip(citationId: string, citation?: Citation) {
  if (!citation) {
    return `Marcador ${buildCitationMarker(citationId)} não encontrado na lista de citações do projeto.`
  }

  return `${getCitationTypeLabel(citation.type)} • ${citation.reference?.abntFormatted ?? buildCitationPreviewLabel(citation)}`
}

function createCitationChipNode(doc: Document, citationId: string, citation?: Citation) {
  const chip = doc.createElement('span')
  chip.dataset.citationId = citationId
  chip.contentEditable = 'false'
  chip.className = citation
    ? 'inline rounded-sm border-b border-dotted border-primary/35 px-0.5 text-[0.98em] leading-[inherit] text-foreground align-baseline'
    : 'inline rounded-sm border-b border-dotted border-amber-400/70 px-0.5 text-[0.98em] leading-[inherit] text-amber-800 align-baseline'
  chip.textContent = getCitationChipLabel(citation)
  chip.title = getCitationChipTooltip(citationId, citation)
  chip.setAttribute('aria-label', getCitationChipTooltip(citationId, citation))
  chip.setAttribute('tabindex', '0')
  return chip
}

function appendTextWithCitationChips(root: HTMLElement, content: string, citationsMap: Map<string, Citation>) {
  let lastIndex = 0

  content.replace(CITE_MARKER_REGEX, (match, citationId: string, offset: number) => {
    if (offset > lastIndex) {
      root.append(document.createTextNode(content.slice(lastIndex, offset)))
    }

    root.append(createCitationChipNode(root.ownerDocument, citationId, citationsMap.get(citationId)))
    lastIndex = offset + match.length
    return match
  })

  if (lastIndex < content.length) {
    root.append(document.createTextNode(content.slice(lastIndex)))
  }
}

function renderContentEditableValue(root: HTMLElement, content: string, citationsMap: Map<string, Citation>) {
  root.replaceChildren()
  appendTextWithCitationChips(root, content, citationsMap)
}

function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (!(node instanceof HTMLElement)) {
    return ''
  }

  if (node.dataset.citationId) {
    return buildCitationMarker(node.dataset.citationId)
  }

  if (node.tagName === 'BR') {
    return '\n'
  }

  const childContent = Array.from(node.childNodes).map(serializeEditorNode).join('')
  if (node.tagName === 'DIV' || node.tagName === 'P') {
    return `${childContent}\n`
  }

  return childContent
}

function serializeEditorContent(root: HTMLElement) {
  return Array.from(root.childNodes).map(serializeEditorNode).join('').replace(/\n$/, '')
}

function moveCaretAfterNode(node: Node) {
  const selection = window.getSelection()
  if (!selection) return

  const range = document.createRange()
  range.setStartAfter(node)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function placeCaretAtEnd(root: HTMLElement) {
  root.focus()
  const selection = window.getSelection()
  if (!selection) return

  const range = document.createRange()
  range.selectNodeContents(root)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

function removeCitationMarker(content: string, citationId: string) {
  const markerRegex = new RegExp(escapeRegExp(buildCitationMarker(citationId)), 'g')
  return content.replace(markerRegex, '')
}

function normalizeTextStatus(wordCount: number, minimumWords: number): DocumentStatus {
  if (wordCount === 0) return 'pending'
  if (wordCount < minimumWords) return 'writing'
  return 'completed'
}

function normalizeChapterStatus(chapter: Chapter): DocumentStatus {
  if (chapter.status === 'approved') return 'completed'
  if (chapter.status === 'writing' || chapter.status === 'review') return 'writing'
  return 'pending'
}

function getChapterTargetWords(chapter: Chapter | null) {
  if (!chapter) return 500

  switch (chapter.type) {
    case 'introduction':
      return chapterTargets.introduction
    case 'theoretical':
      return chapterTargets.theoretical
    case 'methodology':
      return chapterTargets.methodology
    case 'results':
      return chapterTargets.results
    case 'conclusion':
      return chapterTargets.conclusion
    default:
      return 500
  }
}

function getStatusLabel(status: DocumentStatus) {
  switch (status) {
    case 'completed':
      return 'Concluído'
    case 'writing':
      return 'Em escrita'
    default:
      return 'Pendente'
  }
}

function getStatusTone(status: DocumentStatus) {
  switch (status) {
    case 'completed':
      return 'success' as const
    case 'writing':
      return 'primary' as const
    default:
      return 'warning' as const
  }
}

function getDocumentKindLabel(nodeId: EditorNodeId, isChapterView: boolean) {
  if (nodeId === 'abstractPt') return 'Síntese pré-textual'
  if (nodeId === 'abstractEn') return 'Versão internacional'
  if (nodeId === 'references') return 'Apoio bibliográfico'
  if (isChapterView) return 'Capítulo textual'
  return 'Documento'
}

function getDocumentSummaryLabel(nodeId: EditorNodeId, selectedStatus: DocumentStatus, isChapterView: boolean) {
  const kindLabel = getDocumentKindLabel(nodeId, isChapterView)
  return `${kindLabel} • ${getStatusLabel(selectedStatus)}`
}

function getAiModeDescription(nodeId: EditorNodeId, isChapterView: boolean) {
  if (isChapterView) return 'Sugestões editoriais para escrita, revisão fina e sustentação bibliográfica.'
  if (nodeId === 'abstractPt') return 'Modo compacto para apoiar síntese, densidade e clareza do resumo.'
  if (nodeId === 'abstractEn') return 'Modo compacto para apoiar concisão e tom acadêmico do abstract.'
  return 'Modo compacto para manter o workspace documental com foco no conteúdo principal.'
}

function getEditorBodyWidth(isChapterView: boolean, aiOpen: boolean) {
  if (isChapterView) {
    return aiOpen ? 'max-w-[1360px]' : 'max-w-[1560px]'
  }

  return 'max-w-[1520px]'
}

function getTextLastEditedLabel(saveState: 'idle' | 'saving' | 'saved', isDirty: boolean) {
  if (saveState === 'saving') return 'Salvando alterações...'
  if (saveState === 'saved') return 'Última atualização concluída agora'
  if (isDirty) return 'Alterações locais prontas para salvar'
  return 'Sem alterações pendentes nesta sessão'
}

function compactAlertTitle(alertId: string) {
  switch (alertId) {
    case 'length':
      return '⚠ Meta parcial abaixo do esperado'
    case 'length-ok':
      return '✓ Volume adequado'
    case 'concept':
      return '⚠ Conceito recorrente'
    case 'cohesion':
      return '○ Coesão argumentativa'
    case 'abnt':
      return 'Checklist de revisão'
    default:
      return 'Insight editorial'
  }
}

function compactAlertDescription(alertId: string, fallback: string) {
  switch (alertId) {
    case 'length':
      return 'Feche a próxima seção antes de revisar estilo.'
    case 'length-ok':
      return 'Texto consistente para revisão fina.'
    case 'concept':
      return 'Varie “inteligência artificial” e explicite melhor o recorte.'
    case 'cohesion':
      return 'Aproxime problema, objetivo e justificativa.'
    case 'abnt':
      return '✓ Introdução contextualizada\n○ Revisar transição final\n○ Reforçar recorte metodológico'
    default:
      return fallback
  }
}

function compactSuggestionLabel(label: string) {
  if (/Reescrever/i.test(label)) return 'Reescrever com clareza'
  if (/tom acadêmico/i.test(label)) return 'Ajustar tom acadêmico'
  if (/fontes/i.test(label)) return 'Sugerir fontes'
  if (/ABNT/i.test(label)) return 'Revisar aderência ABNT'
  return label
}

function buildProjectTextPayload(
  project: {
    title: string
    subtitle?: string
    course: string
    institution: string
    academicDegree?: string
    advisorName?: string
    deadline: Date | string
    norm: 'ABNT' | 'APA' | 'Vancouver'
    theme?: string
    researchProblem?: string
    generalObjective?: string
    specificObjectives?: string[]
    defenseCity?: string
    defenseYear?: number
    abstractPt?: string
    abstractEn?: string
    keywords?: string[]
  },
  target: 'abstractPt' | 'abstractEn',
  nextValue: string,
) {
  return {
    title: project.title,
    subtitle: project.subtitle ?? '',
    course: project.course,
    institution: project.institution,
    academicDegree: project.academicDegree ?? '',
    advisorName: project.advisorName ?? '',
    deadline: project.deadline instanceof Date ? project.deadline.toISOString().slice(0, 10) : project.deadline,
    norm: project.norm,
    theme: project.theme ?? '',
    researchProblem: project.researchProblem ?? '',
    generalObjective: project.generalObjective ?? '',
    specificObjectives: project.specificObjectives ?? [],
    defenseCity: project.defenseCity ?? '',
    defenseYear: project.defenseYear,
    abstractPt: target === 'abstractPt' ? nextValue : project.abstractPt ?? '',
    abstractEn: target === 'abstractEn' ? nextValue : project.abstractEn ?? '',
    keywords: project.keywords ?? [],
  }
}

async function invalidateEditorQueries(queryClient: ReturnType<typeof useQueryClient>, projectId: string, chapterId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['projects'] }),
    queryClient.invalidateQueries({ queryKey: ['editor-project', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['project-details', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['chapters', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['references'] }),
    queryClient.invalidateQueries({ queryKey: ['citations', 'project', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['timeline'] }),
    queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] }),
    queryClient.invalidateQueries({ queryKey: ['export-status'] }),
    chapterId
      ? Promise.all([
          queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] }),
          queryClient.invalidateQueries({ queryKey: ['citations', 'chapter', chapterId] }),
        ])
      : Promise.resolve(),
  ])
}

export function EditorPage() {
  const navigate = useNavigate()
  const { projectId = '', nodeId: routeNodeId } = useParams<{ projectId: string; nodeId?: string }>()
  const projectQuery = useQuery(editorProjectQuery(projectId))
  const chaptersListQuery = useQuery(chaptersQuery(projectId))
  const referencesListQuery = useQuery(referencesQuery(projectId))
  const projectCitationsListQuery = useQuery(projectCitationsQuery(projectId))
  const { data: projects = [], isLoading: projectsLoading } = useQuery(projectsQuery)
  const queryClient = useQueryClient()
  const [selectedNodeId, setSelectedNodeId] = useState<EditorNodeId | null>(null)
  const [content, setContent] = useState('')
  const [abstractPtDraft, setAbstractPtDraft] = useState('')
  const [abstractEnDraft, setAbstractEnDraft] = useState('')
  const [abstractSaving, setAbstractSaving] = useState<'abstractPt' | 'abstractEn' | null>(null)
  const [abstractFeedback, setAbstractFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [aiOpen, setAiOpen] = useState(true)
  const [aiText, setAiText] = useState('Selecione uma ação para gerar revisão textual mockada.')
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [citationDialogOpen, setCitationDialogOpen] = useState(false)
  const [citationForm, setCitationForm] = useState<CitationFormState>(defaultCitationFormState)
  const [citationFeedback, setCitationFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [citationSaving, setCitationSaving] = useState(false)
  const [quickReferenceDialogOpen, setQuickReferenceDialogOpen] = useState(false)
  const [quickReferenceForm, setQuickReferenceForm] = useState<QuickReferenceFormState>(quickReferenceDefaultFormState)
  const [quickReferenceSaving, setQuickReferenceSaving] = useState(false)
  const [quickReferenceFeedback, setQuickReferenceFeedback] = useState<string | null>(null)
  const [deletingCitationId, setDeletingCitationId] = useState<string | null>(null)
  const lastSavedContentRef = useRef('')
  const latestContentRef = useRef('')
  const hydratedChapterIdRef = useRef<string | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const chapterEditorRef = useRef<ChapterEditorHandle | null>(null)
  const chapters = chaptersListQuery.data ?? projectQuery.data?.chapters ?? []
  const textualChapters = useMemo(
    () => chapters.filter((chapter) => chapter.type !== 'references'),
    [chapters],
  )
  const textualChapterIds = useMemo(
    () => textualChapters.map((chapter) => chapter.id),
    [textualChapters],
  )
  const selectedChapterId = selectedNodeId ? getChapterIdFromNode(selectedNodeId) : null
  const selectedChapterQuery = useQuery(chapterQuery(selectedChapterId))
  const chapterCitationsListQuery = useQuery(chapterCitationsQuery(selectedChapterId))
  const previousProjectIdRef = useRef<string | null>(null)

  const selectedChapter = useMemo(
    () => selectedChapterQuery.data ?? textualChapters.find((chapter) => chapter.id === selectedChapterId) ?? textualChapters[0] ?? null,
    [selectedChapterId, selectedChapterQuery.data, textualChapters],
  )
  const chapterCitations = chapterCitationsListQuery.data ?? []
  const projectCitations = projectCitationsListQuery.data ?? []
  const referencesMap = useMemo(
    () => new Map((referencesListQuery.data ?? []).map((reference) => [reference.id, reference])),
    [referencesListQuery.data],
  )
  const citationsMap = useMemo(
    () => new Map(
      projectCitations.map((citation) => [
        citation.id,
        {
          ...citation,
          reference: citation.reference ?? referencesMap.get(citation.referenceId),
        },
      ]),
    ),
    [projectCitations, referencesMap],
  )
  const contentCitationIds = useMemo(
    () => extractCitationIds(content),
    [content],
  )
  const invalidCitationCount = useMemo(
    () => contentCitationIds.filter((citationId) => !citationsMap.has(citationId)).length,
    [citationsMap, contentCitationIds],
  )
  const chapterCitationIdsInText = useMemo(
    () => new Set(contentCitationIds),
    [contentCitationIds],
  )
  const projectChapterContents = useMemo(
    () => chapters.map((chapter) => (
      selectedChapter?.id === chapter.id
        ? { ...chapter, content }
        : chapter
    )),
    [chapters, content, selectedChapter?.id],
  )
  const projectCitationIdsInText = useMemo(
    () => new Set(projectChapterContents.flatMap((chapter) => extractCitationIds(chapter.content ?? ''))),
    [projectChapterContents],
  )
  const chapterCitationsInText = useMemo(
    () => chapterCitations.filter((citation) => chapterCitationIdsInText.has(citation.id)),
    [chapterCitationIdsInText, chapterCitations],
  )
  const chapterUnusedCitations = useMemo(
    () => chapterCitations.filter((citation) => !chapterCitationIdsInText.has(citation.id)),
    [chapterCitationIdsInText, chapterCitations],
  )
  const projectCitationsInText = useMemo(
    () => projectCitations.filter((citation) => projectCitationIdsInText.has(citation.id)),
    [projectCitationIdsInText, projectCitations],
  )
  const citedReferenceIds = useMemo(
    () => new Set(projectCitationsInText.map((citation) => citation.referenceId)),
    [projectCitationsInText],
  )
  const citedReferences = useMemo(
    () => (referencesListQuery.data ?? []).filter((reference) => citedReferenceIds.has(reference.id)),
    [citedReferenceIds, referencesListQuery.data],
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
    if (!projectQuery.data) return

    setAbstractPtDraft(projectQuery.data.project.abstractPt ?? '')
    setAbstractEnDraft(projectQuery.data.project.abstractEn ?? '')
  }, [projectQuery.data])

  useEffect(() => {
    if (!selectedNodeId) return

    if (isChapterNode(selectedNodeId)) {
      setAiOpen(true)
      return
    }

    setAiOpen(false)
  }, [selectedNodeId])

  useEffect(() => {
    if (!textualChapters.length) return

    const fallbackNodeId: EditorNodeId = `chapter:${textualChapters[0].id}`
    const projectChanged = previousProjectIdRef.current !== projectId
    const routeNode = getEditorNodeFromRouteNode(routeNodeId, textualChapterIds)

    if (routeNodeId) {
      if (routeNode) {
        if (selectedNodeId !== routeNode) {
          setSelectedNodeId(routeNode)
        }
      } else {
        setSelectedNodeId(fallbackNodeId)
        navigate(`/editor/${projectId}/${getRouteNodeFromEditorNode(fallbackNodeId)}`, { replace: true })
      }

      previousProjectIdRef.current = projectId
      return
    }

    if (projectChanged || !selectedNodeId) {
      setSelectedNodeId(fallbackNodeId)
      previousProjectIdRef.current = projectId
      return
    }

    if (isChapterNode(selectedNodeId)) {
      const currentChapterId = getChapterIdFromNode(selectedNodeId)
      const chapterStillExists = textualChapterIds.includes(currentChapterId ?? '')

      if (!chapterStillExists) {
        setSelectedNodeId(fallbackNodeId)
      }
    }

    previousProjectIdRef.current = projectId
  }, [navigate, projectId, routeNodeId, selectedNodeId, textualChapterIds, textualChapters])

  useEffect(() => {
    if (selectedChapter && hydratedChapterIdRef.current !== selectedChapter.id) {
      hydratedChapterIdRef.current = selectedChapter.id
      setContent(selectedChapter.content)
      lastSavedContentRef.current = selectedChapter.content
      latestContentRef.current = selectedChapter.content
      setSaveState('idle')
      setCitationFeedback(null)
      setCitationDialogOpen(false)
      setQuickReferenceDialogOpen(false)
    }
  }, [selectedChapter])

  useEffect(() => {
    if (!referencesListQuery.data?.length) return

    setCitationForm((current) => (
      current.referenceId
        ? current
        : { ...current, referenceId: referencesListQuery.data?.[0]?.id ?? '' }
    ))
  }, [referencesListQuery.data])

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
    await invalidateEditorQueries(queryClient, projectId, selectedChapter.id)
    setSaveState('saved')
    window.setTimeout(() => setSaveState((current) => (current === 'saved' ? 'idle' : current)), 1500)
    return true
  }, [projectId, queryClient, selectedChapter])

  useEffect(() => {
    if (!selectedChapter || !selectedNodeId || !isChapterNode(selectedNodeId)) return
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
  }, [content, saveCurrentContent, selectedChapter, selectedNodeId])

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

  if (!textualChapters.length) {
    return (
      <div className="page-shell">
        <EmptyState
          icon={BookOpen}
          title="Nenhum capítulo disponível"
          description="O projeto atual ainda não retornou capítulos textuais da API."
        />
      </div>
    )
  }

  const project = projectQuery.data.project
  const activeNodeId = selectedNodeId ?? `chapter:${textualChapters[0].id}`
  const isChapterView = isChapterNode(activeNodeId)
  const abstractPtWords = countWords(abstractPtDraft)
  const abstractEnWords = countWords(abstractEnDraft)
  const displayContent = replaceCitationMarkers(content, citationsMap)
  const chapterWordCount = countWords(displayContent)
  const selectedWordCount = isChapterView ? chapterWordCount : activeNodeId === 'abstractPt' ? abstractPtWords : activeNodeId === 'abstractEn' ? abstractEnWords : 0
  const targetWords = getChapterTargetWords(selectedChapter)
  const progressValue = isChapterView ? Math.min(100, Math.round((chapterWordCount / targetWords) * 100)) : 0
  const textProgressValue = !isChapterView
    ? Math.max(0, Math.min(100, Math.round((selectedWordCount / (activeNodeId === 'abstractPt' ? 150 : 100)) * 100)))
    : 0
  const excerpt = displayContent
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')

  const abstractPtStatus = normalizeTextStatus(abstractPtWords, 150)
  const abstractEnStatus = normalizeTextStatus(abstractEnWords, 100)
  const referencesStatus: DocumentStatus = citedReferences.length > 0 ? 'completed' : 'pending'
  const textualStatuses = textualChapters.map((chapter) => normalizeChapterStatus(chapter))

  const groupCounters = {
    pre: [abstractPtStatus, abstractEnStatus],
    text: textualStatuses,
    post: [referencesStatus],
  }

  const selectedGroup = activeNodeId === 'abstractPt' || activeNodeId === 'abstractEn'
    ? 'Pré-textuais'
    : activeNodeId === 'references'
      ? 'Pós-textuais'
      : 'Textuais'
  const selectedLabel = activeNodeId === 'abstractPt'
    ? 'Resumo'
    : activeNodeId === 'abstractEn'
      ? 'Abstract'
      : activeNodeId === 'references'
        ? 'Referências'
        : selectedChapter?.title ?? 'Capítulo'
  const selectedStatus = activeNodeId === 'abstractPt'
      ? abstractPtStatus
      : activeNodeId === 'abstractEn'
        ? abstractEnStatus
        : activeNodeId === 'references'
          ? referencesStatus
          : normalizeChapterStatus(selectedChapter ?? textualChapters[0])
  const selectedSummaryLabel = getDocumentSummaryLabel(activeNodeId, selectedStatus, isChapterView)
  const editorBodyWidth = getEditorBodyWidth(isChapterView, aiOpen)

  const contextualAlerts = [
    selectedWordCount < targetWords * 0.45
      ? {
          id: 'length',
          title: `Meta parcial abaixo do esperado`,
          description: `Você está em ${selectedWordCount} / ${targetWords} palavras. Vale fechar a próxima seção antes de revisar estilo.`,
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
    displayContent.includes('IA') || displayContent.includes('inteligência artificial')
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

  async function handleSelectNode(nextNodeId: EditorNodeId) {
    await saveCurrentContent()
    setAbstractFeedback(null)
    setSelectedNodeId(nextNodeId)
    navigate(`/editor/${projectId}/${getRouteNodeFromEditorNode(nextNodeId)}`)
  }

  async function handleSaveProjectText(target: 'abstractPt' | 'abstractEn') {
    if (abstractSaving) return

    setAbstractSaving(target)
    setAbstractFeedback(null)

    try {
      const nextValue = target === 'abstractPt' ? abstractPtDraft : abstractEnDraft
      await updateProject(projectId, buildProjectTextPayload(project, target, nextValue))
      await invalidateEditorQueries(queryClient, projectId)
      setAbstractFeedback({
        tone: 'success',
        message: target === 'abstractPt' ? 'Resumo atualizado com sucesso.' : 'Abstract atualizado com sucesso.',
      })
    } catch (error) {
      setAbstractFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível salvar o texto selecionado.',
      })
    } finally {
      setAbstractSaving(null)
    }
  }

  async function handleManualChapterSave() {
    if (!selectedChapter) return
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    setSaving(true)
    setSaveState('saving')
    await updateChapterContent(selectedChapter.id, latestContentRef.current)
    lastSavedContentRef.current = latestContentRef.current
    await invalidateEditorQueries(queryClient, projectId, selectedChapter.id)
    setSaving(false)
    setSaveState('saved')
  }

  function updateCitationForm<K extends keyof CitationFormState>(field: K, value: CitationFormState[K]) {
    setCitationForm((current) => ({ ...current, [field]: value }))
  }

  function updateQuickReferenceForm<K extends keyof QuickReferenceFormState>(field: K, value: QuickReferenceFormState[K]) {
    setQuickReferenceForm((current) => ({ ...current, [field]: value }))
  }

  function handleReferenceSelectChange(value: string) {
    if (value === 'quick-create-reference') {
      setQuickReferenceForm((current) => ({
        ...quickReferenceDefaultFormState,
        authors: current.authors,
      }))
      setQuickReferenceFeedback(null)
      setQuickReferenceDialogOpen(true)
      return
    }

    updateCitationForm('referenceId', value)
  }

  function focusEditorAtPosition(_nextPosition: number) {
    window.requestAnimationFrame(() => {
      chapterEditorRef.current?.focusAtEnd()
    })
  }

  async function handleCreateCitation() {
    if (!selectedChapter) return

    if (!citationForm.referenceId) {
      setCitationFeedback({ tone: 'error', message: 'Selecione uma referência para inserir a citação.' })
      return
    }

    if ((citationForm.type === 'direct_short' || citationForm.type === 'direct_long') && !citationForm.quotedText.trim()) {
      setCitationFeedback({ tone: 'error', message: 'Informe o trecho citado para citações diretas.' })
      return
    }

    if ((citationForm.type === 'direct_short' || citationForm.type === 'direct_long') && !citationForm.page.trim()) {
      setCitationFeedback({ tone: 'error', message: 'Informe a página para citações diretas.' })
      return
    }

    if (citationForm.type === 'apud' && (!citationForm.apudAuthor.trim() || !citationForm.apudYear.trim())) {
      setCitationFeedback({ tone: 'error', message: 'Preencha autor e ano do apud para concluir a inserção.' })
      return
    }

    setCitationSaving(true)
    setCitationFeedback(null)

    try {
      const createdCitation = await createCitation(selectedChapter.id, citationForm)
      const marker = buildCitationMarker(createdCitation.id)
      const nextContent = chapterEditorRef.current?.insertCitation(createdCitation.id, createdCitation) ?? `${latestContentRef.current}${marker}`

      setContent(nextContent)
      latestContentRef.current = nextContent
      setCitationDialogOpen(false)
      setCitationForm({
        ...defaultCitationFormState,
        referenceId: citationForm.referenceId,
      })
      setCitationFeedback({ tone: 'success', message: 'Citação inserida no ponto atual do capítulo.' })
      await invalidateEditorQueries(queryClient, projectId, selectedChapter.id)
      focusEditorAtPosition(nextContent.length)
    } catch (error) {
      setCitationFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível inserir a citação agora.',
      })
    } finally {
      setCitationSaving(false)
    }
  }

  async function handleCreateQuickReference() {
    const authors = quickReferenceForm.authors
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)

    if (!authors.length || !quickReferenceForm.title.trim() || !quickReferenceForm.year.trim()) {
      setQuickReferenceFeedback('Preencha autores, título e ano para criar a referência.')
      return
    }

    const normalizedYear = Number(quickReferenceForm.year)
    if (!Number.isFinite(normalizedYear) || normalizedYear < 0) {
      setQuickReferenceFeedback('Informe um ano válido para criar a referência.')
      return
    }

    setQuickReferenceSaving(true)
    setQuickReferenceFeedback(null)

    try {
      const createdReference = await createReference({
        type: quickReferenceForm.type,
        authors,
        title: quickReferenceForm.title.trim(),
        year: normalizedYear,
        journal: quickReferenceForm.type === 'article' ? quickReferenceForm.source.trim() || undefined : undefined,
        publisher: quickReferenceForm.type !== 'article' ? quickReferenceForm.source.trim() || undefined : undefined,
        url: quickReferenceForm.url.trim() || undefined,
        chapterId: selectedChapterId ?? undefined,
      }, projectId)

      await invalidateEditorQueries(queryClient, projectId, selectedChapterId ?? undefined)
      updateCitationForm('referenceId', createdReference.id)
      setQuickReferenceDialogOpen(false)
      setQuickReferenceForm(quickReferenceDefaultFormState)
    } catch (error) {
      setQuickReferenceFeedback(error instanceof Error ? error.message : 'Não foi possível criar a referência agora.')
    } finally {
      setQuickReferenceSaving(false)
    }
  }

  async function handleRemoveCitation(citation: Citation) {
    if (!selectedChapter) return

    setDeletingCitationId(citation.id)
    setCitationFeedback(null)

    try {
      await deleteCitation(citation.id)

      const nextContent = removeCitationMarker(latestContentRef.current, citation.id)
      if (nextContent !== latestContentRef.current) {
        setContent(nextContent)
        latestContentRef.current = nextContent
        lastSavedContentRef.current = nextContent
        await updateChapterContent(selectedChapter.id, nextContent)
      }

      await invalidateEditorQueries(queryClient, projectId, selectedChapter.id)
      setCitationFeedback({ tone: 'success', message: 'Citação removida do capítulo e da lista.' })
    } catch (error) {
      setCitationFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível remover a citação selecionada.',
      })
    } finally {
      setDeletingCitationId(null)
    }
  }

  return (
    <div className="flex h-[calc(100vh-72px)] min-h-[720px] bg-[radial-gradient(circle_at_top,rgba(24,53,104,0.05),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0))]">
      <aside className="hidden h-full w-[292px] border-r border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.96))] shadow-[8px_0_32px_rgba(15,23,42,0.04)] backdrop-blur lg:flex lg:flex-col">
        <div className="border-b border-border/70 px-5 py-5">
          <p className="type-card text-foreground">{project.title}</p>
          <p className="type-meta mt-1 text-muted-foreground">Workspace documental acadêmico</p>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-7 px-3 pb-5 pt-3">
            <DocumentSection
              title="PRÉ-TEXTUAIS"
              counter={`${groupCounters.pre.filter((status) => status === 'completed').length}/${groupCounters.pre.length}`}
            >
              <DocumentNavItem
                title="Resumo"
                helper={`${abstractPtWords} palavras`}
                active={activeNodeId === 'abstractPt'}
                status={abstractPtStatus}
                onClick={() => void handleSelectNode('abstractPt')}
              />
              <DocumentNavItem
                title="Abstract"
                helper={`${abstractEnWords} palavras`}
                active={activeNodeId === 'abstractEn'}
                status={abstractEnStatus}
                onClick={() => void handleSelectNode('abstractEn')}
              />
            </DocumentSection>

            <DocumentSection
              title="TEXTUAIS"
              counter={`${groupCounters.text.filter((status) => status === 'completed').length}/${groupCounters.text.length}`}
            >
              {textualChapters.map((chapter) => (
                <DocumentNavItem
                  key={chapter.id}
                  title={chapter.title}
                  helper={`${chapter.wordCount} palavras`}
                  active={activeNodeId === `chapter:${chapter.id}`}
                  status={normalizeChapterStatus(chapter)}
                  onClick={() => void handleSelectNode(`chapter:${chapter.id}`)}
                />
              ))}
            </DocumentSection>

            <DocumentSection
              title="PÓS-TEXTUAIS"
              counter={`${groupCounters.post.filter((status) => status === 'completed').length}/${groupCounters.post.length}`}
            >
              <DocumentNavItem
                title="Referências"
                helper={citedReferences.length > 0 ? `${citedReferences.length} referência(s) citada(s)` : 'Nenhuma referência citada ainda'}
                active={activeNodeId === 'references'}
                status={referencesStatus}
                onClick={() => void handleSelectNode('references')}
              />
            </DocumentSection>
          </div>
        </ScrollArea>
        <div className="border-t border-border/70 px-4 py-4">
          <div className="rounded-[22px] border border-border/70 bg-white/72 px-4 py-4 shadow-sm">
            <p className="text-sm font-medium text-foreground">AcadFlow AI</p>
            <p className="mt-1 text-sm text-muted-foreground">Workspace acadêmico ativo</p>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>{project.norm} • DOCX Ready</span>
              <span>{groupCounters.pre.filter((status) => status === 'completed').length + groupCounters.text.filter((status) => status === 'completed').length + groupCounters.post.filter((status) => status === 'completed').length} de {groupCounters.pre.length + groupCounters.text.length + groupCounters.post.length}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-white/82 px-5 py-5 backdrop-blur md:px-7">
          <div className="space-y-3">
            <p className="type-meta uppercase tracking-[0.18em] text-muted-foreground">
              Projeto &gt; {selectedGroup} &gt; {selectedLabel}
            </p>
            <div className="space-y-1">
              <h1 className="type-heading text-foreground">{selectedLabel}</h1>
              <p className="text-sm text-muted-foreground">{selectedSummaryLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge label={getStatusLabel(selectedStatus)} tone={getStatusTone(selectedStatus)} />
              {isChapterView ? (
                <>
                  <StatusBadge label={`${selectedWordCount} / ${targetWords}`} tone={progressValue >= 100 ? 'success' : 'info'} />
                  <StatusBadge
                    label={saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? 'Salvo' : 'Auto-save ativo'}
                    tone={saveState === 'saving' ? 'warning' : saveState === 'saved' ? 'success' : 'neutral'}
                  />
                </>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            {activeNodeId === 'abstractPt' ? (
              <Button variant="outline" onClick={() => void handleSaveProjectText('abstractPt')} disabled={abstractSaving === 'abstractPt'}>
                <Save className="h-4 w-4" />
                {abstractSaving === 'abstractPt' ? 'Salvando...' : 'Salvar'}
              </Button>
            ) : null}
            {activeNodeId === 'abstractEn' ? (
              <Button variant="outline" onClick={() => void handleSaveProjectText('abstractEn')} disabled={abstractSaving === 'abstractEn'}>
                <Save className="h-4 w-4" />
                {abstractSaving === 'abstractEn' ? 'Salvando...' : 'Salvar'}
              </Button>
            ) : null}
            {isChapterView ? (
              <Button variant="outline" onClick={() => void handleManualChapterSave()} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            ) : null}
            <Button variant="outline" size="icon" onClick={() => setAiOpen((current) => !current)}>
              {aiOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto px-3 py-5 md:px-5 xl:px-6">
            <div className={`mx-auto w-full ${editorBodyWidth} space-y-8`}>
              {activeNodeId === 'abstractPt' ? (
                <TextDocumentCard
                  title="Resumo"
                  description="Síntese acadêmica em português com foco em clareza, densidade e fechamento conceitual."
                  value={abstractPtDraft}
                  onChange={setAbstractPtDraft}
                  wordCount={abstractPtWords}
                  progressValue={activeNodeId === 'abstractPt' ? textProgressValue : 0}
                  sessionLabel={getTextLastEditedLabel(abstractSaving === 'abstractPt' ? 'saving' : 'idle', abstractPtWords > 0)}
                  checklistItems={buildChecklistItems(abstractPtWords, 150, 'resumo')}
                  feedback={abstractFeedback}
                  target={150}
                  kindLabel="Pré-textual"
                />
              ) : null}

              {activeNodeId === 'abstractEn' ? (
                <TextDocumentCard
                  title="Abstract"
                  description="Versão internacional do resumo, com linguagem objetiva e vocabulário acadêmico consistente."
                  value={abstractEnDraft}
                  onChange={setAbstractEnDraft}
                  wordCount={abstractEnWords}
                  progressValue={activeNodeId === 'abstractEn' ? textProgressValue : 0}
                  sessionLabel={getTextLastEditedLabel(abstractSaving === 'abstractEn' ? 'saving' : 'idle', abstractEnWords > 0)}
                  checklistItems={buildChecklistItems(abstractEnWords, 100, 'abstract')}
                  feedback={abstractFeedback}
                  target={100}
                  kindLabel="Pré-textual"
                />
              ) : null}

              {activeNodeId === 'references' ? (
                <SectionCard
                  title="Referências"
                  description="Esta seção reúne apenas as referências efetivamente citadas nos capítulos do texto."
                  action={
                    <Button asChild className="rounded-2xl">
                      <Link to="/references">
                        Abrir referências
                        <ArrowIndicator />
                      </Link>
                    </Button>
                  }
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <ReferenceSummaryCard
                      title="Referências citadas"
                      value={`${citedReferences.length} referência(s)`}
                      helper={citedReferences.length > 0 ? 'Somente referências com marcadores no texto aparecem aqui.' : 'As referências aparecem aqui automaticamente quando você insere citações nos capítulos.'}
                    />
                    <ReferenceSummaryCard
                      title="Status do pós-textual"
                      value={getStatusLabel(referencesStatus)}
                      helper="O item fica concluído quando existe pelo menos uma referência efetivamente citada no texto."
                    />
                  </div>
                  {citedReferences.length === 0 ? (
                    <div className="mt-5 rounded-[24px] border border-dashed border-border/80 bg-muted/25 px-5 py-5">
                      <p className="text-sm font-medium text-foreground">Nenhuma referência citada no texto ainda.</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        As referências aparecem aqui automaticamente quando você insere citações nos capítulos.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {citedReferences.map((reference) => (
                        <div key={reference.id} className="rounded-[24px] border border-border/70 bg-white/84 px-4 py-4">
                          <p className="text-sm leading-6 text-foreground">
                            {reference.abntFormatted ?? `${reference.authors.join('; ')}. ${reference.title}. ${reference.year}.`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              ) : null}

              {isChapterView && selectedChapter ? (
                <div className="space-y-7">
                  <SectionCard
                    title={selectedChapter.title}
                    description="Capítulo textual com autosave, leitura confortável e assistência contextual para escrita acadêmica."
                    className="rounded-[34px] border-border/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(252,252,253,0.96))] shadow-sm"
                    action={
                      <StatusBadge
                        label={progressValue >= 100 ? 'Meta atingida' : 'Escrita em progresso'}
                        tone={progressValue >= 100 ? 'success' : 'info'}
                      />
                    }
                  >
                    <div className="space-y-7">
                      <div className="space-y-5 border-b border-border/70 pb-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="max-w-3xl">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/70">Sessão de escrita</p>
                            <p className="mt-2 text-[15px] leading-8 text-muted-foreground">
                              Meta desta escrita: consolidar {selectedChapter.title.toLowerCase()} com clareza e suporte acadêmico.
                            </p>
                          </div>
                          <StatusBadge label={getStatusLabel(normalizeChapterStatus(selectedChapter))} tone={getStatusTone(normalizeChapterStatus(selectedChapter))} />
                        </div>
                        <ProgressBar
                          value={progressValue}
                          label="Meta de palavras do capítulo"
                          helper={`${selectedWordCount} / ${targetWords} palavras para esta sessão`}
                        />
                      </div>

                      <div className="relative overflow-hidden rounded-[32px] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(251,252,255,0.98))] shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                        <div className="mx-auto max-w-[980px] px-8 py-6 md:px-12 md:py-7">
                          <div className="sticky top-0 z-20 -mx-8 mb-2 border-b border-border/60 bg-[rgba(255,255,255,0.92)] px-8 py-2 backdrop-blur md:-mx-12 md:px-12">
                            <div className="flex items-center justify-between gap-4 overflow-x-auto">
                              <div className="flex min-w-max items-center gap-1.5">
                              <AcademicToolbarButton
                                icon={Quote}
                                label="Inserir citação"
                                tooltip="Cria a citação e insere no ponto atual do cursor."
                                onClick={() => {
                                  setCitationFeedback(null)
                                  setCitationDialogOpen(true)
                                }}
                                disabled={!referencesListQuery.data?.length || citationSaving}
                              />
                              <AcademicToolbarButton
                                icon={FileImage}
                                label="Inserir figura"
                                tooltip="Em breve: figuras ABNT com marcador próprio."
                                disabled
                                badge="Em breve"
                              />
                              <AcademicToolbarButton
                                icon={FileSpreadsheet}
                                label="Inserir tabela"
                                tooltip="Em breve: tabelas ABNT integradas ao editor."
                                disabled
                                badge="Em breve"
                              />
                              <AcademicToolbarButton
                                icon={LayoutPanelTop}
                                label="Inserir quadro"
                                tooltip="Em breve: quadros ABNT integrados ao editor."
                                disabled
                                badge="Em breve"
                              />
                              </div>
                              <div className="flex min-w-max items-center gap-2 pl-3">
                                <span className="h-4 w-px bg-border/70" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  {chapterCitationsListQuery.isLoading ? '...' : `${contentCitationIds.length} citações`}
                                </span>
                                {invalidCitationCount > 0 ? (
                                  <>
                                    <span className="h-4 w-px bg-border/70" />
                                    <span className="text-xs font-medium text-amber-700">
                                      {invalidCitationCount} inválida(s)
                                    </span>
                                  </>
                                ) : null}
                                <span className="h-4 w-px bg-border/70" />
                                <span className={`text-xs ${
                                  saveState === 'saving'
                                    ? 'text-amber-700'
                                    : saveState === 'saved'
                                      ? 'text-emerald-700'
                                      : 'text-muted-foreground'
                                }`}>
                                  {saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? 'Salvo' : 'Auto-save ativo'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-[28px]">
                            <ChapterContentEditor
                              ref={chapterEditorRef}
                              value={content}
                              citationsMap={citationsMap}
                              onChange={(nextValue) => {
                                setContent(nextValue)
                                latestContentRef.current = nextValue
                              }}
                              placeholder="Escreva o capítulo com clareza, argumento e apoio bibliográfico."
                            />
                          </div>
                          {citationFeedback ? (
                            <p className={citationFeedback.tone === 'success' ? 'mt-4 text-sm text-primary' : 'mt-4 text-sm text-destructive'}>
                              {citationFeedback.message}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <SectionCard
                        title="Citações do capítulo"
                        description="Os indicadores abaixo consideram apenas marcadores presentes no texto, sem apagar o histórico bibliográfico cadastrado."
                        className="rounded-[30px] border-border/55 bg-white/82 shadow-sm"
                      >
                        <div className="grid gap-4 md:grid-cols-3">
                          <ReferenceSummaryCard
                            title="Capítulo atual"
                            value={chapterCitationsListQuery.isLoading ? '...' : `${chapterCitationsInText.length}`}
                            helper="Total de citações usadas no texto atual deste capítulo."
                          />
                          <ReferenceSummaryCard
                            title="Projeto inteiro"
                            value={projectCitationsListQuery.isLoading ? '...' : `${projectCitationsInText.length}`}
                            helper="Total de citações com marcador presente nos capítulos do projeto."
                          />
                          <ReferenceSummaryCard
                            title="Referências citadas"
                            value={`${citedReferenceIds.size}`}
                            helper="Base bibliográfica efetivamente citada no conteúdo."
                          />
                        </div>

                        {chapterCitationsListQuery.isError ? (
                          <p className="mt-5 rounded-[20px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            Não foi possível carregar as citações deste capítulo.
                          </p>
                        ) : null}

                        {!chapterCitationsListQuery.isLoading && chapterCitationsInText.length === 0 ? (
                          <div className="mt-5 rounded-[24px] border border-dashed border-border/80 bg-muted/25 px-5 py-5">
                            <p className="text-sm font-medium text-foreground">Nenhuma citação usada no texto ainda</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              Use a toolbar acadêmica para inserir a primeira citação deste capítulo.
                            </p>
                          </div>
                        ) : null}

                        {chapterCitationsInText.length > 0 ? (
                          <div className="mt-5 space-y-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Citações usadas no texto</p>
                            {chapterCitationsInText.map((citation) => (
                              <div key={citation.id} className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-border/70 bg-white/84 px-4 py-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge label={getCitationTypeLabel(citation.type)} tone="info" />
                                    {citation.page ? <StatusBadge label={`p. ${citation.page}`} tone="neutral" /> : null}
                                    <StatusBadge label="No texto" tone="success" />
                                  </div>
                                  <p className="mt-3 text-sm font-medium text-foreground">{buildCitationPreviewLabel(citation)}</p>
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {citation.reference?.abntFormatted ?? 'Referência vinculada sem formatação ABNT disponível.'}
                                  </p>
                                  {citation.quotedText ? (
                                    <p className="mt-2 rounded-[18px] bg-primary/5 px-3 py-2 text-sm leading-6 text-foreground/82">
                                      "{citation.quotedText}"
                                    </p>
                                  ) : null}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleRemoveCitation(citation)}
                                  disabled={deletingCitationId === citation.id}
                                >
                                  {deletingCitationId === citation.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  Remover
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {chapterUnusedCitations.length > 0 ? (
                          <div className="mt-5 space-y-3">
                            <div className="rounded-[20px] border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
                              {chapterUnusedCitations.length} citação(ões) cadastrada(s) continuam no sistema, mas não aparecem no texto atual.
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Citações cadastradas, mas não usadas</p>
                            {chapterUnusedCitations.map((citation) => (
                              <div key={citation.id} className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-border/70 bg-muted/20 px-4 py-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge label={getCitationTypeLabel(citation.type)} tone="info" />
                                    <StatusBadge label="Sem marcador" tone="warning" />
                                  </div>
                                  <p className="mt-3 text-sm font-medium text-foreground">{buildCitationPreviewLabel(citation)}</p>
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {citation.reference?.abntFormatted ?? 'Referência vinculada sem formatação ABNT disponível.'}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleRemoveCitation(citation)}
                                  disabled={deletingCitationId === citation.id}
                                >
                                  {deletingCitationId === citation.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  Remover
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </SectionCard>
                    </div>
                  </SectionCard>
                </div>
              ) : null}
            </div>
          </div>

          {aiOpen && isChapterView ? (
            <aside
              className="hidden h-full w-[264px] border-l border-border/45 bg-[linear-gradient(180deg,rgba(250,251,252,0.9),rgba(247,248,250,0.96))] backdrop-blur xl:flex xl:flex-col"
            >
              <div className="border-b border-border/60 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="type-card text-foreground">Assistente editorial</p>
                </div>
                <p className="type-meta mt-1 text-muted-foreground">{getAiModeDescription(activeNodeId, isChapterView)}</p>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-3 px-3 py-3">
                  <div className="rounded-[18px] border-l-2 border-primary/25 bg-transparent px-1 py-1">
                    <p className="type-meta uppercase tracking-[0.18em] text-primary">Leitura atual</p>
                    <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
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
                          className="rounded-[18px] border border-transparent bg-white/52 px-3 py-3"
                        >
                          <div className="flex gap-3">
                            <div className={`mt-0.5 rounded-full p-1.5 ${
                              alert.tone === 'warning'
                                ? 'bg-amber-50 text-amber-700'
                                : alert.tone === 'success'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : alert.tone === 'primary'
                                    ? 'bg-primary/8 text-primary'
                                    : 'bg-sky-50 text-sky-700'
                            }`}>
                              <Icon className="h-4 w-4 text-current" />
                            </div>
                            <div>
                              <p className="type-label text-foreground">{compactAlertTitle(alert.id)}</p>
                              <p className="mt-1 whitespace-pre-line text-[13px] leading-5 text-muted-foreground">{compactAlertDescription(alert.id, alert.description)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-2.5">
                    <p className="type-label text-foreground">Ações sugeridas</p>
                    {contextualSuggestions.map(({ key, label, helper, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAiText(responses[key])}
                        className="w-full rounded-[18px] border border-transparent bg-white/66 px-3.5 py-3 text-left transition-colors hover:border-border/60 hover:bg-white/92"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-primary/8 p-1.5">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="type-label text-foreground">{compactSuggestionLabel(label)}</p>
                            <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{helper}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <Separator />

                  <div className="rounded-[18px] border border-border/55 bg-white/78 px-3.5 py-3">
                    <p className="type-label text-foreground">Saída da IA</p>
                    <p className="mt-2 text-[12.5px] leading-5 text-muted-foreground">{aiText}</p>
                  </div>
                </div>
              </ScrollArea>
            </aside>
          ) : null}

          {!isChapterView ? (
            <div className="pointer-events-none fixed bottom-6 right-6 z-20 hidden xl:block">
              <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border/80 bg-white/92 px-4 py-3 shadow-lg backdrop-blur">
                <Sparkles className="h-4 w-4 text-primary" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Assistência compacta</p>
                  <p className="text-muted-foreground">A IA fica recolhida para priorizar a escrita.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAiText(activeNodeId === 'abstractPt' ? responses.review : responses.academic)}>
                  Usar dica
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <Dialog open={citationDialogOpen} onOpenChange={setCitationDialogOpen}>
          <DialogContent className="max-w-2xl rounded-[28px] border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(249,250,252,0.98))] p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="border-b border-border/60 px-6 py-5 md:px-7">
              <DialogHeader className="text-left">
                <DialogTitle className="text-[1.45rem] tracking-[-0.02em] text-foreground">Inserir citação</DialogTitle>
                <DialogDescription className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Insira uma citação acadêmica vinculada às referências do projeto.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-5 px-6 py-6 md:px-7">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Referência</p>
                  <Select value={citationForm.referenceId} onValueChange={handleReferenceSelectChange}>
                    <SelectTrigger className="h-11 w-full rounded-2xl bg-white/84">
                      <SelectValue placeholder="Selecione uma referência existente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick-create-reference">
                        + Nova referência rápida
                      </SelectItem>
                      {(referencesListQuery.data ?? []).map((reference) => (
                        <SelectItem key={reference.id} value={reference.id}>
                          {formatCitationReference(reference)} • {reference.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Tipo de citação</p>
                    <Select value={citationForm.type} onValueChange={(value) => updateCitationForm('type', value as CitationType)}>
                      <SelectTrigger className="h-11 w-full rounded-2xl bg-white/84">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {citationTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Página {(citationForm.type === 'direct_short' || citationForm.type === 'direct_long') ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(opcional)</span>}
                    </p>
                    <Input
                      value={citationForm.page}
                      onChange={(event) => updateCitationForm('page', event.target.value)}
                      placeholder="Ex.: 42-43"
                      className="h-11 rounded-2xl bg-white/84"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Formato da citação</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => updateCitationForm('displayMode', 'parenthetical')}
                      className={`rounded-[22px] border px-4 py-3 text-left transition-colors ${
                        citationForm.displayMode === 'parenthetical'
                          ? 'border-primary/50 bg-primary/6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                          : 'border-border/70 bg-white/84 hover:border-border'
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">Parentética</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">(SILVA, 2024)</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCitationForm('displayMode', 'narrative')}
                      className={`rounded-[22px] border px-4 py-3 text-left transition-colors ${
                        citationForm.displayMode === 'narrative'
                          ? 'border-primary/50 bg-primary/6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                          : 'border-border/70 bg-white/84 hover:border-border'
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">Narrativa</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">Silva (2024)</p>
                    </button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {citationTypeOptions.find((option) => option.value === citationForm.type)?.helper}
                </p>

                {(citationForm.type === 'direct_short' || citationForm.type === 'direct_long') ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Trecho citado</p>
                    <Textarea
                      value={citationForm.quotedText}
                      onChange={(event) => updateCitationForm('quotedText', event.target.value)}
                      className={`rounded-[22px] bg-white/84 text-sm text-foreground ${
                        citationForm.type === 'direct_long' ? 'min-h-[140px]' : 'min-h-[96px]'
                      }`}
                      placeholder={
                        citationForm.type === 'direct_long'
                          ? 'Cole o trecho longo da citação.'
                          : 'Cole o trecho literal da citação.'
                      }
                    />
                  </div>
                ) : null}

                {citationForm.type === 'apud' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Autor citado em apud</p>
                      <Input
                        value={citationForm.apudAuthor}
                        onChange={(event) => updateCitationForm('apudAuthor', event.target.value)}
                        placeholder="Ex.: SILVA"
                        className="h-11 rounded-2xl bg-white/84"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Ano do apud</p>
                      <Input
                        value={citationForm.apudYear}
                        onChange={(event) => updateCitationForm('apudYear', event.target.value)}
                        placeholder="Ex.: 2018"
                        className="h-11 rounded-2xl bg-white/84"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(250,251,252,0.95),rgba(255,255,255,0.98))] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Preview ABNT</p>
                  <p className="mt-2 text-base font-medium tracking-[-0.01em] text-foreground">
                    {buildCitationAbntPreview(
                      citationForm.referenceId
                        ? {
                            id: 'preview',
                            projectId,
                            chapterId: selectedChapterId ?? '',
                            referenceId: citationForm.referenceId,
                            type: citationForm.type,
                            displayMode: citationForm.displayMode,
                            page: citationForm.page,
                            quotedText: citationForm.quotedText,
                            apudAuthor: citationForm.apudAuthor,
                            apudYear: citationForm.apudYear,
                            reference: (referencesListQuery.data ?? []).find((reference) => reference.id === citationForm.referenceId),
                          }
                        : undefined,
                    )}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {buildCitationPreviewLabel(
                      citationForm.referenceId
                        ? {
                            id: 'preview-inline',
                            projectId,
                            chapterId: selectedChapterId ?? '',
                            referenceId: citationForm.referenceId,
                            type: citationForm.type,
                            displayMode: citationForm.displayMode,
                            page: citationForm.page,
                            quotedText: citationForm.quotedText,
                            apudAuthor: citationForm.apudAuthor,
                            apudYear: citationForm.apudYear,
                            reference: (referencesListQuery.data ?? []).find((reference) => reference.id === citationForm.referenceId),
                          }
                        : undefined,
                    )}
                  </p>
                </div>

                {citationFeedback?.tone === 'error' ? (
                  <p className="rounded-[18px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {citationFeedback.message}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="border-t border-border/60 px-6 py-5 md:px-7">
              <Button variant="outline" onClick={() => setCitationDialogOpen(false)} disabled={citationSaving}>
                Cancelar
              </Button>
              <Button onClick={() => void handleCreateCitation()} disabled={citationSaving || !referencesListQuery.data?.length}>
                {citationSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Quote className="h-4 w-4" />}
                {citationSaving ? 'Inserindo...' : 'Inserir citação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={quickReferenceDialogOpen}
          onOpenChange={(open) => {
            setQuickReferenceDialogOpen(open)
            if (!open) {
              setQuickReferenceFeedback(null)
            }
          }}
        >
          <DialogContent className="max-w-xl rounded-[26px] border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(249,250,252,0.98))] p-0 shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
            <div className="border-b border-border/60 px-6 py-5">
              <DialogHeader className="text-left">
                <DialogTitle className="text-[1.2rem] tracking-[-0.02em] text-foreground">Nova referência rápida</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">
                  Cadastre o essencial e continue escrevendo sem sair do editor.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Tipo</p>
                  <Select value={quickReferenceForm.type} onValueChange={(value) => updateQuickReferenceForm('type', value as QuickReferenceFormState['type'])}>
                    <SelectTrigger className="h-11 w-full rounded-2xl bg-white/84">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">Artigo</SelectItem>
                      <SelectItem value="book">Livro</SelectItem>
                      <SelectItem value="website">Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Autores</p>
                  <Input
                    value={quickReferenceForm.authors}
                    onChange={(event) => updateQuickReferenceForm('authors', event.target.value)}
                    placeholder="Sobrenome, Nome; Sobrenome, Nome"
                    className="h-11 rounded-2xl bg-white/84"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Título</p>
                <Input
                  value={quickReferenceForm.title}
                  onChange={(event) => updateQuickReferenceForm('title', event.target.value)}
                  placeholder="Título da obra"
                  className="h-11 rounded-2xl bg-white/84"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Ano</p>
                  <Input
                    value={quickReferenceForm.year}
                    onChange={(event) => updateQuickReferenceForm('year', event.target.value)}
                    placeholder="2024"
                    className="h-11 rounded-2xl bg-white/84"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{getQuickReferenceSourceLabel(quickReferenceForm.type)}</p>
                  <Input
                    value={quickReferenceForm.source}
                    onChange={(event) => updateQuickReferenceForm('source', event.target.value)}
                    placeholder={
                      quickReferenceForm.type === 'book'
                        ? 'Editora'
                        : quickReferenceForm.type === 'website'
                          ? 'Nome do site'
                          : 'Nome do periódico'
                    }
                    className="h-11 rounded-2xl bg-white/84"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Link (opcional)</p>
                <Input
                  value={quickReferenceForm.url}
                  onChange={(event) => updateQuickReferenceForm('url', event.target.value)}
                  placeholder="https://..."
                  className="h-11 rounded-2xl bg-white/84"
                />
              </div>

              {quickReferenceFeedback ? (
                <p className="rounded-[18px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {quickReferenceFeedback}
                </p>
              ) : null}
            </div>

            <DialogFooter className="border-t border-border/60 px-6 py-5">
              <Button variant="outline" onClick={() => setQuickReferenceDialogOpen(false)} disabled={quickReferenceSaving}>
                Cancelar
              </Button>
              <Button onClick={() => void handleCreateQuickReference()} disabled={quickReferenceSaving}>
                {quickReferenceSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {quickReferenceSaving ? 'Salvando...' : 'Criar referência'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

const ChapterContentEditor = forwardRef<ChapterEditorHandle, {
  value: string
  citationsMap: Map<string, Citation>
  onChange: (value: string) => void
  placeholder: string
}>(({ value, citationsMap, onChange, placeholder }, ref) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const rawValueRef = useRef(value)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const needsRerender = rawValueRef.current !== value || root.textContent === ''
    rawValueRef.current = value

    if (needsRerender) {
      renderContentEditableValue(root, value, citationsMap)
    } else {
      Array.from(root.querySelectorAll<HTMLElement>('[data-citation-id]')).forEach((chip) => {
        const citationId = chip.dataset.citationId ?? ''
        const citation = citationsMap.get(citationId)
        chip.className = createCitationChipNode(document, citationId, citation).className
        chip.textContent = getCitationChipLabel(citation)
        chip.title = getCitationChipTooltip(citationId, citation)
        chip.setAttribute('aria-label', getCitationChipTooltip(citationId, citation))
      })
    }
  }, [citationsMap, value])

  useImperativeHandle(ref, () => ({
    focusAtEnd() {
      const root = rootRef.current
      if (!root) return
      placeCaretAtEnd(root)
    },
    insertCitation(citationId: string, citationOverride?: Citation) {
      const root = rootRef.current
      if (!root) return value

      const selection = window.getSelection()
      const chip = createCitationChipNode(document, citationId, citationOverride ?? citationsMap.get(citationId))

      if (!selection || selection.rangeCount === 0 || !root.contains(selection.anchorNode)) {
        placeCaretAtEnd(root)
      }

      const activeSelection = window.getSelection()
      if (!activeSelection || activeSelection.rangeCount === 0) return value

      const range = activeSelection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(chip)
      moveCaretAfterNode(chip)

      const nextValue = serializeEditorContent(root)
      rawValueRef.current = nextValue
      onChange(nextValue)
      return nextValue
    },
  }), [citationsMap, onChange, value])

  function emitCurrentValue() {
    const root = rootRef.current
    if (!root) return
    const nextValue = serializeEditorContent(root)
    rawValueRef.current = nextValue
    onChange(nextValue)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const root = rootRef.current
    if (!root) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    if (event.key === 'Enter') {
      event.preventDefault()
      document.execCommand('insertLineBreak')
      emitCurrentValue()
      return
    }

    if ((event.key === 'Backspace' || event.key === 'Delete') && selection.isCollapsed) {
      const range = selection.getRangeAt(0)
      const container = range.startContainer
      const offset = range.startOffset

      const sibling = (() => {
        if (container.nodeType === Node.TEXT_NODE) {
          if (event.key === 'Backspace' && offset === 0) return container.previousSibling
          if (event.key === 'Delete' && offset === (container.textContent?.length ?? 0)) return container.nextSibling
          return null
        }

        if (!(container instanceof HTMLElement)) return null
        if (event.key === 'Backspace') return container.childNodes[offset - 1] ?? null
        return container.childNodes[offset] ?? null
      })()

      if (sibling instanceof HTMLElement && sibling.dataset.citationId) {
        event.preventDefault()
        const nextCaretTarget = event.key === 'Backspace' ? sibling.previousSibling : sibling.nextSibling
        sibling.remove()
        if (nextCaretTarget) {
          moveCaretAfterNode(nextCaretTarget)
        } else {
          placeCaretAtEnd(root)
        }
        emitCurrentValue()
      }
    }
  }

  return (
    <div className="relative">
      {!value ? (
        <span className="pointer-events-none absolute left-0 top-0 text-[18px] leading-[2.08] tracking-[0.006em] text-muted-foreground/55">
          {placeholder}
        </span>
      ) : null}
      <div
        ref={rootRef}
        role="textbox"
        aria-label="Editor do capítulo"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        className="min-h-[860px] whitespace-pre-wrap break-words rounded-[22px] bg-transparent p-0 font-serif text-[18px] leading-[2.08] tracking-[0.006em] text-foreground outline-none"
        onInput={emitCurrentValue}
        onKeyDown={handleKeyDown}
        onPaste={(event) => {
          event.preventDefault()
          const text = event.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
          emitCurrentValue()
        }}
      />
    </div>
  )
})

ChapterContentEditor.displayName = 'ChapterContentEditor'

function AcademicToolbarButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  disabled = false,
  badge,
}: {
  icon: typeof Quote
  label: string
  tooltip: string
  onClick?: () => void
  disabled?: boolean
  badge?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className="h-8 gap-1.5 rounded-lg border border-transparent bg-transparent px-2.5 text-[13px] font-medium text-foreground shadow-none hover:bg-muted/45 disabled:bg-transparent disabled:text-muted-foreground"
          >
            <Icon className="h-4 w-4" />
            {label}
            {badge ? (
              <span className="rounded-full border border-border/70 bg-transparent px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                {badge}
              </span>
            ) : null}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function DocumentSection({
  title,
  counter,
  children,
}: {
  title: string
  counter: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
        <StatusBadge label={counter} tone="neutral" />
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function DocumentNavItem({
  title,
  helper,
  active,
  status,
  onClick,
}: {
  title: string
  helper: string
  active: boolean
  status: DocumentStatus
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-[22px] border px-4 py-4 text-left transition-all duration-200 ${
        active
          ? 'border-primary/15 bg-[linear-gradient(180deg,rgba(24,53,104,0.08),rgba(24,53,104,0.03))] text-foreground shadow-sm'
          : 'border-transparent bg-transparent hover:border-border/70 hover:bg-white/70'
      }`}
    >
      <span
        className={`absolute inset-y-3 left-0 w-1 rounded-r-full transition-colors ${
          active ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/30'
        }`}
      />
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 pl-2">
            <p className={`type-label truncate ${active ? 'text-foreground' : 'text-foreground/90'}`}>{title}</p>
            <p className="mt-1 text-sm text-muted-foreground transition-colors group-hover:text-foreground/70">
              {helper} • {getStatusLabel(status)}
            </p>
          </div>
          <div
            className={`mt-1 h-2.5 w-2.5 rounded-full ${
              status === 'completed'
                ? 'bg-emerald-500'
                : status === 'writing'
                  ? 'bg-primary'
                  : 'bg-amber-400'
            }`}
          />
        </div>
      </div>
    </button>
  )
}

function TextDocumentCard({
  title,
  description,
  value,
  onChange,
  wordCount,
  progressValue,
  sessionLabel,
  target,
  kindLabel,
  checklistItems,
  feedback,
}: {
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  wordCount: number
  progressValue: number
  sessionLabel: string
  target: number
  kindLabel: string
  checklistItems: Array<{ label: string; status: DocumentStatus; helper: string }>
  feedback: { tone: 'success' | 'error'; message: string } | null
}) {
  return (
    <section className="space-y-7">
      <div className="rounded-[34px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,249,252,0.98))] px-6 py-6 shadow-sm md:px-9 md:py-8">
        <div className="max-w-4xl space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/70">{kindLabel}</p>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[clamp(1.6rem,2vw,2.2rem)] font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Meta recomendada: {target}-{Math.max(target * 3, target + 200)} palavras.
              </p>
            </div>
            <StatusBadge label={`${wordCount} palavras`} tone={wordCount > 0 ? 'info' : 'neutral'} />
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Progresso da síntese</span>
              <span>{progressValue}% da meta mínima</span>
            </div>
            <div className="h-1.5 rounded-full bg-primary/10">
              <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${progressValue}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{sessionLabel}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[34px] border border-border/80 bg-white/86 px-6 py-6 shadow-sm md:px-9 md:py-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/70">Área de escrita</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Escreva com foco em legibilidade, densidade conceitual e fechamento argumentativo.
              </p>
            </div>
            <StatusBadge
              label={wordCount >= target ? 'Preenchido' : wordCount > 0 ? 'Em escrita' : 'Pendente'}
              tone={wordCount >= target ? 'success' : wordCount > 0 ? 'primary' : 'warning'}
            />
          </div>
          <div className="rounded-[32px] border border-primary/10 bg-[linear-gradient(180deg,rgba(24,53,104,0.025),rgba(255,255,255,0.97))] px-7 py-7 md:px-10">
            <Textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="min-h-[640px] resize-none border-none bg-transparent p-0 font-serif text-[17px] leading-[2.02] tracking-[0.005em] shadow-none focus-visible:ring-0"
              placeholder="Comece a escrever aqui..."
            />
          </div>
          {feedback ? (
            <p className={feedback.tone === 'success' ? 'mt-4 text-sm text-primary' : 'mt-4 text-sm text-destructive'}>
              {feedback.message}
            </p>
          ) : null}
        </div>

        <div className="rounded-[30px] border border-border/80 bg-white/72 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">Checklist editorial</p>
          <div className="mt-4 space-y-3">
          {checklistItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-[22px] px-1 py-1">
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  item.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700'
                    : item.status === 'writing'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {item.status === 'completed' ? '✓' : item.status === 'writing' ? '!' : '○'}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.helper}</p>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  )
}

function ReferenceSummaryCard({
  title,
  value,
  helper,
}: {
  title: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
    </div>
  )
}

function buildChecklistItems(wordCount: number, target: number, label: string) {
  return [
    {
      label: 'Estrutura iniciada',
      status: wordCount === 0 ? 'pending' as const : 'completed' as const,
      helper: wordCount === 0 ? `O ${label} ainda não começou.` : `O ${label} já possui base textual inicial.`,
    },
    {
      label: 'Texto abaixo da recomendação mínima',
      status: wordCount > 0 && wordCount < target ? 'writing' as const : wordCount >= target ? 'completed' as const : 'pending' as const,
      helper: `A meta mínima começa em ${target} palavras para sustentar a síntese com clareza.`,
    },
    {
      label: 'Fechamento editorial consistente',
      status: wordCount >= target ? 'completed' as const : wordCount > 0 ? 'writing' as const : 'pending' as const,
      helper: `Busque uma conclusão curta que feche objetivo, método e resultado central do ${label}.`,
    },
  ]
}

function ArrowIndicator() {
  return <Link2 className="h-4 w-4" />
}
