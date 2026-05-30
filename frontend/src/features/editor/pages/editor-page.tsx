import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  FileImage,
  FileSpreadsheet,
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
import { chapterFiguresQuery, projectFiguresQuery } from '@/features/editor/services/figures.service'
import { chapterTabularElementsQuery, projectTabularElementsQuery } from '@/features/editor/services/tables.service'
import { referencesQuery } from '@/features/references/services/references.service'
import { clearActiveProjectId, resolveValidActiveProjectId, setActiveProjectId } from '@/shared/services/active-project.service'
import { createCitation, deleteCitation } from '@/shared/services/citation.service'
import { createFigure, deleteFigure, getFigureImage } from '@/shared/services/figure.service'
import { createReference } from '@/shared/services/reference.service'
import { createTabularElement, deleteTabularElement } from '@/shared/services/table.service'
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
import type { Chapter, Citation, CitationDisplayMode, CitationType, Figure, Reference, TabularElement, TabularElementKind } from '@/shared/types/contracts'

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
type ProjectNodeId = 'abstractPt' | 'abstractEn' | 'references' | 'figures' | 'tables' | 'quadros'
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
  focusAtOffset: (offset: number) => void
  insertCitation: (citationId: string, citation?: Citation) => string
  insertCrossReference: (kind: CrossReferenceKind, targetId: string, reference?: CrossReferenceRenderItem) => string
  insertFigure: (figureId: string, figure?: Figure) => { value: string; caretOffset: number }
  insertTabularElement: (itemId: string, kind: TabularElementKind, item?: TabularElement) => { value: string; caretOffset: number }
}
type FigureFormState = {
  file: File | null
  caption: string
  sourceText: string
  widthPercent: Figure['widthPercent']
}
type TabularElementFormState = {
  kind: TabularElementKind
  title: string
  sourceText: string
  rows: string[][]
}
type TabularValidationResult = {
  valid: boolean
  invalidCells: Array<{ rowIndex: number; columnIndex: number }>
  message?: string
}
type QuickReferenceFormState = {
  type: 'article' | 'book' | 'website'
  authors: string
  title: string
  year: string
  source: string
  url: string
}
type CrossReferenceKind = 'FIG' | 'TABLE' | 'QUADRO'
type CrossReferenceFormState = {
  kind: CrossReferenceKind
  targetId: string
}
type CrossReferenceRenderItem = {
  id: string
  kind: CrossReferenceKind
  label: string
  tooltip: string
}

const CITE_MARKER_REGEX = /\[\[@CITE:([^\]]+)\]\]/g
const FIG_MARKER_REGEX = /\[\[@FIG:([^\]]+)\]\]/g
const TABLE_MARKER_REGEX = /\[\[@TABLE:([^\]]+)\]\]/g
const QUADRO_MARKER_REGEX = /\[\[@QUADRO:([^\]]+)\]\]/g
const XREF_MARKER_REGEX = /\[\[@XREF:(FIG|TABLE|QUADRO):([^\]]+)\]\]/g
const defaultCitationFormState: CitationFormState = {
  referenceId: '',
  type: 'indirect',
  displayMode: 'parenthetical',
  page: '',
  quotedText: '',
  apudAuthor: '',
  apudYear: '',
}
const defaultFigureFormState: FigureFormState = {
  file: null,
  caption: '',
  sourceText: '',
  widthPercent: 100,
}
const defaultTabularRows = () => [
  ['Cabeçalho 1', 'Cabeçalho 2'],
  ['', ''],
]
const defaultTabularElementFormState = (kind: TabularElementKind = 'table'): TabularElementFormState => ({
  kind,
  title: '',
  sourceText: '',
  rows: defaultTabularRows(),
})

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
const defaultCrossReferenceFormState: CrossReferenceFormState = {
  kind: 'FIG',
  targetId: '',
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
  if (nodeId === 'figures') return 'figures'
  if (nodeId === 'tables') return 'tables'
  if (nodeId === 'quadros') return 'quadros'
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
  if (routeNode === 'figures') return 'figures'
  if (routeNode === 'tables') return 'tables'
  if (routeNode === 'quadros') return 'quadros'
  if (availableChapterIds.includes(routeNode)) return `chapter:${routeNode}`
  return null
}

function buildCitationMarker(citationId: string) {
  return `[[@CITE:${citationId}]]`
}

function buildFigureMarker(figureId: string) {
  return `[[@FIG:${figureId}]]`
}

function buildTableMarker(itemId: string) {
  return `[[@TABLE:${itemId}]]`
}

function buildQuadroMarker(itemId: string) {
  return `[[@QUADRO:${itemId}]]`
}

function buildTabularMarker(kind: TabularElementKind, itemId: string) {
  return kind === 'table' ? buildTableMarker(itemId) : buildQuadroMarker(itemId)
}

function buildCrossReferenceMarker(kind: CrossReferenceKind, targetId: string) {
  return `[[@XREF:${kind}:${targetId}]]`
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

function buildFigurePreviewLabel(figure?: Figure) {
  if (!figure) return 'Figura inválida ou removida'
  return `Figura – ${figure.caption}`
}

function buildTabularElementPreviewLabel(item?: TabularElement) {
  if (!item) return 'Elemento inválido ou removido'
  return `${item.kind === 'table' ? 'Tabela' : 'Quadro'} – ${item.title}`
}

function getCrossReferenceNoun(kind: CrossReferenceKind) {
  if (kind === 'FIG') return 'Figura'
  if (kind === 'TABLE') return 'Tabela'
  return 'Quadro'
}

function getCrossReferenceInvalidLabel() {
  return 'referência inválida'
}

function getCrossReferenceLabel(reference?: CrossReferenceRenderItem) {
  return reference?.label ?? getCrossReferenceInvalidLabel()
}

function getCrossReferenceTooltip(kind: CrossReferenceKind, targetId: string, reference?: CrossReferenceRenderItem) {
  if (!reference) {
    return `Marcador ${buildCrossReferenceMarker(kind, targetId)} não encontrado na lista de elementos do projeto.`
  }

  return reference.tooltip
}

function getInvalidTabularFallbackLabel(kind: TabularElementKind) {
  return kind === 'table' ? 'Tabela removida ou inválida' : 'Quadro removido ou inválido'
}

export function validateTabularElementForm(rows: string[][]): TabularValidationResult {
  if (!rows.length || !rows[0]?.length) {
    return {
      valid: false,
      invalidCells: [],
      message: 'Preencha os cabeçalhos e pelo menos uma linha com conteúdo.',
    }
  }

  const invalidCells: Array<{ rowIndex: number; columnIndex: number }> = []
  const headers = rows[0]
  headers.forEach((cell, columnIndex) => {
    if (!cell.trim()) {
      invalidCells.push({ rowIndex: 0, columnIndex })
    }
  })

  const dataRows = rows.slice(1)
  const hasDataRow = dataRows.length > 0
  const hasAtLeastOneFilledDataCell = dataRows.some((row) => row.some((cell) => cell.trim().length > 0))

  if (!hasDataRow || !hasAtLeastOneFilledDataCell) {
    dataRows.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        if (!cell.trim()) {
          invalidCells.push({ rowIndex: rowIndex + 1, columnIndex })
        }
      })
    })
  }

  if (invalidCells.length > 0 || !hasDataRow || !hasAtLeastOneFilledDataCell) {
    return {
      valid: false,
      invalidCells,
      message: 'Preencha os cabeçalhos e pelo menos uma linha com conteúdo.',
    }
  }

  return { valid: true, invalidCells: [] }
}

