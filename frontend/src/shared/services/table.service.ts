import { mockDb } from '@/shared/mocks/database'
import { apiClient } from '@/shared/services/api-client'
import type { TabularElement, TabularElementKind } from '@/shared/types/contracts'

export interface TabularElementInput {
  chapterId: string
  kind: TabularElementKind
  title: string
  sourceText?: string
  rows: string[][]
}

interface ApiTabularElementResponse {
  id: string
  projectId?: string | null
  chapterId?: string | null
  kind?: string | null
  type?: string | null
  title?: string | null
  sourceText?: string | null
  rows?: string[][] | null
  content?: string | null
  createdAt?: string | null
}

function getCollectionPath(kind: TabularElementKind) {
  return kind === 'table' ? 'tables' : 'quadros'
}

function getCreateCollectionPath() {
  return 'tables'
}

function normalizeRows(rows?: string[][] | null) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [['', ''], ['', '']]
  }

  return rows.map((row) => (
    Array.isArray(row) && row.length > 0
      ? row.map((cell) => String(cell ?? ''))
      : ['']
  ))
}

export function serializeTabularRows(rows: string[][]) {
  return normalizeRows(rows)
    .map((row) => row.map((cell) => cell.trim()).join(' | '))
    .join('\n')
}

export function parseTabularContent(content?: string | null) {
  const normalized = content?.trim()
  if (!normalized) return [['', ''], ['', '']]

  const rows = normalized
    .split('\n')
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter((row) => row.length > 0)

  return normalizeRows(rows)
}

function mapApiTypeToKind(type?: string | null): TabularElementKind | null {
  if (type === 'QUADRO' || type === 'quadro') return 'quadro'
  if (type === 'TABLE' || type === 'table') return 'table'
  return null
}

function mapApiTabularElement(item: ApiTabularElementResponse, fallbackKind: TabularElementKind): TabularElement {
  const resolvedKind =
    mapApiTypeToKind(item.type)
    ?? (item.kind === 'quadro' ? 'quadro' : item.kind === 'table' ? 'table' : fallbackKind)

  return {
    id: item.id,
    projectId: item.projectId ?? '',
    chapterId: item.chapterId ?? '',
    kind: resolvedKind,
    title: item.title?.trim() || (resolvedKind === 'table' ? 'Tabela sem título' : 'Quadro sem título'),
    sourceText: item.sourceText?.trim() || undefined,
    rows: item.rows?.length ? normalizeRows(item.rows) : parseTabularContent(item.content),
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
  }
}

function getNextTabularElementId(kind: TabularElementKind) {
  const prefix = kind === 'table' ? 'table-' : 'quadro-'
  const highestId = mockDb.tabularElements.reduce((highest, item) => {
    const match = item.id.match(new RegExp(`^${prefix}(\\d+)$`))
    const numeric = match ? Number(match[1]) : 0
    return Math.max(highest, numeric)
  }, 0)

  return `${prefix}${highestId + 1}`
}

export async function getProjectTabularElements(projectId: string): Promise<TabularElement[]> {
  if (!apiClient.isConfigured()) {
    return structuredClone(mockDb.tabularElements.filter((item) => item.projectId === projectId))
  }

  const [tables, quadros] = await Promise.all([
    apiClient.get<ApiTabularElementResponse[]>(`/projects/${projectId}/tables`),
    apiClient.get<ApiTabularElementResponse[]>(`/projects/${projectId}/quadros`),
  ])

  return [
    ...tables.map((item) => mapApiTabularElement(item, 'table')),
    ...quadros.map((item) => mapApiTabularElement(item, 'quadro')),
  ]
}

export async function getChapterTabularElements(chapterId: string, projectId: string): Promise<TabularElement[]> {
  if (!apiClient.isConfigured()) {
    return structuredClone(
      mockDb.tabularElements.filter((item) => item.chapterId === chapterId && item.projectId === projectId),
    )
  }

  const [tables, quadros] = await Promise.all([
    apiClient.get<ApiTabularElementResponse[]>(`/chapters/${chapterId}/tables`),
    apiClient.get<ApiTabularElementResponse[]>(`/chapters/${chapterId}/quadros`),
  ])

  return [
    ...tables.map((item) => mapApiTabularElement(item, 'table')),
    ...quadros.map((item) => mapApiTabularElement(item, 'quadro')),
  ]
}

export async function createTabularElement(projectId: string, input: TabularElementInput): Promise<TabularElement> {
  if (apiClient.isConfigured()) {
    const normalizedRows = input.rows.map((row) => row.map((cell) => cell.trim()))
    const type = input.kind === 'table' ? 'TABLE' : 'QUADRO'

    try {
      const response = await apiClient.post<ApiTabularElementResponse>(`/projects/${projectId}/${getCreateCollectionPath()}`, {
        body: {
          chapterId: input.chapterId,
          type,
          title: input.title.trim(),
          sourceText: input.sourceText?.trim() || null,
          rows: normalizedRows,
          content: serializeTabularRows(normalizedRows),
        },
      })

      return mapApiTabularElement(response, input.kind)
    } catch (error) {
      if (error instanceof Error && /não encontrado|not found|404/i.test(error.message)) {
        throw new Error('Não foi possível criar a tabela/quadro. Verifique se o projeto e o capítulo ainda existem.')
      }

      throw error
    }
  }

  const item: TabularElement = {
    id: getNextTabularElementId(input.kind),
    projectId,
    chapterId: input.chapterId,
    kind: input.kind,
    title: input.title.trim(),
    sourceText: input.sourceText?.trim() || undefined,
    rows: normalizeRows(input.rows),
    createdAt: new Date(),
  }

  mockDb.tabularElements.push(item)
  return structuredClone(item)
}

export async function deleteTabularElement(item: Pick<TabularElement, 'id' | 'kind'>): Promise<boolean> {
  if (apiClient.isConfigured()) {
    await apiClient.delete<null>(`/${getCollectionPath(item.kind)}/${item.id}`)
    return true
  }

  const index = mockDb.tabularElements.findIndex((entry) => entry.id === item.id)
  if (index === -1) return false

  mockDb.tabularElements.splice(index, 1)
  return true
}
