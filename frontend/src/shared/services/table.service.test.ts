import { describe, expect, it, vi, afterEach } from 'vitest'
import { apiClient } from '@/shared/services/api-client'
import { createTabularElement, parseTabularContent, serializeTabularRows } from '@/shared/services/table.service'

describe('table service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('envia payload com type TABLE para tabela por padrão visual', async () => {
    vi.spyOn(apiClient, 'isConfigured').mockReturnValue(true)
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      id: 'table-99',
      projectId: 'project-1',
      chapterId: 'chapter-1',
      type: 'TABLE',
      title: 'Resultados',
      content: 'Coluna A | Coluna B\nValor A | Valor B',
    })

    await createTabularElement('project-1', {
      chapterId: 'chapter-1',
      kind: 'table',
      title: 'Resultados',
      sourceText: 'Elaboração própria.',
      rows: [['Coluna A', 'Coluna B'], ['Valor A', 'Valor B']],
    })

    expect(postSpy).toHaveBeenCalledWith('/projects/project-1/tables', {
      body: expect.objectContaining({
        chapterId: 'chapter-1',
        type: 'TABLE',
        title: 'Resultados',
        sourceText: 'Elaboração própria.',
        content: 'Coluna A | Coluna B\nValor A | Valor B',
      }),
    })
    expect(postSpy.mock.calls[0]?.[1]).not.toEqual(expect.objectContaining({ type: 'Tabela' }))
    expect(postSpy.mock.calls[0]?.[1]).not.toEqual(expect.objectContaining({ type: '' }))
  })

  it('envia payload com type QUADRO quando quadro é selecionado', async () => {
    vi.spyOn(apiClient, 'isConfigured').mockReturnValue(true)
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      id: 'quadro-99',
      projectId: 'project-1',
      chapterId: 'chapter-1',
      type: 'QUADRO',
      title: 'Critérios',
      content: 'Campo | Valor\nAderência | Alta',
    })

    await createTabularElement('project-1', {
      chapterId: 'chapter-1',
      kind: 'quadro',
      title: 'Critérios',
      sourceText: 'Elaboração própria.',
      rows: [['Campo', 'Valor'], ['Aderência', 'Alta']],
    })

    expect(postSpy).toHaveBeenCalledWith('/projects/project-1/tables', {
      body: expect.objectContaining({
        chapterId: 'chapter-1',
        type: 'QUADRO',
        title: 'Critérios',
        sourceText: 'Elaboração própria.',
        content: 'Campo | Valor\nAderência | Alta',
      }),
    })
    expect(postSpy.mock.calls[0]?.[1]).not.toEqual(expect.objectContaining({ type: 'Quadro' }))
  })

  it('mostra mensagem útil quando a criação retorna 404', async () => {
    vi.spyOn(apiClient, 'isConfigured').mockReturnValue(true)
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Recurso não encontrado'))

    await expect(createTabularElement('project-1', {
      chapterId: 'chapter-1',
      kind: 'table',
      title: 'Resultados',
      sourceText: 'Elaboração própria.',
      rows: [['Coluna A', 'Coluna B'], ['Valor A', 'Valor B']],
    })).rejects.toThrow('Não foi possível criar a tabela/quadro. Verifique se o projeto e o capítulo ainda existem.')
  })

  it('converte grid para content e recompõe content para grid sem perder dados', () => {
    const rows = [['Campo', 'Valor'], ['Aderência', 'Alta'], ['Consistência', 'Média']]
    const content = serializeTabularRows(rows)

    expect(content).toBe('Campo | Valor\nAderência | Alta\nConsistência | Média')
    expect(parseTabularContent(content)).toEqual(rows)
  })
})