function isResolvedFigurePreviewUrl(url?: string) {
  return Boolean(url && (url.startsWith('blob:') || url.startsWith('data:')))
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

function replaceFigureMarkers(content: string, figuresMap: Map<string, Figure>) {
  return content.replace(FIG_MARKER_REGEX, (_, figureId: string) => `[${buildFigurePreviewLabel(figuresMap.get(figureId))}]`)
}

function replaceTabularMarkers(content: string, tabularElementsMap: Map<string, TabularElement>) {
  return content
    .replace(TABLE_MARKER_REGEX, (_, itemId: string) => `[${buildTabularElementPreviewLabel(tabularElementsMap.get(itemId))}]`)
    .replace(QUADRO_MARKER_REGEX, (_, itemId: string) => `[${buildTabularElementPreviewLabel(tabularElementsMap.get(itemId))}]`)
}

export function extractCitationIds(content: string) {
  return Array.from(content.matchAll(CITE_MARKER_REGEX), (match) => match[1])
}

export function extractFigureIds(content: string) {
  return Array.from(content.matchAll(FIG_MARKER_REGEX), (match) => match[1])
}

export function extractTableIds(content: string) {
  return Array.from(content.matchAll(TABLE_MARKER_REGEX), (match) => match[1])
}

export function extractQuadroIds(content: string) {
  return Array.from(content.matchAll(QUADRO_MARKER_REGEX), (match) => match[1])
}

export function extractCrossReferenceTargets(content: string) {
  return Array.from(content.matchAll(XREF_MARKER_REGEX), (match) => ({
    kind: match[1] as CrossReferenceKind,
    targetId: match[2],
  }))
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

function getFigureChipLabel(figure?: Figure, figureNumber?: number) {
  if (!figure) return 'Figura indisponível'
  return `Figura ${figureNumber ?? 1} – ${figure.caption}`
}

function getFigureChipTooltip(figureId: string, figure?: Figure) {
  if (!figure) {
    return `Marcador ${buildFigureMarker(figureId)} não encontrado na lista de figuras do projeto.`
  }

  return `${figure.caption}${figure.sourceText ? ` • ${figure.sourceText}` : ''}`
}

function buildFigureSourceLabel(figure?: Figure) {
  if (!figure) return 'Figura indisponível'
  return figure.sourceText?.trim() ? `Fonte: ${figure.sourceText.trim()}` : 'Fonte: não informada.'
}

function buildFigurePreviewWidthValue(figure?: Figure) {
  return `${figure?.widthPercent ?? 100}%`
}

function getTabularElementLabel(item?: TabularElement, elementNumber?: number, fallbackKind: TabularElementKind = 'table') {
  if (!item) return getInvalidTabularFallbackLabel(fallbackKind)
  const noun = item.kind === 'table' ? 'Tabela' : 'Quadro'
  return `${noun} ${elementNumber ?? 1} – ${item.title}`
}

function getTabularElementTooltip(itemId: string, item?: TabularElement, fallbackKind: TabularElementKind = 'table') {
  if (!item) {
    return `Marcador ${fallbackKind === 'table' ? buildTableMarker(itemId) : buildQuadroMarker(itemId)} não encontrado na lista do projeto.`
  }

  const sourceLabel = item.sourceText?.trim() ? ` • ${item.sourceText.trim()}` : ''
  return `${getTabularElementLabel(item)}${sourceLabel}`
}

function buildTabularSourceLabel(item?: TabularElement) {
  if (!item) return 'Fonte: não disponível.'
  return item.sourceText?.trim() ? `Fonte: ${item.sourceText.trim()}` : 'Fonte: não informada.'
}

function createTabularPreviewTable(doc: Document, item?: TabularElement, fallbackKind: TabularElementKind = 'table') {
  const table = doc.createElement('table')
  table.className = (item?.kind ?? fallbackKind) === 'quadro'
    ? 'w-full border-collapse text-left text-[14px] leading-6 text-foreground'
    : 'w-full border-separate border-spacing-0 text-left text-[14px] leading-6 text-foreground'

  const body = doc.createElement('tbody')
  const rows = item?.rows?.length ? item.rows : [[getInvalidTabularFallbackLabel(fallbackKind)]]

  rows.forEach((row, rowIndex) => {
    const tr = doc.createElement('tr')
    row.forEach((cellValue) => {
      const cell = doc.createElement(rowIndex === 0 ? 'th' : 'td')
      cell.className = (item?.kind ?? fallbackKind) === 'quadro'
        ? 'border border-slate-300 px-3 py-2 align-top'
        : rowIndex === 0
          ? 'border-b border-slate-300 px-3 py-2 align-top font-semibold'
          : 'border-b border-slate-200 px-3 py-2 align-top'
      cell.textContent = cellValue || '—'
      tr.append(cell)
    })
    body.append(tr)
  })

  table.append(body)
  return table
}

function createFigurePreviewFallback(doc: Document, message: string) {
  const fallback = doc.createElement('div')
  fallback.className = 'flex min-h-[180px] w-full items-center justify-center px-6 py-10 text-center text-sm italic text-muted-foreground'
  fallback.textContent = message
  return fallback
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

function createCrossReferenceNode(doc: Document, kind: CrossReferenceKind, targetId: string, reference?: CrossReferenceRenderItem) {
  const chip = doc.createElement('span')
  chip.dataset.xrefKind = kind
  chip.dataset.xrefTargetId = targetId
  chip.contentEditable = 'false'
  chip.className = reference
    ? 'inline rounded-sm border-b border-dotted border-primary/30 px-0.5 text-[0.98em] leading-[inherit] text-foreground align-baseline'
    : 'inline rounded-sm border-b border-dotted border-amber-400/70 px-0.5 text-[0.98em] leading-[inherit] text-amber-800 align-baseline'
  chip.textContent = getCrossReferenceLabel(reference)
  chip.title = getCrossReferenceTooltip(kind, targetId, reference)
  chip.setAttribute('aria-label', getCrossReferenceTooltip(kind, targetId, reference))
  chip.setAttribute('tabindex', '0')
  return chip
}

function createFigureChipNode(doc: Document, figureId: string, figure?: Figure, figureNumber?: number) {
  const wrapper = doc.createElement('figure')
  wrapper.dataset.figureId = figureId
  wrapper.contentEditable = 'false'
  wrapper.className = 'my-8 block w-full text-center'
  wrapper.title = getFigureChipTooltip(figureId, figure)
  wrapper.setAttribute('aria-label', getFigureChipTooltip(figureId, figure))
  wrapper.setAttribute('tabindex', '0')

  const frame = doc.createElement('div')
  frame.className = 'mx-auto flex w-full flex-col items-center gap-3'
  frame.style.width = buildFigurePreviewWidthValue(figure)
  frame.style.maxWidth = '100%'

  const media = doc.createElement('div')
  media.className = figure
    ? 'w-full'
    : 'w-full'

  if (figure?.imageUrl && isResolvedFigurePreviewUrl(figure.imageUrl)) {
    const image = doc.createElement('img')
    image.src = figure.imageUrl
    image.alt = figure.caption
    image.className = 'mx-auto block h-auto w-full max-w-full object-contain'
    image.setAttribute('loading', 'lazy')
    image.addEventListener('error', () => {
      media.replaceChildren(createFigurePreviewFallback(doc, 'Prévia da imagem indisponível'))
    }, { once: true })
    media.append(image)
  } else if (figure) {
    media.append(createFigurePreviewFallback(doc, 'Prévia da imagem indisponível'))
  } else {
    media.append(createFigurePreviewFallback(doc, 'Figura indisponível'))
  }

  const caption = doc.createElement('figcaption')
  caption.className = figure
    ? 'text-[15px] font-medium leading-7 text-foreground'
    : 'text-[15px] font-medium leading-7 text-amber-900'
  caption.textContent = getFigureChipLabel(figure, figureNumber)

  const source = doc.createElement('p')
  source.className = 'text-[13px] leading-6 text-muted-foreground'
  source.textContent = buildFigureSourceLabel(figure)

  frame.append(media, caption, source)
  wrapper.append(frame)
  return wrapper
}

function createTabularElementNode(
  doc: Document,
  itemId: string,
  item?: TabularElement,
  elementNumber?: number,
  fallbackKind: TabularElementKind = 'table',
) {
  const wrapper = doc.createElement('figure')
  if ((item?.kind ?? fallbackKind) === 'quadro') {
    wrapper.dataset.quadroId = itemId
  } else {
    wrapper.dataset.tableId = itemId
  }
  wrapper.contentEditable = 'false'
  wrapper.className = 'my-8 block w-full text-center'
  wrapper.title = getTabularElementTooltip(itemId, item, fallbackKind)
  wrapper.setAttribute('aria-label', getTabularElementTooltip(itemId, item, fallbackKind))
  wrapper.setAttribute('tabindex', '0')

  const frame = doc.createElement('div')
  frame.className = 'mx-auto flex w-full max-w-[860px] flex-col items-center gap-3'

  const caption = doc.createElement('figcaption')
  caption.className = item
    ? 'text-[15px] font-medium leading-7 text-foreground'
    : 'text-[15px] font-medium leading-7 text-amber-900'
  caption.textContent = getTabularElementLabel(item, elementNumber, fallbackKind)

  const tableWrapper = doc.createElement('div')
  tableWrapper.className = 'w-full overflow-x-auto'
  tableWrapper.append(createTabularPreviewTable(doc, item, fallbackKind))

  const source = doc.createElement('p')
  source.className = 'text-[13px] leading-6 text-muted-foreground'
  source.textContent = buildTabularSourceLabel(item)

  frame.append(caption, tableWrapper, source)
  wrapper.append(frame)
  return wrapper
}

const INLINE_MARKER_REGEX = /\[\[@(CITE|FIG|TABLE|QUADRO):([^\]]+)\]\]|\[\[@XREF:(FIG|TABLE|QUADRO):([^\]]+)\]\]/g
function appendContentWithInlineMarkers(
  root: HTMLElement,
  content: string,
  citationsMap: Map<string, Citation>,
  figuresMap: Map<string, Figure>,
  tabularElementsMap: Map<string, TabularElement>,
  crossReferencesMap: Map<string, CrossReferenceRenderItem>,
) {
  let lastIndex = 0
  let figureNumber = 0
  let tableNumber = 0
  let quadroNumber = 0

  content.replace(INLINE_MARKER_REGEX, (match, markerType: string, markerId: string, xrefKind: string, xrefTargetId: string, offset: number) => {
    if (offset > lastIndex) {
      root.append(document.createTextNode(content.slice(lastIndex, offset)))
    }

    if (markerType === 'CITE') {
      root.append(createCitationChipNode(root.ownerDocument, markerId, citationsMap.get(markerId)))
    } else if (markerType === 'FIG') {
      figureNumber += 1
      root.append(createFigureChipNode(root.ownerDocument, markerId, figuresMap.get(markerId), figureNumber))
    } else if (markerType === 'TABLE') {
      tableNumber += 1
      root.append(createTabularElementNode(root.ownerDocument, markerId, tabularElementsMap.get(markerId), tableNumber, 'table'))
    } else if (markerType === 'QUADRO') {
      quadroNumber += 1
      root.append(createTabularElementNode(root.ownerDocument, markerId, tabularElementsMap.get(markerId), quadroNumber, 'quadro'))
    } else if (xrefKind && xrefTargetId) {
      root.append(createCrossReferenceNode(root.ownerDocument, xrefKind as CrossReferenceKind, xrefTargetId, crossReferencesMap.get(`${xrefKind}:${xrefTargetId}`)))
    }

    lastIndex = offset + match.length
    return match
  })

  if (lastIndex < content.length) {
    root.append(document.createTextNode(content.slice(lastIndex)))
  }
}

function renderContentEditableValue(
  root: HTMLElement,
  content: string,
  citationsMap: Map<string, Citation>,
  figuresMap: Map<string, Figure>,
  tabularElementsMap: Map<string, TabularElement>,
  crossReferencesMap: Map<string, CrossReferenceRenderItem>,
) {
  root.replaceChildren()
  appendContentWithInlineMarkers(root, content, citationsMap, figuresMap, tabularElementsMap, crossReferencesMap)
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

  if (node.dataset.figureId) {
    return buildFigureMarker(node.dataset.figureId)
  }

  if (node.dataset.tableId) {
    return buildTableMarker(node.dataset.tableId)
  }

  if (node.dataset.quadroId) {
    return buildQuadroMarker(node.dataset.quadroId)
  }

  if (node.dataset.xrefKind && node.dataset.xrefTargetId) {
    return buildCrossReferenceMarker(node.dataset.xrefKind as CrossReferenceKind, node.dataset.xrefTargetId)
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

function getSerializedNodeLength(node: Node): number {
  return serializeEditorNode(node).length
}

function getSerializedOffset(root: HTMLElement, container: Node, offset: number): number {
  if (container === root) {
    return Array.from(root.childNodes).slice(0, offset).reduce((total, node) => total + getSerializedNodeLength(node), 0)
  }

  let serializedOffset = 0
  let found = false

  const visit = (node: Node): boolean => {
    if (node === container) {
      if (node.nodeType === Node.TEXT_NODE) {
        serializedOffset += offset
      } else if (node instanceof HTMLElement) {
        if (node.dataset.citationId || node.dataset.figureId || node.dataset.tableId || node.dataset.quadroId || (node.dataset.xrefKind && node.dataset.xrefTargetId)) {
          serializedOffset += offset > 0 ? getSerializedNodeLength(node) : 0
        } else if (node.tagName === 'BR') {
          serializedOffset += Math.min(offset, 1)
        } else {
          serializedOffset += Array.from(node.childNodes)
            .slice(0, offset)
            .reduce((total, child) => total + getSerializedNodeLength(child), 0)
        }
      }

      found = true
      return true
    }

    if (node.nodeType === Node.TEXT_NODE) {
      serializedOffset += node.textContent?.length ?? 0
      return false
    }

    if (!(node instanceof HTMLElement)) {
      return false
    }

    if (node.dataset.citationId || node.dataset.figureId || node.dataset.tableId || node.dataset.quadroId || (node.dataset.xrefKind && node.dataset.xrefTargetId)) {
      serializedOffset += getSerializedNodeLength(node)
      return false
    }

    if (node.tagName === 'BR') {
      serializedOffset += 1
      return false
    }

    for (const child of Array.from(node.childNodes)) {
      if (visit(child)) {
        if (node.tagName === 'DIV' || node.tagName === 'P') {
          serializedOffset += 1
        }
        return true
      }
    }

    if (node.tagName === 'DIV' || node.tagName === 'P') {
      serializedOffset += 1
    }

    return false
  }

  for (const child of Array.from(root.childNodes)) {
    if (visit(child)) {
      break
    }
  }

  if (found) {
    return serializedOffset
  }

  return serializeEditorContent(root).length
}

function placeCaretAtSerializedOffset(root: HTMLElement, targetOffset: number) {
  root.focus()
  const selection = window.getSelection()
  if (!selection) return

  const range = document.createRange()
  let remainingOffset = Math.max(0, targetOffset)

  const placeInsideTextNode = (node: Text, offset: number) => {
    range.setStart(node, offset)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  for (const node of Array.from(root.childNodes)) {
    const nodeLength = getSerializedNodeLength(node)

    if (remainingOffset > nodeLength) {
      remainingOffset -= nodeLength
      continue
    }

    if (node.nodeType === Node.TEXT_NODE) {
      placeInsideTextNode(node as Text, Math.min(remainingOffset, node.textContent?.length ?? 0))
      return
    }

    if (node instanceof HTMLElement && (node.dataset.citationId || node.dataset.figureId || node.dataset.tableId || node.dataset.quadroId || (node.dataset.xrefKind && node.dataset.xrefTargetId))) {
      if (remainingOffset === 0) {
        range.setStartBefore(node)
      } else {
        range.setStartAfter(node)
      }
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }

    range.setStartAfter(node)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    return
  }

  placeCaretAtEnd(root)
}

function buildBlockInsertionContent(content: string, startOffset: number, endOffset: number, marker: string) {
  const normalizedStart = Math.max(0, Math.min(startOffset, content.length))
  const normalizedEnd = Math.max(normalizedStart, Math.min(endOffset, content.length))
  const before = content.slice(0, normalizedStart)
  const after = content.slice(normalizedEnd)
  const prefix = before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const suffix = after.length === 0 ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
  const nextValue = `${before}${prefix}${marker}${suffix}${after}`
  const caretOffset = before.length + prefix.length + marker.length + suffix.length
  return { nextValue, caretOffset }
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

function removeFigureMarker(content: string, figureId: string) {
  const markerRegex = new RegExp(escapeRegExp(buildFigureMarker(figureId)), 'g')
  return content.replace(markerRegex, '')
}

function removeTabularMarker(content: string, item: Pick<TabularElement, 'id' | 'kind'>) {
  const marker = item.kind === 'table' ? buildTableMarker(item.id) : buildQuadroMarker(item.id)
  const markerRegex = new RegExp(escapeRegExp(marker), 'g')
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
  if (nodeId === 'figures') return 'Pós-textual visual'
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
    templateProfile: 'ABNT_GENERIC' | 'FEMAF'
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
    templateProfile: project.templateProfile,
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
    queryClient.invalidateQueries({ queryKey: ['figures', 'project', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['tabular-elements', 'project', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['timeline'] }),
    queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] }),
    queryClient.invalidateQueries({ queryKey: ['export-status'] }),
    chapterId
      ? Promise.all([
          queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] }),
          queryClient.invalidateQueries({ queryKey: ['citations', 'chapter', chapterId] }),
          queryClient.invalidateQueries({ queryKey: ['figures', 'chapter', chapterId] }),
          queryClient.invalidateQueries({ queryKey: ['tabular-elements', 'chapter', chapterId] }),
        ])
      : Promise.resolve(),
  ])
}

function upsertTabularElementInCache(
  current: TabularElement[] | undefined,
  createdItem: TabularElement,
  scope: 'project' | 'chapter',
  chapterId: string,
) {
  const nextItems = current ?? []
  const filteredItems = nextItems.filter((item) => item.id !== createdItem.id)

  if (scope === 'chapter') {
    return [...filteredItems.filter((item) => item.chapterId === chapterId), createdItem]
  }

  return [...filteredItems, createdItem]
}

function mergeTabularElementsWithOptimistic(
  current: TabularElement[] | undefined,
  optimisticItems: Record<string, TabularElement>,
  scope: 'project' | 'chapter',
  chapterId: string | null,
) {
  const scopedOptimisticItems = Object.values(optimisticItems).filter((item) => (
    scope === 'project'
      ? true
      : item.chapterId === chapterId
  ))

  return scopedOptimisticItems.reduce<TabularElement[]>(
    (items, optimisticItem) => upsertTabularElementInCache(items, optimisticItem, scope, chapterId ?? optimisticItem.chapterId),
    current ?? [],
  )
}

export function EditorPage() {
  const navigate = useNavigate()
  const { projectId = '', nodeId: routeNodeId } = useParams<{ projectId: string; nodeId?: string }>()
  const projectQuery = useQuery(editorProjectQuery(projectId))
  const chaptersListQuery = useQuery(chaptersQuery(projectId))
  const referencesListQuery = useQuery(referencesQuery(projectId))
  const projectCitationsListQuery = useQuery(projectCitationsQuery(projectId))
  const projectFiguresListQuery = useQuery(projectFiguresQuery(projectId))
  const projectTabularElementsListQuery = useQuery(projectTabularElementsQuery(projectId))
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
  const [crossReferenceDialogOpen, setCrossReferenceDialogOpen] = useState(false)
  const [crossReferenceForm, setCrossReferenceForm] = useState<CrossReferenceFormState>(defaultCrossReferenceFormState)
  const [crossReferenceFeedback, setCrossReferenceFeedback] = useState<string | null>(null)
  const [figureDialogOpen, setFigureDialogOpen] = useState(false)
  const [figureForm, setFigureForm] = useState<FigureFormState>(defaultFigureFormState)
  const [figureFeedback, setFigureFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [figureSaving, setFigureSaving] = useState(false)
  const [figurePreviewUrls, setFigurePreviewUrls] = useState<Record<string, string>>({})
  const [tabularElementDialogOpen, setTabularElementDialogOpen] = useState(false)
  const [tabularElementForm, setTabularElementForm] = useState<TabularElementFormState>(defaultTabularElementFormState())
  const [tabularElementFeedback, setTabularElementFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [tabularElementSaving, setTabularElementSaving] = useState(false)
  const [tabularValidationState, setTabularValidationState] = useState<TabularValidationResult>({ valid: true, invalidCells: [] })
  const [optimisticTabularElements, setOptimisticTabularElements] = useState<Record<string, TabularElement>>({})
  const [quickReferenceDialogOpen, setQuickReferenceDialogOpen] = useState(false)
  const [quickReferenceForm, setQuickReferenceForm] = useState<QuickReferenceFormState>(quickReferenceDefaultFormState)
  const [quickReferenceSaving, setQuickReferenceSaving] = useState(false)
  const [quickReferenceFeedback, setQuickReferenceFeedback] = useState<string | null>(null)
  const [deletingCitationId, setDeletingCitationId] = useState<string | null>(null)
  const [deletingFigureId, setDeletingFigureId] = useState<string | null>(null)
  const [deletingTabularElementId, setDeletingTabularElementId] = useState<string | null>(null)
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
  const chapterFiguresListQuery = useQuery(chapterFiguresQuery(selectedChapterId, projectId))
  const chapterTabularElementsListQuery = useQuery(chapterTabularElementsQuery(selectedChapterId, projectId))
  const previousProjectIdRef = useRef<string | null>(null)

  const selectedChapter = useMemo(
    () => selectedChapterQuery.data ?? textualChapters.find((chapter) => chapter.id === selectedChapterId) ?? textualChapters[0] ?? null,
    [selectedChapterId, selectedChapterQuery.data, textualChapters],
  )
  const chapterCitations = chapterCitationsListQuery.data ?? []
  const projectCitations = projectCitationsListQuery.data ?? []
  const chapterFigures = chapterFiguresListQuery.data ?? []
  const projectFigures = projectFiguresListQuery.data ?? []
  const chapterTabularElements = useMemo(
    () => mergeTabularElementsWithOptimistic(
      chapterTabularElementsListQuery.data,
      optimisticTabularElements,
      'chapter',
      selectedChapterId,
    ),
    [chapterTabularElementsListQuery.data, optimisticTabularElements, selectedChapterId],
  )
  const projectTabularElements = useMemo(
    () => mergeTabularElementsWithOptimistic(
      projectTabularElementsListQuery.data,
      optimisticTabularElements,
      'project',
      selectedChapterId,
    ),
    [optimisticTabularElements, projectTabularElementsListQuery.data, selectedChapterId],
  )
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
  const figuresMap = useMemo(
    () => new Map(projectFigures.map((figure) => [
      figure.id,
      {
        ...figure,
        imageUrl: figurePreviewUrls[figure.id]
          ?? (isResolvedFigurePreviewUrl(figure.imageUrl) ? figure.imageUrl : undefined),
      },
    ])),
    [figurePreviewUrls, projectFigures],
  )
  const tabularElementsMap = useMemo(
    () => new Map(projectTabularElements.map((item) => [item.id, item])),
    [projectTabularElements],
  )
  const contentCitationIds = useMemo(
    () => extractCitationIds(content),
    [content],
  )
  const contentFigureIds = useMemo(
    () => extractFigureIds(content),
    [content],
  )
  const contentTableIds = useMemo(
    () => extractTableIds(content),
    [content],
  )
  const contentQuadroIds = useMemo(
    () => extractQuadroIds(content),
    [content],
  )
  const invalidCitationCount = useMemo(
    () => contentCitationIds.filter((citationId) => !citationsMap.has(citationId)).length,
    [citationsMap, contentCitationIds],
  )
  const invalidFigureCount = useMemo(
    () => contentFigureIds.filter((figureId) => !figuresMap.has(figureId)).length,
    [contentFigureIds, figuresMap],
  )
  const invalidTabularElementCount = useMemo(
    () => [...contentTableIds, ...contentQuadroIds].filter((itemId) => !tabularElementsMap.has(itemId)).length,
    [contentQuadroIds, contentTableIds, tabularElementsMap],
  )
  const chapterCitationIdsInText = useMemo(
    () => new Set(contentCitationIds),
    [contentCitationIds],
  )
  const chapterFigureIdsInText = useMemo(
    () => new Set(contentFigureIds),
    [contentFigureIds],
  )
  const chapterTableIdsInText = useMemo(
    () => new Set(contentTableIds),
    [contentTableIds],
  )
  const chapterQuadroIdsInText = useMemo(
    () => new Set(contentQuadroIds),
    [contentQuadroIds],
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
  const projectFigureIdsInText = useMemo(
    () => new Set(projectChapterContents.flatMap((chapter) => extractFigureIds(chapter.content ?? ''))),
    [projectChapterContents],
  )
  const projectTableIdsInText = useMemo(
    () => new Set(projectChapterContents.flatMap((chapter) => extractTableIds(chapter.content ?? ''))),
    [projectChapterContents],
  )
  const projectQuadroIdsInText = useMemo(
    () => new Set(projectChapterContents.flatMap((chapter) => extractQuadroIds(chapter.content ?? ''))),
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
  const chapterFiguresInText = useMemo(
    () => chapterFigures.filter((figure) => chapterFigureIdsInText.has(figure.id)),
    [chapterFigureIdsInText, chapterFigures],
  )
  const chapterUnusedFigures = useMemo(
    () => chapterFigures.filter((figure) => !chapterFigureIdsInText.has(figure.id)),
    [chapterFigureIdsInText, chapterFigures],
  )
  const projectFiguresInText = useMemo(
    () => projectFigures.filter((figure) => projectFigureIdsInText.has(figure.id)),
    [projectFigureIdsInText, projectFigures],
  )
  const chapterTabularElementsInText = useMemo(
    () => chapterTabularElements.filter((item) => (
      item.kind === 'table' ? chapterTableIdsInText.has(item.id) : chapterQuadroIdsInText.has(item.id)
    )),
    [chapterQuadroIdsInText, chapterTableIdsInText, chapterTabularElements],
  )
  const chapterUnusedTabularElements = useMemo(
    () => chapterTabularElements.filter((item) => (
      item.kind === 'table' ? !chapterTableIdsInText.has(item.id) : !chapterQuadroIdsInText.has(item.id)
    )),
    [chapterQuadroIdsInText, chapterTableIdsInText, chapterTabularElements],
  )
  const projectTabularElementsInText = useMemo(
    () => projectTabularElements.filter((item) => (
      item.kind === 'table' ? projectTableIdsInText.has(item.id) : projectQuadroIdsInText.has(item.id)
    )),
    [projectQuadroIdsInText, projectTableIdsInText, projectTabularElements],
  )
  const citedReferenceIds = useMemo(
    () => new Set(projectCitationsInText.map((citation) => citation.referenceId)),
    [projectCitationsInText],
  )
  const citedReferences = useMemo(
    () => (referencesListQuery.data ?? []).filter((reference) => citedReferenceIds.has(reference.id)),
    [citedReferenceIds, referencesListQuery.data],
  )
  const figuresInReadingOrder = useMemo(
    () => {
      const ordered: Figure[] = []
      projectChapterContents.forEach((chapter) => {
        extractFigureIds(chapter.content ?? '').forEach((figureId) => {
          const figure = figuresMap.get(figureId)
          if (figure && !ordered.some((item) => item.id === figure.id)) {
            ordered.push(figure)
          }
        })
      })
      return ordered
    },
    [figuresMap, projectChapterContents],
  )
  const tablesInReadingOrder = useMemo(
    () => {
      const ordered: TabularElement[] = []
      projectChapterContents.forEach((chapter) => {
        extractTableIds(chapter.content ?? '').forEach((itemId) => {
          const item = tabularElementsMap.get(itemId)
          if (item && item.kind === 'table' && !ordered.some((entry) => entry.id === item.id)) {
            ordered.push(item)
          }
        })
      })
      return ordered
    },
    [projectChapterContents, tabularElementsMap],
  )
  const quadrosInReadingOrder = useMemo(
    () => {
      const ordered: TabularElement[] = []
      projectChapterContents.forEach((chapter) => {
        extractQuadroIds(chapter.content ?? '').forEach((itemId) => {
          const item = tabularElementsMap.get(itemId)
          if (item && item.kind === 'quadro' && !ordered.some((entry) => entry.id === item.id)) {
            ordered.push(item)
          }
        })
      })
      return ordered
    },
    [projectChapterContents, tabularElementsMap],
  )
  const figureNumberMap = useMemo(
    () => new Map(figuresInReadingOrder.map((figure, index) => [figure.id, index + 1])),
    [figuresInReadingOrder],
  )
  const tableNumberMap = useMemo(
    () => new Map(tablesInReadingOrder.map((item, index) => [item.id, index + 1])),
    [tablesInReadingOrder],
  )
  const quadroNumberMap = useMemo(
    () => new Map(quadrosInReadingOrder.map((item, index) => [item.id, index + 1])),
    [quadrosInReadingOrder],
  )
  const crossReferencesMap = useMemo(
    () => {
      const map = new Map<string, CrossReferenceRenderItem>()

      figuresInReadingOrder.forEach((figure, index) => {
        map.set(`FIG:${figure.id}`, {
          id: figure.id,
          kind: 'FIG',
          label: `Figura ${index + 1}`,
          tooltip: `Figura ${index + 1} • ${figure.caption}${figure.sourceText ? ` • ${figure.sourceText}` : ''}`,
        })
      })

      tablesInReadingOrder.forEach((item, index) => {
        map.set(`TABLE:${item.id}`, {
          id: item.id,
          kind: 'TABLE',
          label: `Tabela ${index + 1}`,
          tooltip: `Tabela ${index + 1} • ${item.title}${item.sourceText ? ` • ${item.sourceText}` : ''}`,
        })
      })

      quadrosInReadingOrder.forEach((item, index) => {
        map.set(`QUADRO:${item.id}`, {
          id: item.id,
          kind: 'QUADRO',
          label: `Quadro ${index + 1}`,
          tooltip: `Quadro ${index + 1} • ${item.title}${item.sourceText ? ` • ${item.sourceText}` : ''}`,
        })
      })

      projectFigures
        .filter((figure) => !figureNumberMap.has(figure.id))
        .forEach((figure) => {
          map.set(`FIG:${figure.id}`, {
            id: figure.id,
            kind: 'FIG',
            label: 'Figura não usada',
            tooltip: `Figura não usada no texto • ${figure.caption}${figure.sourceText ? ` • ${figure.sourceText}` : ''}`,
          })
        })

      projectTabularElements
        .filter((item) => item.kind === 'table' && !tableNumberMap.has(item.id))
        .forEach((item) => {
          map.set(`TABLE:${item.id}`, {
            id: item.id,
            kind: 'TABLE',
            label: 'Tabela não usada',
            tooltip: `Tabela não usada no texto • ${item.title}${item.sourceText ? ` • ${item.sourceText}` : ''}`,
          })
        })

      projectTabularElements
        .filter((item) => item.kind === 'quadro' && !quadroNumberMap.has(item.id))
        .forEach((item) => {
          map.set(`QUADRO:${item.id}`, {
            id: item.id,
            kind: 'QUADRO',
            label: 'Quadro não usado',
            tooltip: `Quadro não usado no texto • ${item.title}${item.sourceText ? ` • ${item.sourceText}` : ''}`,
          })
        })

      return map
    },
    [figureNumberMap, figuresInReadingOrder, projectFigures, projectTabularElements, quadroNumberMap, quadrosInReadingOrder, tableNumberMap, tablesInReadingOrder],
  )
  const crossReferenceOptions = useMemo(
    () => {
      const usedFigures = figuresInReadingOrder.map((figure) => ({
        id: figure.id,
        kind: 'FIG' as const,
        label: `Figura ${figureNumberMap.get(figure.id) ?? 1}`,
        description: figure.caption,
        used: true,
      }))
      const unusedFigures = projectFigures
        .filter((figure) => !figureNumberMap.has(figure.id))
        .map((figure) => ({
          id: figure.id,
          kind: 'FIG' as const,
          label: 'Figura não usada',
          description: figure.caption,
          used: false,
        }))
      const usedTables = tablesInReadingOrder.map((item) => ({
        id: item.id,
        kind: 'TABLE' as const,
        label: `Tabela ${tableNumberMap.get(item.id) ?? 1}`,
        description: item.title,
        used: true,
      }))
      const unusedTables = projectTabularElements
        .filter((item) => item.kind === 'table' && !tableNumberMap.has(item.id))
        .map((item) => ({
          id: item.id,
          kind: 'TABLE' as const,
          label: 'Tabela não usada',
          description: item.title,
          used: false,
        }))
      const usedQuadros = quadrosInReadingOrder.map((item) => ({
        id: item.id,
        kind: 'QUADRO' as const,
        label: `Quadro ${quadroNumberMap.get(item.id) ?? 1}`,
        description: item.title,
        used: true,
      }))
      const unusedQuadros = projectTabularElements
        .filter((item) => item.kind === 'quadro' && !quadroNumberMap.has(item.id))
        .map((item) => ({
          id: item.id,
          kind: 'QUADRO' as const,
          label: 'Quadro não usado',
          description: item.title,
          used: false,
        }))

      return {
        FIG: [...usedFigures, ...unusedFigures],
        TABLE: [...usedTables, ...unusedTables],
        QUADRO: [...usedQuadros, ...unusedQuadros],
      }
    },
    [figureNumberMap, figuresInReadingOrder, projectFigures, projectTabularElements, quadroNumberMap, quadrosInReadingOrder, tableNumberMap, tablesInReadingOrder],
  )
  const currentCrossReferenceOptions = useMemo(
    () => crossReferenceOptions[crossReferenceForm.kind],
    [crossReferenceForm.kind, crossReferenceOptions],
  )
  const currentCrossReferencePreview = useMemo(
    () => (
      crossReferenceForm.targetId
        ? crossReferencesMap.get(`${crossReferenceForm.kind}:${crossReferenceForm.targetId}`)
        : undefined
    ),
    [crossReferenceForm.kind, crossReferenceForm.targetId, crossReferencesMap],
  )
  const currentTabularValidation = useMemo(
    () => validateTabularElementForm(tabularElementForm.rows),
    [tabularElementForm.rows],
  )

  useEffect(() => {
    let cancelled = false
    const previewableFigures = projectFigures.filter((figure) => !isResolvedFigurePreviewUrl(figure.imageUrl))
    if (!previewableFigures.length) return

    previewableFigures.forEach((figure) => {
      if (Object.prototype.hasOwnProperty.call(figurePreviewUrls, figure.id)) return

      void getFigureImage(projectId, figure.id)
        .then((imageUrl) => {
          if (cancelled) return
          setFigurePreviewUrls((current) => (
            current[figure.id] === imageUrl
              ? current
              : { ...current, [figure.id]: imageUrl }
          ))
        })
        .catch(() => {
          if (cancelled) return
          setFigurePreviewUrls((current) => (
            current[figure.id] === ''
              ? current
              : { ...current, [figure.id]: '' }
          ))
        })
    })

    return () => {
      cancelled = true
    }
  }, [figurePreviewUrls, projectFigures, projectId])

  useEffect(() => {
    const activeFigureIds = new Set(projectFigures.map((figure) => figure.id))
    setFigurePreviewUrls((current) => {
      const nextEntries = Object.entries(current).filter(([figureId]) => activeFigureIds.has(figureId))
      if (nextEntries.length === Object.keys(current).length) {
        return current
      }

      return Object.fromEntries(nextEntries)
    })
  }, [projectFigures])

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

    if (projectChanged) {
      setOptimisticTabularElements({})
    }

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
      setFigureFeedback(null)
      setFigureDialogOpen(false)
      setTabularElementFeedback(null)
      setTabularElementDialogOpen(false)
      setTabularValidationState({ valid: true, invalidCells: [] })
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
  const displayContent = replaceTabularMarkers(
    replaceFigureMarkers(replaceCitationMarkers(content, citationsMap), figuresMap),
    tabularElementsMap,
  )
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
  const figuresStatus: DocumentStatus = figuresInReadingOrder.length > 0 ? 'completed' : 'pending'
  const tablesStatus: DocumentStatus = tablesInReadingOrder.length > 0 ? 'completed' : 'pending'
  const quadrosStatus: DocumentStatus = quadrosInReadingOrder.length > 0 ? 'completed' : 'pending'
  const textualStatuses = textualChapters.map((chapter) => normalizeChapterStatus(chapter))

  const groupCounters = {
    pre: [abstractPtStatus, abstractEnStatus],
    text: textualStatuses,
    post: [figuresStatus, tablesStatus, quadrosStatus, referencesStatus],
  }

  const selectedGroup = activeNodeId === 'abstractPt' || activeNodeId === 'abstractEn'
    ? 'Pré-textuais'
    : activeNodeId === 'references' || activeNodeId === 'figures' || activeNodeId === 'tables' || activeNodeId === 'quadros'
      ? 'Pós-textuais'
      : 'Textuais'
  const selectedLabel = activeNodeId === 'abstractPt'
    ? 'Resumo'
    : activeNodeId === 'abstractEn'
      ? 'Abstract'
      : activeNodeId === 'references'
        ? 'Referências'
        : activeNodeId === 'figures'
          ? 'Lista de figuras'
          : activeNodeId === 'tables'
            ? 'Lista de tabelas'
            : activeNodeId === 'quadros'
              ? 'Lista de quadros'
          : selectedChapter?.title ?? 'Capítulo'
  const selectedStatus = activeNodeId === 'abstractPt'
      ? abstractPtStatus
      : activeNodeId === 'abstractEn'
        ? abstractEnStatus
        : activeNodeId === 'references'
          ? referencesStatus
          : activeNodeId === 'figures'
            ? figuresStatus
            : activeNodeId === 'tables'
              ? tablesStatus
              : activeNodeId === 'quadros'
                ? quadrosStatus
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

  function updateFigureForm<K extends keyof FigureFormState>(field: K, value: FigureFormState[K]) {
    setFigureForm((current) => ({ ...current, [field]: value }))
  }

  function updateQuickReferenceForm<K extends keyof QuickReferenceFormState>(field: K, value: QuickReferenceFormState[K]) {
    setQuickReferenceForm((current) => ({ ...current, [field]: value }))
  }

  function updateCrossReferenceForm<K extends keyof CrossReferenceFormState>(field: K, value: CrossReferenceFormState[K]) {
    setCrossReferenceForm((current) => ({ ...current, [field]: value }))
  }

  function updateTabularElementForm<K extends keyof TabularElementFormState>(field: K, value: TabularElementFormState[K]) {
    setTabularElementForm((current) => ({ ...current, [field]: value }))
  }

  function updateTabularCell(rowIndex: number, columnIndex: number, value: string) {
    setTabularElementForm((current) => {
      const nextRows = current.rows.map((row, currentRowIndex) => (
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) => (currentColumnIndex === columnIndex ? value : cell))
          : row
      ))
      setTabularValidationState(validateTabularElementForm(nextRows))
      return {
        ...current,
        rows: nextRows,
      }
    })
  }

  function addTabularRow() {
    setTabularElementForm((current) => {
      const nextRows = [...current.rows, new Array(current.rows[0]?.length ?? 2).fill('')]
      setTabularValidationState(validateTabularElementForm(nextRows))
      return { ...current, rows: nextRows }
    })
  }

  function addTabularColumn() {
    setTabularElementForm((current) => {
      const nextRows = current.rows.map((row) => [...row, ''])
      setTabularValidationState(validateTabularElementForm(nextRows))
      return { ...current, rows: nextRows }
    })
  }

  function removeTabularRow() {
    setTabularElementForm((current) => {
      const nextRows = current.rows.length > 1 ? current.rows.slice(0, -1) : current.rows
      setTabularValidationState(validateTabularElementForm(nextRows))
      return { ...current, rows: nextRows }
    })
  }

  function removeTabularColumn() {
    setTabularElementForm((current) => {
      const nextRows = current.rows[0]?.length > 1 ? current.rows.map((row) => row.slice(0, -1)) : current.rows
      setTabularValidationState(validateTabularElementForm(nextRows))
      return { ...current, rows: nextRows }
    })
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
      chapterEditorRef.current?.focusAtOffset(_nextPosition)
    })
  }

  function handleCrossReferenceKindChange(kind: CrossReferenceKind) {
    const nextOption = crossReferenceOptions[kind][0]
    setCrossReferenceForm({
      kind,
      targetId: nextOption?.id ?? '',
    })
  }

  function handleCreateCrossReference() {
    if (!crossReferenceForm.targetId) {
      setCrossReferenceFeedback(`Selecione ${getCrossReferenceNoun(crossReferenceForm.kind).toLowerCase()} para inserir a referência cruzada.`)
      return
    }

    const marker = buildCrossReferenceMarker(crossReferenceForm.kind, crossReferenceForm.targetId)
    const nextContent = chapterEditorRef.current?.insertCrossReference(
      crossReferenceForm.kind,
      crossReferenceForm.targetId,
      crossReferencesMap.get(`${crossReferenceForm.kind}:${crossReferenceForm.targetId}`),
    ) ?? `${latestContentRef.current}${marker}`

    setContent(nextContent)
    latestContentRef.current = nextContent
    setCrossReferenceDialogOpen(false)
    setCrossReferenceFeedback(null)
    focusEditorAtPosition(nextContent.length)
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

  async function handleCreateFigure() {
    if (!selectedChapter) return

    if (!figureForm.file) {
      setFigureFeedback({ tone: 'error', message: 'Selecione uma imagem para inserir a figura.' })
      return
    }

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(figureForm.file.type)) {
      setFigureFeedback({ tone: 'error', message: 'Envie uma imagem PNG ou JPG/JPEG.' })
      return
    }

    if (figureForm.file.size > 10 * 1024 * 1024) {
      setFigureFeedback({ tone: 'error', message: 'A imagem deve ter no máximo 10 MB.' })
      return
    }

    if (!figureForm.caption.trim()) {
      setFigureFeedback({ tone: 'error', message: 'Informe a legenda da figura para continuar.' })
      return
    }

    setFigureSaving(true)
    setFigureFeedback(null)

    try {
      const createdFigure = await createFigure(projectId, {
        chapterId: selectedChapter.id,
        caption: figureForm.caption,
        sourceText: figureForm.sourceText,
        widthPercent: figureForm.widthPercent,
        file: figureForm.file,
      })
      const resolvedImageUrl = isResolvedFigurePreviewUrl(createdFigure.imageUrl)
        ? createdFigure.imageUrl
        : await getFigureImage(projectId, createdFigure.id).catch(() => undefined)
      const createdFigureWithPreview = resolvedImageUrl
        ? { ...createdFigure, imageUrl: resolvedImageUrl }
        : createdFigure

      const marker = buildFigureMarker(createdFigure.id)
      if (resolvedImageUrl) {
        setFigurePreviewUrls((current) => ({ ...current, [createdFigure.id]: resolvedImageUrl }))
      }

      const insertionResult = chapterEditorRef.current?.insertFigure(createdFigure.id, createdFigureWithPreview)
      const nextContent = insertionResult?.value ?? `${latestContentRef.current}${marker}`
      const nextCaretOffset = insertionResult?.caretOffset ?? nextContent.length

      setContent(nextContent)
      latestContentRef.current = nextContent
      setFigureDialogOpen(false)
      setFigureForm(defaultFigureFormState)
      setFigureFeedback(null)
      await invalidateEditorQueries(queryClient, projectId, selectedChapter.id)
      focusEditorAtPosition(nextCaretOffset)
    } catch (error) {
      setFigureFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível inserir a figura agora.',
      })
    } finally {
      setFigureSaving(false)
    }
  }

  async function handleCreateTabularElement() {
    if (!selectedChapter) return

    if (!tabularElementForm.title.trim()) {
      setTabularElementFeedback({
        tone: 'error',
        message: `Informe o título ${tabularElementForm.kind === 'table' ? 'da tabela' : 'do quadro'} para continuar.`,
      })
      return
    }

    const validation = validateTabularElementForm(tabularElementForm.rows)
    setTabularValidationState(validation)
    if (!validation.valid) {
      setTabularElementFeedback({
        tone: 'error',
        message: validation.message ?? 'Preencha os cabeçalhos e pelo menos uma linha com conteúdo.',
      })
      return
    }

    setTabularElementSaving(true)
    setTabularElementFeedback(null)

    try {
      const createdItem = await createTabularElement(projectId, {
        chapterId: selectedChapter.id,
        kind: tabularElementForm.kind,
        title: tabularElementForm.title,
        sourceText: tabularElementForm.sourceText,
        rows: tabularElementForm.rows,
      })

      setOptimisticTabularElements((current) => ({ ...current, [createdItem.id]: createdItem }))
      queryClient.setQueryData<TabularElement[]>(
        ['tabular-elements', 'project', projectId],
        (current) => upsertTabularElementInCache(current, createdItem, 'project', selectedChapter.id),
      )
      queryClient.setQueryData<TabularElement[]>(
        ['tabular-elements', 'chapter', selectedChapter.id],
        (current) => upsertTabularElementInCache(current, createdItem, 'chapter', selectedChapter.id),
      )

      const marker = buildTabularMarker(createdItem.kind, createdItem.id)
      const insertionResult = chapterEditorRef.current?.insertTabularElement(createdItem.id, createdItem.kind, createdItem)
      const nextContent = insertionResult?.value ?? `${latestContentRef.current}${marker}`
      const nextCaretOffset = insertionResult?.caretOffset ?? nextContent.length

      setContent(nextContent)
      latestContentRef.current = nextContent
      setTabularElementDialogOpen(false)
      setTabularElementForm(defaultTabularElementFormState(tabularElementForm.kind))
      setTabularValidationState({ valid: true, invalidCells: [] })
      setTabularElementFeedback(null)
      await invalidateEditorQueries(queryClient, projectId, selectedChapter.id)
      focusEditorAtPosition(nextCaretOffset)
    } catch (error) {
      setTabularElementFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível inserir este elemento agora.',
      })
    } finally {
      setTabularElementSaving(false)
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

  async function handleRemoveFigure(figure: Figure) {
    if (!selectedChapter) return

    setDeletingFigureId(figure.id)
    setFigureFeedback(null)

    try {
      await deleteFigure(figure.id)
      setFigurePreviewUrls((current) => {
        if (!(figure.id in current)) return current
        const next = { ...current }
        delete next[figure.id]
        return next
      })

      const nextContent = removeFigureMarker(latestContentRef.current, figure.id)
      if (nextContent !== latestContentRef.current) {
        setContent(nextContent)
        latestContentRef.current = nextContent
        lastSavedContentRef.current = nextContent
        await updateChapterContent(selectedChapter.id, nextContent)
      }

      await invalidateEditorQueries(queryClient, projectId, selectedChapter.id)
      setFigureFeedback({ tone: 'success', message: 'Figura removida do capítulo e da lista.' })
    } catch (error) {
      setFigureFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível remover a figura selecionada.',
      })
    } finally {
      setDeletingFigureId(null)
    }
  }

  async function handleRemoveTabularElement(item: TabularElement) {
    if (!selectedChapter) return

    setDeletingTabularElementId(item.id)
    setTabularElementFeedback(null)

    try {
      await deleteTabularElement(item)

      const nextContent = removeTabularMarker(latestContentRef.current, item)
      if (nextContent !== latestContentRef.current) {
        setContent(nextContent)
        latestContentRef.current = nextContent
        lastSavedContentRef.current = nextContent
        await updateChapterContent(selectedChapter.id, nextContent)
      }

      await invalidateEditorQueries(queryClient, projectId, selectedChapter.id)
      setTabularElementFeedback({
        tone: 'success',
        message: `${item.kind === 'table' ? 'Tabela' : 'Quadro'} removid${item.kind === 'table' ? 'a' : 'o'} do capítulo e da lista.`,
      })
    } catch (error) {
      setTabularElementFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível remover o elemento selecionado.',
      })
    } finally {
      setDeletingTabularElementId(null)
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
                title="Lista de figuras"
                helper={figuresInReadingOrder.length > 0 ? `${figuresInReadingOrder.length} figura(s) usada(s)` : 'Nenhuma figura usada ainda'}
                active={activeNodeId === 'figures'}
                status={figuresStatus}
                onClick={() => void handleSelectNode('figures')}
              />
              <DocumentNavItem
                title="Lista de tabelas"
                helper={tablesInReadingOrder.length > 0 ? `${tablesInReadingOrder.length} tabela(s) usada(s)` : 'Nenhuma tabela usada ainda'}
                active={activeNodeId === 'tables'}
                status={tablesStatus}
                onClick={() => void handleSelectNode('tables')}
              />
              <DocumentNavItem
                title="Lista de quadros"
                helper={quadrosInReadingOrder.length > 0 ? `${quadrosInReadingOrder.length} quadro(s) usado(s)` : 'Nenhum quadro usado ainda'}
                active={activeNodeId === 'quadros'}
                status={quadrosStatus}
                onClick={() => void handleSelectNode('quadros')}
              />
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

              {activeNodeId === 'figures' ? (
                <SectionCard
                  title="Lista de figuras"
                  description="Mostra somente figuras efetivamente usadas nos capítulos, na ordem em que aparecem no texto."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <ReferenceSummaryCard
                      title="Figuras usadas"
                      value={`${figuresInReadingOrder.length} figura(s)`}
                      helper={figuresInReadingOrder.length > 0 ? 'A lista acompanha os marcadores inseridos nos capítulos.' : 'As figuras aparecem aqui automaticamente quando você insere marcadores nos capítulos.'}
                    />
                    <ReferenceSummaryCard
                      title="Status do pós-textual"
                      value={getStatusLabel(figuresStatus)}
                      helper="A lista fica concluída quando existe ao menos uma figura efetivamente usada no texto."
                    />
                  </div>
                  {figuresInReadingOrder.length === 0 ? (
                    <div className="mt-5 rounded-[24px] border border-dashed border-border/80 bg-muted/25 px-5 py-5">
                      <p className="text-sm font-medium text-foreground">Nenhuma figura usada no texto ainda.</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        As figuras aparecem aqui automaticamente quando você insere marcadores nos capítulos.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {figuresInReadingOrder.map((figure, index) => (
                        <div key={figure.id} className="rounded-[24px] border border-border/70 bg-white/84 px-4 py-4">
                          <p className="text-sm font-medium text-foreground">{`Figura ${index + 1} – ${figure.caption}`}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {figure.sourceText?.trim() ? figure.sourceText : 'Fonte não informada.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              ) : null}

              {activeNodeId === 'tables' ? (
                <SectionCard
                  title="Lista de tabelas"
                  description="Mostra somente tabelas efetivamente usadas nos capítulos, na ordem em que aparecem no texto."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <ReferenceSummaryCard
                      title="Tabelas usadas"
                      value={`${tablesInReadingOrder.length} tabela(s)`}
                      helper={tablesInReadingOrder.length > 0 ? 'A lista acompanha os marcadores [[@TABLE:id]] inseridos nos capítulos.' : 'As tabelas aparecem aqui automaticamente quando você insere marcadores nos capítulos.'}
                    />
                    <ReferenceSummaryCard
                      title="Status do pós-textual"
                      value={getStatusLabel(tablesStatus)}
                      helper="A lista fica concluída quando existe ao menos uma tabela efetivamente usada no texto."
                    />
                  </div>
                  {tablesInReadingOrder.length === 0 ? (
                    <div className="mt-5 rounded-[24px] border border-dashed border-border/80 bg-muted/25 px-5 py-5">
                      <p className="text-sm font-medium text-foreground">Nenhuma tabela utilizada no texto.</p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {tablesInReadingOrder.map((item, index) => (
                        <div key={item.id} className="rounded-[24px] border border-border/70 bg-white/84 px-4 py-4">
                          <p className="text-sm font-medium text-foreground">{`Tabela ${index + 1} – ${item.title}`}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {item.sourceText?.trim() ? item.sourceText : 'Fonte não informada.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              ) : null}

              {activeNodeId === 'quadros' ? (
                <SectionCard
                  title="Lista de quadros"
                  description="Mostra somente quadros efetivamente usados nos capítulos, na ordem em que aparecem no texto."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <ReferenceSummaryCard
                      title="Quadros usados"
                      value={`${quadrosInReadingOrder.length} quadro(s)`}
                      helper={quadrosInReadingOrder.length > 0 ? 'A lista acompanha os marcadores [[@QUADRO:id]] inseridos nos capítulos.' : 'Os quadros aparecem aqui automaticamente quando você insere marcadores nos capítulos.'}
                    />
                    <ReferenceSummaryCard
                      title="Status do pós-textual"
                      value={getStatusLabel(quadrosStatus)}
                      helper="A lista fica concluída quando existe ao menos um quadro efetivamente usado no texto."
                    />
                  </div>
                  {quadrosInReadingOrder.length === 0 ? (
                    <div className="mt-5 rounded-[24px] border border-dashed border-border/80 bg-muted/25 px-5 py-5">
                      <p className="text-sm font-medium text-foreground">Nenhum quadro utilizado no texto.</p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {quadrosInReadingOrder.map((item, index) => (
                        <div key={item.id} className="rounded-[24px] border border-border/70 bg-white/84 px-4 py-4">
                          <p className="text-sm font-medium text-foreground">{`Quadro ${index + 1} – ${item.title}`}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {item.sourceText?.trim() ? item.sourceText : 'Fonte não informada.'}
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
                                tooltip="Faz upload da figura e insere o marcador no ponto atual do cursor."
                                onClick={() => {
                                  setFigureFeedback(null)
                                  setFigureDialogOpen(true)
                                }}
                                disabled={figureSaving}
                              />
                              <AcademicToolbarButton
                                icon={FileSpreadsheet}
                                label="Inserir tabela/quadro"
                                tooltip="Cria uma tabela ou quadro acadêmico visual e insere no ponto atual do cursor."
                                onClick={() => {
                                  setTabularElementFeedback(null)
                                  setTabularElementForm(defaultTabularElementFormState('table'))
                                  setTabularValidationState({ valid: true, invalidCells: [] })
                                  setTabularElementDialogOpen(true)
                                }}
                                disabled={tabularElementSaving}
                              />
                              <AcademicToolbarButton
                                icon={Link2}
                                label="Inserir referência cruzada"
                                tooltip="Insere uma referência para figura, tabela ou quadro no ponto atual do cursor."
                                onClick={() => {
                                  const defaultKind: CrossReferenceKind =
                                    crossReferenceOptions.FIG.length > 0
                                      ? 'FIG'
                                      : crossReferenceOptions.TABLE.length > 0
                                        ? 'TABLE'
                                        : 'QUADRO'
                                  const nextOption = crossReferenceOptions[defaultKind][0]
                                  setCrossReferenceFeedback(null)
                                  setCrossReferenceForm({
                                    kind: defaultKind,
                                    targetId: nextOption?.id ?? '',
                                  })
                                  setCrossReferenceDialogOpen(true)
                                }}
                                disabled={!crossReferenceOptions.FIG.length && !crossReferenceOptions.TABLE.length && !crossReferenceOptions.QUADRO.length}
                              />
                              </div>
                              <div className="flex min-w-max items-center gap-2 pl-3">
                                <span className="h-4 w-px bg-border/70" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  {chapterCitationsListQuery.isLoading ? '...' : `${contentCitationIds.length} citações`}
                                </span>
                                <span className="h-4 w-px bg-border/70" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  {chapterFiguresListQuery.isLoading ? '...' : `${contentFigureIds.length} figuras`}
                                </span>
                                <span className="h-4 w-px bg-border/70" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  {chapterTabularElementsListQuery.isLoading ? '...' : `${contentTableIds.length} tabelas`}
                                </span>
                                <span className="h-4 w-px bg-border/70" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  {chapterTabularElementsListQuery.isLoading ? '...' : `${contentQuadroIds.length} quadros`}
                                </span>
                                {invalidCitationCount > 0 ? (
                                  <>
                                    <span className="h-4 w-px bg-border/70" />
                                    <span className="text-xs font-medium text-amber-700">
                                      {invalidCitationCount} inválida(s)
                                    </span>
                                  </>
                                ) : null}
                                {invalidFigureCount > 0 ? (
                                  <>
                                    <span className="h-4 w-px bg-border/70" />
                                    <span className="text-xs font-medium text-amber-700">
                                      {invalidFigureCount} figura(s) inválida(s)
                                    </span>
                                  </>
                                ) : null}
                                {invalidTabularElementCount > 0 ? (
                                  <>
                                    <span className="h-4 w-px bg-border/70" />
                                    <span className="text-xs font-medium text-amber-700">
                                      {invalidTabularElementCount} elemento(s) inválido(s)
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
                              figuresMap={figuresMap}
                              tabularElementsMap={tabularElementsMap}
                              crossReferencesMap={crossReferencesMap}
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
                          {figureFeedback ? (
                            <p className={figureFeedback.tone === 'success' ? 'mt-4 text-sm text-primary' : 'mt-4 text-sm text-destructive'}>
                              {figureFeedback.message}
                            </p>
                          ) : null}
                          {tabularElementFeedback ? (
                            <p className={tabularElementFeedback.tone === 'success' ? 'mt-4 text-sm text-primary' : 'mt-4 text-sm text-destructive'}>
                              {tabularElementFeedback.message}
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

                      <SectionCard
                        title="Figuras do capítulo"
                        description="A contagem considera apenas marcadores [[@FIG:id]] presentes no texto, sem apagar figuras cadastradas para reutilização futura."
                        className="rounded-[30px] border-border/55 bg-white/82 shadow-sm"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <ReferenceSummaryCard
                            title="Figuras no capítulo"
                            value={chapterFiguresListQuery.isLoading ? '...' : `${chapterFiguresInText.length}`}
                            helper="Total de figuras usadas no texto atual deste capítulo."
                          />
                          <ReferenceSummaryCard
                            title="Figuras no projeto"
                            value={projectFiguresListQuery.isLoading ? '...' : `${projectFiguresInText.length}`}
                            helper="Total de figuras com marcador presente nos capítulos do projeto."
                          />
                        </div>

                        {chapterFiguresListQuery.isError ? (
                          <p className="mt-5 rounded-[20px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            Não foi possível carregar as figuras deste capítulo.
                          </p>
                        ) : null}

                        {!chapterFiguresListQuery.isLoading && chapterFiguresInText.length === 0 ? (
                          <div className="mt-5 rounded-[24px] border border-dashed border-border/80 bg-muted/25 px-5 py-5">
                            <p className="text-sm font-medium text-foreground">Nenhuma figura usada no texto ainda</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              Use a toolbar acadêmica para fazer upload e inserir a primeira figura deste capítulo.
                            </p>
                          </div>
                        ) : null}

                        {chapterFiguresInText.length > 0 ? (
                          <div className="mt-5 space-y-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Figuras usadas no texto</p>
                            {chapterFiguresInText.map((figure) => (
                              <div key={figure.id} className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-border/70 bg-white/84 px-4 py-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge label="Figura" tone="info" />
                                    <StatusBadge label={`${figure.widthPercent}%`} tone="neutral" />
                                    <StatusBadge label="No texto" tone="success" />
                                  </div>
                                  <p className="mt-3 text-sm font-medium text-foreground">{buildFigurePreviewLabel(figure)}</p>
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {figure.sourceText?.trim() ? figure.sourceText : 'Fonte não informada.'}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleRemoveFigure(figure)}
                                  disabled={deletingFigureId === figure.id}
                                >
                                  {deletingFigureId === figure.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  Remover
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {chapterUnusedFigures.length > 0 ? (
                          <div className="mt-5 space-y-3">
                            <div className="rounded-[20px] border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
                              {chapterUnusedFigures.length} figura(s) cadastrada(s) continuam no sistema, mas não aparecem no texto atual.
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Figuras cadastradas, mas não usadas</p>
                            {chapterUnusedFigures.map((figure) => (
                              <div key={figure.id} className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-border/70 bg-muted/20 px-4 py-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge label="Figura" tone="info" />
                                    <StatusBadge label="Sem marcador" tone="warning" />
                                  </div>
                                  <p className="mt-3 text-sm font-medium text-foreground">{buildFigurePreviewLabel(figure)}</p>
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {figure.sourceText?.trim() ? figure.sourceText : 'Fonte não informada.'}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleRemoveFigure(figure)}
                                  disabled={deletingFigureId === figure.id}
                                >
                                  {deletingFigureId === figure.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  Remover
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </SectionCard>

                      <SectionCard
                        title="Tabelas e quadros do capítulo"
                        description="A contagem considera apenas marcadores [[@TABLE:id]] e [[@QUADRO:id]] presentes no texto, sem apagar elementos cadastrados para reutilização futura."
                        className="rounded-[30px] border-border/55 bg-white/82 shadow-sm"
                      >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <ReferenceSummaryCard
                            title="Tabelas no capítulo"
                            value={chapterTabularElementsListQuery.isLoading ? '...' : `${chapterTabularElementsInText.filter((item) => item.kind === 'table').length}`}
                            helper="Total de tabelas usadas no texto atual deste capítulo."
                          />
                          <ReferenceSummaryCard
                            title="Quadros no capítulo"
                            value={chapterTabularElementsListQuery.isLoading ? '...' : `${chapterTabularElementsInText.filter((item) => item.kind === 'quadro').length}`}
                            helper="Total de quadros usados no texto atual deste capítulo."
                          />
                          <ReferenceSummaryCard
                            title="Tabelas no projeto"
                            value={projectTabularElementsListQuery.isLoading ? '...' : `${projectTabularElementsInText.filter((item) => item.kind === 'table').length}`}
                            helper="Total de tabelas com marcador presente nos capítulos do projeto."
                          />
                          <ReferenceSummaryCard
                            title="Quadros no projeto"
                            value={projectTabularElementsListQuery.isLoading ? '...' : `${projectTabularElementsInText.filter((item) => item.kind === 'quadro').length}`}
                            helper="Total de quadros com marcador presente nos capítulos do projeto."
                          />
                        </div>

                        {chapterTabularElementsListQuery.isError ? (
                          <p className="mt-5 rounded-[20px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            Não foi possível carregar as tabelas e quadros deste capítulo.
                          </p>
                        ) : null}

                        {!chapterTabularElementsListQuery.isLoading && chapterTabularElementsInText.length === 0 ? (
                          <div className="mt-5 rounded-[24px] border border-dashed border-border/80 bg-muted/25 px-5 py-5">
                            <p className="text-sm font-medium text-foreground">Nenhuma tabela ou quadro usado no texto ainda</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              Use a toolbar acadêmica para inserir a primeira tabela ou quadro deste capítulo.
                            </p>
                          </div>
                        ) : null}

                        {chapterTabularElementsInText.length > 0 ? (
                          <div className="mt-5 space-y-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Elementos usados no texto</p>
                            {chapterTabularElementsInText.map((item) => (
                              <div key={item.id} className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-border/70 bg-white/84 px-4 py-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge label={item.kind === 'table' ? 'Tabela' : 'Quadro'} tone="info" />
                                    <StatusBadge label="No texto" tone="success" />
                                  </div>
                                  <p className="mt-3 text-sm font-medium text-foreground">{buildTabularElementPreviewLabel(item)}</p>
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {item.sourceText?.trim() ? item.sourceText : 'Fonte não informada.'}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleRemoveTabularElement(item)}
                                  disabled={deletingTabularElementId === item.id}
                                >
                                  {deletingTabularElementId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  Remover
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {chapterUnusedTabularElements.length > 0 ? (
                          <div className="mt-5 space-y-3">
                            <div className="rounded-[20px] border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
                              {chapterUnusedTabularElements.length} elemento(s) cadastrado(s) continuam no sistema, mas não aparecem no texto atual.
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Elementos cadastrados, mas não usados</p>
                            {chapterUnusedTabularElements.map((item) => (
                              <div key={item.id} className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-border/70 bg-muted/20 px-4 py-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge label={item.kind === 'table' ? 'Tabela' : 'Quadro'} tone="info" />
                                    <StatusBadge label="Sem marcador" tone="warning" />
                                  </div>
                                  <p className="mt-3 text-sm font-medium text-foreground">{buildTabularElementPreviewLabel(item)}</p>
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {item.sourceText?.trim() ? item.sourceText : 'Fonte não informada.'}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleRemoveTabularElement(item)}
                                  disabled={deletingTabularElementId === item.id}
                                >
                                  {deletingTabularElementId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

        <Dialog open={figureDialogOpen} onOpenChange={setFigureDialogOpen}>
          <DialogContent className="max-w-xl rounded-[28px] border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(249,250,252,0.98))] p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="border-b border-border/60 px-6 py-5 md:px-7">
              <DialogHeader className="text-left">
                <DialogTitle className="text-[1.45rem] tracking-[-0.02em] text-foreground">Inserir figura</DialogTitle>
                <DialogDescription className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Envie a imagem, defina a legenda e insira a figura acadêmica no ponto atual do capítulo.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-5 px-6 py-6 md:px-7">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Imagem</p>
                  <Input
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    onChange={(event) => updateFigureForm('file', event.target.files?.[0] ?? null)}
                    className="rounded-2xl bg-white/84"
                    aria-label="Upload da imagem da figura"
                  />
                  <p className="text-sm text-muted-foreground">Aceita PNG e JPG/JPEG com até 10 MB.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Legenda <span className="text-destructive">*</span></p>
                  <Input
                    value={figureForm.caption}
                    onChange={(event) => updateFigureForm('caption', event.target.value)}
                    placeholder="Ex.: Arquitetura geral do sistema"
                    className="h-11 rounded-2xl bg-white/84"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Fonte <span className="text-muted-foreground">(opcional)</span></p>
                  <Input
                    value={figureForm.sourceText}
                    onChange={(event) => updateFigureForm('sourceText', event.target.value)}
                    placeholder="Ex.: Elaboração própria."
                    className="h-11 rounded-2xl bg-white/84"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Largura</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[50, 75, 100].map((width) => (
                      <button
                        key={width}
                        type="button"
                        onClick={() => updateFigureForm('widthPercent', width as Figure['widthPercent'])}
                        className={`rounded-[22px] border px-4 py-3 text-left transition-colors ${
                          figureForm.widthPercent === width
                            ? 'border-primary/50 bg-primary/6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                            : 'border-border/70 bg-white/84 hover:border-border'
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">{width}%</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(250,251,252,0.95),rgba(255,255,255,0.98))] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Prévia do marcador</p>
                  <p className="mt-2 text-base font-medium tracking-[-0.01em] text-foreground">
                    {getFigureChipLabel(figureForm.caption.trim() ? {
                      id: 'preview-figure',
                      projectId,
                      chapterId: selectedChapterId ?? '',
                      caption: figureForm.caption.trim(),
                      sourceText: figureForm.sourceText.trim() || undefined,
                      originalFilename: figureForm.file?.name ?? 'imagem.png',
                      mimeType: figureForm.file?.type ?? 'image/png',
                      fileSizeBytes: figureForm.file?.size ?? 0,
                      widthPercent: figureForm.widthPercent,
                    } : undefined)}
                  </p>
                </div>

                {figureFeedback?.tone === 'error' ? (
                  <p className="rounded-[18px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {figureFeedback.message}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="border-t border-border/60 px-6 py-5 md:px-7">
              <Button variant="outline" onClick={() => setFigureDialogOpen(false)} disabled={figureSaving}>
                Cancelar
              </Button>
              <Button onClick={() => void handleCreateFigure()} disabled={figureSaving}>
                {figureSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
                {figureSaving ? 'Inserindo...' : 'Inserir figura'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={tabularElementDialogOpen}
          onOpenChange={(open) => {
            setTabularElementDialogOpen(open)
            if (!open) {
              setTabularValidationState({ valid: true, invalidCells: [] })
            }
          }}
        >
          <DialogContent
            className="flex h-[90vh] max-h-[90vh] w-[min(90vw,860px)] max-w-[860px] flex-col overflow-hidden rounded-[28px] border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(249,250,252,0.98))] p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            data-testid="tabular-modal"
          >
            <div className="shrink-0 border-b border-border/60 px-6 py-5 md:px-7">
              <DialogHeader className="text-left">
                <DialogTitle className="text-[1.45rem] tracking-[-0.02em] text-foreground">
                  Inserir tabela/quadro
                </DialogTitle>
                <DialogDescription className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Monte o elemento visualmente e insira o marcador no ponto atual do capítulo, sem expor markdown ao usuário.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-7"
              data-testid="tabular-modal-body"
            >
              <div className="flex min-w-0 flex-col gap-5" data-testid="tabular-modal-stack">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Tipo</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(['table', 'quadro'] as TabularElementKind[]).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => updateTabularElementForm('kind', kind)}
                          className={`rounded-[22px] border px-4 py-3 text-left transition-colors ${
                            tabularElementForm.kind === kind
                              ? 'border-primary/50 bg-primary/6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                              : 'border-border/70 bg-white/84 hover:border-border'
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground">{kind === 'table' ? 'Tabela' : 'Quadro'}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {kind === 'table' ? 'Visual mais aberto, próximo de tabela acadêmica.' : 'Visual com bordas fechadas, ideal para sínteses.'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Título</p>
                    <Input
                      value={tabularElementForm.title}
                      onChange={(event) => updateTabularElementForm('title', event.target.value)}
                      placeholder={tabularElementForm.kind === 'table' ? 'Ex.: Distribuição dos resultados por turma' : 'Ex.: Síntese dos critérios analisados'}
                      className="h-11 rounded-2xl bg-white/84"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Fonte <span className="text-muted-foreground">(opcional)</span></p>
                    <Input
                      value={tabularElementForm.sourceText}
                      onChange={(event) => updateTabularElementForm('sourceText', event.target.value)}
                      placeholder="Ex.: Elaboração própria."
                      className="h-11 rounded-2xl bg-white/84"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2" data-testid="tabular-grid-toolbar">
                    <Button type="button" variant="outline" size="sm" onClick={addTabularRow}>
                      + Linha
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={addTabularColumn}>
                      + Coluna
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={removeTabularRow} disabled={tabularElementForm.rows.length <= 1}>
                      - Linha
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeTabularColumn}
                      disabled={(tabularElementForm.rows[0]?.length ?? 0) <= 1}
                    >
                      - Coluna
                    </Button>
                  </div>

                  <div
                    className="min-w-0 overflow-x-auto rounded-[24px] border border-border/70 bg-white/88 p-4"
                    data-testid="tabular-grid-scroller"
                  >
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${tabularElementForm.rows[0]?.length ?? 1}, minmax(160px, 1fr))` }}
                    >
                      {tabularElementForm.rows.map((row, rowIndex) => row.map((cell, columnIndex) => (
                        <Input
                          key={`${rowIndex}-${columnIndex}`}
                          value={cell}
                          onChange={(event) => updateTabularCell(rowIndex, columnIndex, event.target.value)}
                          placeholder={rowIndex === 0 ? `Cabeçalho ${columnIndex + 1}` : `Célula ${rowIndex + 1}.${columnIndex + 1}`}
                          className={`min-h-[44px] rounded-2xl bg-white/84 px-3 py-2 ${
                            rowIndex === 0 ? 'font-medium' : ''
                          } ${
                            tabularValidationState.invalidCells.some((cellPosition) => (
                              cellPosition.rowIndex === rowIndex && cellPosition.columnIndex === columnIndex
                            ))
                              ? 'border-destructive/60 ring-1 ring-destructive/20'
                              : ''
                          }`}
                        />
                      )))}
                    </div>
                  </div>

                <div
                  className="rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(250,251,252,0.95),rgba(255,255,255,0.98))] px-4 py-4"
                  data-testid="tabular-preview-card"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Preview acadêmico</p>
                  <div className="mt-3 space-y-3 text-center">
                    <p className="text-[15px] font-medium leading-7 text-foreground">
                      {getTabularElementLabel(
                        {
                          id: 'preview',
                          projectId,
                          chapterId: selectedChapterId ?? '',
                          kind: tabularElementForm.kind,
                          title: tabularElementForm.title.trim() || (tabularElementForm.kind === 'table' ? 'Tabela sem título' : 'Quadro sem título'),
                          sourceText: tabularElementForm.sourceText.trim() || undefined,
                          rows: tabularElementForm.rows,
                        },
                        1,
                      )}
                    </p>
                    <div className="overflow-x-auto">
                      <table className={tabularElementForm.kind === 'quadro' ? 'mx-auto w-full border-collapse text-left text-sm' : 'mx-auto w-full border-separate border-spacing-0 text-left text-sm'}>
                        <tbody>
                          {tabularElementForm.rows.map((row, rowIndex) => (
                            <tr key={`preview-${rowIndex}`}>
                              {row.map((cell, columnIndex) => (
                                <td
                                  key={`preview-${rowIndex}-${columnIndex}`}
                                  className={tabularElementForm.kind === 'quadro'
                                    ? 'border border-slate-300 px-3 py-2 align-top'
                                    : rowIndex === 0
                                      ? 'border-b border-slate-300 px-3 py-2 align-top font-semibold'
                                      : 'border-b border-slate-200 px-3 py-2 align-top'}
                                >
                                  {cell || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[13px] leading-6 text-muted-foreground">
                      {tabularElementForm.sourceText.trim() ? `Fonte: ${tabularElementForm.sourceText.trim()}` : 'Fonte: não informada.'}
                    </p>
                  </div>
                </div>
              </div>

              {tabularElementFeedback?.tone === 'error' ? (
                <p className="rounded-[18px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {tabularElementFeedback.message}
                </p>
              ) : null}
              {!tabularValidationState.valid ? (
                <p className="rounded-[18px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {tabularValidationState.message}
                </p>
              ) : null}
            </div>

            <DialogFooter
              className="shrink-0 border-t border-border/60 bg-white/96 px-6 py-5 md:px-7"
              data-testid="tabular-modal-footer"
            >
              <Button variant="outline" onClick={() => setTabularElementDialogOpen(false)} disabled={tabularElementSaving}>
                Cancelar
              </Button>
              <Button onClick={() => void handleCreateTabularElement()} disabled={tabularElementSaving || !tabularElementForm.title.trim() || !currentTabularValidation.valid}>
                {tabularElementSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                {tabularElementSaving ? 'Inserindo...' : `Inserir ${tabularElementForm.kind === 'table' ? 'tabela' : 'quadro'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={crossReferenceDialogOpen} onOpenChange={setCrossReferenceDialogOpen}>
          <DialogContent className="max-w-2xl rounded-[28px] border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(249,250,252,0.98))] p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="border-b border-border/60 px-6 py-5 md:px-7">
              <DialogHeader className="text-left">
                <DialogTitle className="text-[1.45rem] tracking-[-0.02em] text-foreground">Inserir referência cruzada</DialogTitle>
                <DialogDescription className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Vincule o texto a uma figura, tabela ou quadro já existente no projeto.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-5 px-6 py-6 md:px-7">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Tipo</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(['FIG', 'TABLE', 'QUADRO'] as CrossReferenceKind[]).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => handleCrossReferenceKindChange(kind)}
                      className={`rounded-[22px] border px-4 py-3 text-left transition-colors ${
                        crossReferenceForm.kind === kind
                          ? 'border-primary/50 bg-primary/6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                          : 'border-border/70 bg-white/84 hover:border-border'
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">{getCrossReferenceNoun(kind)}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Elemento</p>
                <Select
                  value={crossReferenceForm.targetId}
                  onValueChange={(value) => {
                    updateCrossReferenceForm('targetId', value)
                    setCrossReferenceFeedback(null)
                  }}
                >
                  <SelectTrigger className="h-11 rounded-2xl bg-white/84">
                    <SelectValue placeholder={`Selecione ${getCrossReferenceNoun(crossReferenceForm.kind).toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCrossReferenceOptions.map((option) => (
                      <SelectItem key={`${option.kind}:${option.id}`} value={option.id}>
                        {option.label} — {option.description}{option.used ? '' : ' • não usado no texto'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(250,251,252,0.95),rgba(255,255,255,0.98))] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Preview</p>
                <p className="mt-3 text-[15px] leading-7 text-foreground">
                  {currentCrossReferencePreview?.label ?? getCrossReferenceInvalidLabel()}
                </p>
              </div>

              {crossReferenceFeedback ? (
                <p className="rounded-[18px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {crossReferenceFeedback}
                </p>
              ) : null}
            </div>

            <DialogFooter className="border-t border-border/60 px-6 py-5 md:px-7">
              <Button variant="outline" onClick={() => setCrossReferenceDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCrossReference} disabled={!crossReferenceForm.targetId}>
                <Link2 className="h-4 w-4" />
                Inserir referência cruzada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
  figuresMap: Map<string, Figure>
  tabularElementsMap: Map<string, TabularElement>
  crossReferencesMap: Map<string, CrossReferenceRenderItem>
  onChange: (value: string) => void
  placeholder: string
}>(({ value, citationsMap, figuresMap, tabularElementsMap, crossReferencesMap, onChange, placeholder }, ref) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const rawValueRef = useRef(value)
  const lastSelectionRef = useRef<{ start: number; end: number } | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const needsRerender = rawValueRef.current !== value || root.textContent === ''
    rawValueRef.current = value

    if (needsRerender) {
      renderContentEditableValue(root, value, citationsMap, figuresMap, tabularElementsMap, crossReferencesMap)
    } else {
      Array.from(root.querySelectorAll<HTMLElement>('[data-citation-id]')).forEach((chip) => {
        const citationId = chip.dataset.citationId ?? ''
        const citation = citationsMap.get(citationId)
        chip.className = createCitationChipNode(document, citationId, citation).className
        chip.textContent = getCitationChipLabel(citation)
        chip.title = getCitationChipTooltip(citationId, citation)
        chip.setAttribute('aria-label', getCitationChipTooltip(citationId, citation))
      })
      Array.from(root.querySelectorAll<HTMLElement>('[data-figure-id]')).forEach((chip) => {
        const figureId = chip.dataset.figureId ?? ''
        const figure = figuresMap.get(figureId)
        const figureNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-figure-id]'))
        const figureNumber = figureNodes.findIndex((node) => node.dataset.figureId === figureId) + 1
        const nextNode = createFigureChipNode(document, figureId, figure, figureNumber)
        chip.replaceWith(nextNode)
      })
      const tableNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-table-id]'))
      tableNodes.forEach((node, index) => {
        const itemId = node.dataset.tableId ?? ''
        const nextNode = createTabularElementNode(document, itemId, tabularElementsMap.get(itemId), index + 1, 'table')
        node.replaceWith(nextNode)
      })
      const quadroNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-quadro-id]'))
      quadroNodes.forEach((node, index) => {
        const itemId = node.dataset.quadroId ?? ''
        const nextNode = createTabularElementNode(document, itemId, tabularElementsMap.get(itemId), index + 1, 'quadro')
        node.replaceWith(nextNode)
      })
      Array.from(root.querySelectorAll<HTMLElement>('[data-xref-kind][data-xref-target-id]')).forEach((chip) => {
        const kind = chip.dataset.xrefKind as CrossReferenceKind | undefined
        const targetId = chip.dataset.xrefTargetId ?? ''
        if (!kind) return
        const nextNode = createCrossReferenceNode(document, kind, targetId, crossReferencesMap.get(`${kind}:${targetId}`))
        chip.replaceWith(nextNode)
      })
    }
  }, [citationsMap, crossReferencesMap, figuresMap, tabularElementsMap, value])

  useEffect(() => {
    const updateSelectionSnapshot = () => {
      const root = rootRef.current
      const selection = window.getSelection()
      if (!root || !selection || selection.rangeCount === 0) return
      if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return

      const range = selection.getRangeAt(0)
      lastSelectionRef.current = {
        start: getSerializedOffset(root, range.startContainer, range.startOffset),
        end: getSerializedOffset(root, range.endContainer, range.endOffset),
      }
    }

    document.addEventListener('selectionchange', updateSelectionSnapshot)
    return () => {
      document.removeEventListener('selectionchange', updateSelectionSnapshot)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    focusAtEnd() {
      const root = rootRef.current
      if (!root) return
      placeCaretAtEnd(root)
    },
    focusAtOffset(offset: number) {
      const root = rootRef.current
      if (!root) return
      placeCaretAtSerializedOffset(root, offset)
    },
    insertCitation(citationId: string, citationOverride?: Citation) {
      const root = rootRef.current
      if (!root) return value

      const selection = window.getSelection()
      const chip = createCitationChipNode(document, citationId, citationOverride ?? citationsMap.get(citationId))
      root.focus()

      if (!selection || selection.rangeCount === 0 || !root.contains(selection.anchorNode)) {
        if (lastSelectionRef.current) {
          placeCaretAtSerializedOffset(root, lastSelectionRef.current.start)
        } else {
          placeCaretAtEnd(root)
        }
      }

      const activeSelection = window.getSelection()
      if (!activeSelection || activeSelection.rangeCount === 0) return value

      const range = activeSelection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(chip)
      moveCaretAfterNode(chip)

      const nextValue = serializeEditorContent(root)
      rawValueRef.current = nextValue
      lastSelectionRef.current = null
      onChange(nextValue)
      return nextValue
    },
    insertCrossReference(kind: CrossReferenceKind, targetId: string, referenceOverride?: CrossReferenceRenderItem) {
      const root = rootRef.current
      if (!root) return value

      const selection = window.getSelection()
      const range = selection && selection.rangeCount > 0 && root.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : null
      const referenceNode = createCrossReferenceNode(document, kind, targetId, referenceOverride ?? crossReferencesMap.get(`${kind}:${targetId}`))

      if (range) {
        range.deleteContents()
        range.insertNode(referenceNode)
        moveCaretAfterNode(referenceNode)
      } else {
        root.append(referenceNode)
        moveCaretAfterNode(referenceNode)
      }

      const nextValue = serializeEditorContent(root)
      rawValueRef.current = nextValue
      lastSelectionRef.current = null
      onChange(nextValue)
      return nextValue
    },
    insertFigure(figureId: string, figureOverride?: Figure) {
      const root = rootRef.current
      if (!root) {
        return { value, caretOffset: value.length }
      }

      const selection = window.getSelection()
      const marker = buildFigureMarker(figureId)
      const nextFiguresMap = figureOverride
        ? new Map(figuresMap).set(figureId, figureOverride)
        : figuresMap
      const range = selection && selection.rangeCount > 0 && root.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : null
      const startOffset = range
        ? getSerializedOffset(root, range.startContainer, range.startOffset)
        : lastSelectionRef.current?.start ?? value.length
      const endOffset = range
        ? getSerializedOffset(root, range.endContainer, range.endOffset)
        : lastSelectionRef.current?.end ?? startOffset
      const { nextValue, caretOffset } = buildBlockInsertionContent(value, startOffset, endOffset, marker)

      rawValueRef.current = nextValue
      renderContentEditableValue(root, nextValue, citationsMap, nextFiguresMap, tabularElementsMap, crossReferencesMap)
      window.requestAnimationFrame(() => {
        placeCaretAtSerializedOffset(root, caretOffset)
      })

      rawValueRef.current = nextValue
      lastSelectionRef.current = { start: caretOffset, end: caretOffset }
      onChange(nextValue)
      return { value: nextValue, caretOffset }
    },
    insertTabularElement(itemId: string, kind: TabularElementKind, itemOverride?: TabularElement) {
      const root = rootRef.current
      if (!root) {
        return { value, caretOffset: value.length }
      }

      const selection = window.getSelection()
      const marker = buildTabularMarker(kind, itemId)
      const nextTabularElementsMap = itemOverride
        ? new Map(tabularElementsMap).set(itemId, itemOverride)
        : tabularElementsMap
      const range = selection && selection.rangeCount > 0 && root.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : null
      const startOffset = range
        ? getSerializedOffset(root, range.startContainer, range.startOffset)
        : lastSelectionRef.current?.start ?? value.length
      const endOffset = range
        ? getSerializedOffset(root, range.endContainer, range.endOffset)
        : lastSelectionRef.current?.end ?? startOffset
      const { nextValue, caretOffset } = buildBlockInsertionContent(value, startOffset, endOffset, marker)

      rawValueRef.current = nextValue
      renderContentEditableValue(root, nextValue, citationsMap, figuresMap, nextTabularElementsMap, crossReferencesMap)
      window.requestAnimationFrame(() => {
        placeCaretAtSerializedOffset(root, caretOffset)
      })

      rawValueRef.current = nextValue
      lastSelectionRef.current = { start: caretOffset, end: caretOffset }
      onChange(nextValue)
      return { value: nextValue, caretOffset }
    },
  }), [citationsMap, crossReferencesMap, figuresMap, onChange, tabularElementsMap, value])

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

      if (sibling instanceof HTMLElement && (sibling.dataset.citationId || sibling.dataset.figureId || sibling.dataset.tableId || sibling.dataset.quadroId || (sibling.dataset.xrefKind && sibling.dataset.xrefTargetId))) {
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
