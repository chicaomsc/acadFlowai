import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as citationService from '@/shared/services/citation.service'
import * as figureService from '@/shared/services/figure.service'
import * as tableService from '@/shared/services/table.service'
import { buildCitationAbntPreview, EditorPage, extractCitationIds, extractCrossReferenceTargets, extractFigureIds, extractQuadroIds, extractTableIds, validateTabularElementForm } from '@/features/editor/pages/editor-page'
import { mockDb } from '@/shared/mocks/database'
import { getChapter, updateChapterContent } from '@/shared/services/chapter.service'
import { getChapterCitations } from '@/shared/services/citation.service'
import { getReferences } from '@/shared/services/reference.service'
import { renderWithRouter } from '@/test/render-utils'

describe('editor page', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    mockDb.citations.splice(0, mockDb.citations.length, {
      id: 'citation-1',
      projectId: 'project-1',
      chapterId: 'chapter-2',
      referenceId: 'reference-2',
      type: 'indirect',
      displayMode: 'parenthetical',
      citationDisplayMode: 'parenthetical',
      page: '42',
      reference: mockDb.references[1],
      createdAt: new Date('2024-03-20'),
      updatedAt: new Date('2024-03-20'),
    })
    mockDb.references[1].hasCitation = true
    mockDb.figures.splice(0, mockDb.figures.length, {
      id: 'figure-1',
      projectId: 'project-1',
      chapterId: 'chapter-2',
      caption: 'Arquitetura geral do sistema de tutoria inteligente',
      sourceText: 'Elaboração própria.',
      originalFilename: 'arquitetura-sti.png',
      mimeType: 'image/png',
      fileSizeBytes: 245760,
      widthPercent: 75,
      createdAt: new Date('2024-03-21'),
      imageUrl: 'data:image/png;base64,mock',
    })
    mockDb.tabularElements.splice(0, mockDb.tabularElements.length,
      {
        id: 'table-1',
        projectId: 'project-1',
        chapterId: 'chapter-2',
        kind: 'table',
        title: 'Distribuição de estudos por período',
        sourceText: 'Elaboração própria.',
        rows: [
          ['Período', 'Quantidade de estudos'],
          ['2015-2019', '12'],
          ['2020-2024', '21'],
        ],
        createdAt: new Date('2024-03-21'),
      },
      {
        id: 'quadro-1',
        projectId: 'project-1',
        chapterId: 'chapter-2',
        kind: 'quadro',
        title: 'Síntese dos critérios de análise',
        sourceText: 'Adaptado do protocolo da pesquisa.',
        rows: [
          ['Critério', 'Descrição'],
          ['Personalização', 'Nível de adaptação ao estudante'],
          ['Feedback', 'Tempo e especificidade da resposta'],
        ],
        createdAt: new Date('2024-03-22'),
      },
    )
    await updateChapterContent('chapter-1', 'A educação superior enfrenta desafios significativos no século XXI, especialmente no que diz respeito à personalização do ensino e ao acompanhamento individualizado dos estudantes. Nesse contexto, os Sistemas de Tutoria Inteligente emergem como uma solução promissora, combinando técnicas de Inteligência Artificial com teorias pedagógicas para oferecer experiências de aprendizagem adaptativas.\n\nEste trabalho propõe uma análise aprofundada sobre a aplicação de sistemas de tutoria inteligente no contexto da educação superior brasileira, investigando seus impactos no desempenho acadêmico e na experiência de aprendizagem dos estudantes.')
    await updateChapterContent('chapter-2', '2.1 Inteligência Artificial na Educação\n\nA aplicação de Inteligência Artificial na educação não é um fenômeno recente. Desde os primeiros sistemas especialistas da década de 1970, pesquisadores exploram formas de utilizar a tecnologia para personalizar e otimizar o processo de ensino-aprendizagem.\n\n2.2 Sistemas de Tutoria Inteligente\n\nOs Sistemas de Tutoria Inteligente são ambientes computacionais projetados para simular o comportamento de um tutor humano, oferecendo instrução personalizada e feedback adaptativo aos estudantes.')
    await updateChapterContent('chapter-3', '')
  })

  it('extrai ids de citações a partir dos marcadores no texto', () => {
    expect(extractCitationIds('Texto [[@CITE:citation-1]] e [[@CITE:abc-123]].')).toEqual(['citation-1', 'abc-123'])
  })

  it('extrai ids de figuras a partir dos marcadores no texto', () => {
    expect(extractFigureIds('Texto [[@FIG:figure-1]] e [[@FIG:fig-abc]].')).toEqual(['figure-1', 'fig-abc'])
  })

  it('extrai ids de tabelas e quadros a partir dos marcadores no texto', () => {
    expect(extractTableIds('Texto [[@TABLE:table-1]] e [[@TABLE:table-abc]].')).toEqual(['table-1', 'table-abc'])
    expect(extractQuadroIds('Texto [[@QUADRO:quadro-1]] e [[@QUADRO:quadro-abc]].')).toEqual(['quadro-1', 'quadro-abc'])
  })

  it('extrai referências cruzadas a partir dos marcadores no texto', () => {
    expect(extractCrossReferenceTargets('Texto [[@XREF:FIG:figure-1]] e [[@XREF:TABLE:table-1]] e [[@XREF:QUADRO:quadro-1]] e [[@XREF:CHAPTER:chapter-1]].')).toEqual([
      { kind: 'FIG', targetId: 'figure-1' },
      { kind: 'TABLE', targetId: 'table-1' },
      { kind: 'QUADRO', targetId: 'quadro-1' },
      { kind: 'CHAPTER', targetId: 'chapter-1' },
    ])
  })

  it('valida grade de tabela/quadro exigindo cabeçalhos e pelo menos uma linha com conteúdo', () => {
    expect(validateTabularElementForm([['', ''], ['', '']]).valid).toBe(false)
    expect(validateTabularElementForm([['Coluna 1', 'Coluna 2']]).valid).toBe(false)
    expect(validateTabularElementForm([['Coluna 1', 'Coluna 2'], ['', '']]).valid).toBe(false)
    expect(validateTabularElementForm([['Coluna 1', 'Coluna 2'], ['A', '']]).valid).toBe(true)
  })

  it('renderiza inline citação narrativa como Silva (2024)', () => {
    expect(buildCitationAbntPreview({
      id: 'citation-x',
      projectId: 'project-1',
      chapterId: 'chapter-1',
      referenceId: 'reference-x',
      type: 'indirect',
      displayMode: 'narrative',
      reference: {
        id: 'reference-x',
        projectId: 'project-1',
        chapterIds: [],
        type: 'book',
        authors: ['SILVA, João'],
        title: 'Título',
        year: 2024,
        hasCitation: true,
      },
    })).toBe('Silva (2024)')
  })

  it('renderiza inline citação parentética como (SILVA, 2024)', () => {
    expect(buildCitationAbntPreview({
      id: 'citation-y',
      projectId: 'project-1',
      chapterId: 'chapter-1',
      referenceId: 'reference-y',
      type: 'indirect',
      displayMode: 'parenthetical',
      reference: {
        id: 'reference-y',
        projectId: 'project-1',
        chapterIds: [],
        type: 'book',
        authors: ['SILVA, João'],
        title: 'Título',
        year: 2024,
        hasCitation: true,
      },
    })).toBe('(SILVA, 2024)')
  })

  it('permite navegar entre capítulos e salvar conteúdo mockado', async () => {
    const user = userEvent.setup()

    renderWithRouter([
      { path: '/editor/:projectId', element: <EditorPage /> },
      { path: '/editor/:projectId/:nodeId', element: <EditorPage /> },
    ], ['/editor/project-1'])

    expect(await screen.findByRole('heading', { name: 'Introdução' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /fundamentação teórica/i }))
    expect(await screen.findByRole('heading', { name: 'Fundamentação Teórica' })).toBeInTheDocument()

    const textarea = screen.getByRole('textbox', { name: 'Editor do capítulo' })
    await user.clear(textarea)
    await user.type(textarea, 'Texto salvo pelo teste de integração visual.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-2')
      expect(updatedChapter?.content).toBe('Texto salvo pelo teste de integração visual.')
      expect(updatedChapter?.wordCount).toBeGreaterThan(0)
    })
  })

  it('restaura o capítulo ativo pela rota após refresh', async () => {
    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    expect(await screen.findByRole('heading', { name: 'Metodologia' })).toBeInTheDocument()
  })

  it('restaura resumo e abstract pela rota após refresh', async () => {
    const { unmount } = renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/summary'],
    )

    expect(await screen.findByText('Síntese acadêmica em português com foco em clareza, densidade e fechamento conceitual.')).toBeInTheDocument()

    unmount()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/abstract'],
    )

    expect(await screen.findByText('Versão internacional do resumo, com linguagem objetiva e vocabulário acadêmico consistente.')).toBeInTheDocument()
  })

  it('cai para o primeiro capítulo válido quando o chapterId da rota é inválido', async () => {
    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-invalido'],
    )

    expect(await screen.findByRole('heading', { name: 'Introdução' })).toBeInTheDocument()
  })

  it('insere e remove citação inline sem quebrar o conteúdo do capítulo', async () => {
    const user = userEvent.setup()

    renderWithRouter([
      { path: '/editor/:projectId', element: <EditorPage /> },
      { path: '/editor/:projectId/:nodeId', element: <EditorPage /> },
    ], ['/editor/project-1/chapter-1'])

    expect(await screen.findByRole('heading', { name: 'Introdução' })).toBeInTheDocument()

    const textarea = screen.getByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(textarea)
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(textarea)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)

    await user.click(screen.getAllByRole('button', { name: /inserir citação/i })[0])

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByPlaceholderText('Ex.: 42-43'), '33')
    await user.click(within(dialog).getByRole('button', { name: /^inserir citação$/i }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toMatch(/\[\[@CITE:citation-\d+\]\]/)
      const citations = await getChapterCitations('chapter-1')
      expect(citations.length).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: /remover/i }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).not.toMatch(/\[\[@CITE:citation-\d+\]\]/)
      const citations = await getChapterCitations('chapter-1')
      expect(citations).toHaveLength(0)
    })
  })

  it('cria uma referência rápida dentro do modal e continua o fluxo de citação', async () => {
    const user = userEvent.setup()

    renderWithRouter([
      { path: '/editor/:projectId', element: <EditorPage /> },
      { path: '/editor/:projectId/:nodeId', element: <EditorPage /> },
    ], ['/editor/project-1/chapter-1'])

    expect(await screen.findByRole('heading', { name: 'Introdução' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /inserir citação/i }))

    const citationDialog = await screen.findByRole('dialog', { name: 'Inserir citação' })
    const referenceTrigger = within(citationDialog).getAllByRole('combobox')[0]
    await user.click(referenceTrigger)
    await user.click(await screen.findByText('+ Nova referência rápida'))

    const quickReferenceDialog = await screen.findByRole('dialog', { name: 'Nova referência rápida' })
    const quickCombobox = within(quickReferenceDialog).getByRole('combobox')
    await user.click(quickCombobox)
    await user.click(await screen.findByText('Livro'))
    await user.type(within(quickReferenceDialog).getByPlaceholderText('Sobrenome, Nome; Sobrenome, Nome'), 'SILVA, Ana')
    await user.type(within(quickReferenceDialog).getByPlaceholderText('Título da obra'), 'Metodologia Científica Aplicada')
    await user.type(within(quickReferenceDialog).getByPlaceholderText('2024'), '2024')
    await user.type(within(quickReferenceDialog).getByPlaceholderText('Editora'), 'Atlas')
    await user.click(within(quickReferenceDialog).getByRole('button', { name: /criar referência/i }))

    await waitFor(async () => {
      expect(screen.queryByRole('dialog', { name: 'Nova referência rápida' })).not.toBeInTheDocument()
      const references = await getReferences('project-1')
      expect(references.some((reference) => reference.title === 'Metodologia Científica Aplicada')).toBe(true)
    })

    await user.type(within(citationDialog).getByPlaceholderText('Ex.: 42-43'), '12')
    await user.click(within(citationDialog).getByRole('button', { name: /^inserir citação$/i }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toMatch(/\[\[@CITE:citation-\d+\]\]/)
      const citations = await getChapterCitations('chapter-1')
      expect(citations.some((citation) => citation.reference?.title === 'Metodologia Científica Aplicada')).toBe(true)
    })
  })

  it('valida campos obrigatórios no modal de figura', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    expect(await screen.findByRole('heading', { name: 'Introdução' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /inserir figura/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir figura' })
    await user.click(within(dialog).getByRole('button', { name: /^inserir figura$/i }))

    expect(await within(dialog).findByText(/selecione uma imagem/i)).toBeInTheDocument()
  })

  it('insere figura com marcador bruto e renderiza preview visual inline', async () => {
    const user = userEvent.setup()
    const file = new File(['figure'], 'fluxograma.png', { type: 'image/png' })

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    expect(await screen.findByRole('heading', { name: 'Introdução' })).toBeInTheDocument()

    const editor = screen.getByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)

    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)

    await user.click(screen.getByRole('button', { name: /inserir figura/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir figura' })
    await user.upload(within(dialog).getByLabelText('Upload da imagem da figura'), file)
    await user.type(within(dialog).getByPlaceholderText('Ex.: Arquitetura geral do sistema'), 'Fluxograma do processo')
    await user.click(within(dialog).getByRole('button', { name: /^inserir figura$/i }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toMatch(/\[\[@FIG:figure-\d+\]\]/)
    })

    expect(editor.textContent).toContain('Figura 1 – Fluxograma do processo')
    const image = within(editor).getByRole('img', { name: 'Fluxograma do processo' })
    expect(image).toBeInTheDocument()
    expect(image.getAttribute('src')).toMatch(/^(blob:|data:image)/)
    expect(editor.textContent).toContain('Fonte: não informada.')
  })

  it('insere tabela com marcador bruto e renderiza preview visual inline', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)
    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir tabela/quadro' })
    await user.type(within(dialog).getByPlaceholderText('Ex.: Distribuição dos resultados por turma'), 'Resultados por semestre')
    await user.clear(within(dialog).getByPlaceholderText('Cabeçalho 1'))
    await user.type(within(dialog).getByPlaceholderText('Cabeçalho 1'), 'Semestre')
    await user.clear(within(dialog).getByPlaceholderText('Cabeçalho 2'))
    await user.type(within(dialog).getByPlaceholderText('Cabeçalho 2'), 'Resultados')
    await user.type(within(dialog).getByPlaceholderText('Célula 2.1'), '2025.1')
    await user.type(within(dialog).getByPlaceholderText('Célula 2.2'), '18')
    await user.click(within(dialog).getByRole('button', { name: /^inserir tabela$/i }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toMatch(/\[\[@TABLE:table-\d+\]\]/)
    })

    expect(screen.queryByText(/type é obrigatório/i)).not.toBeInTheDocument()
    expect(editor.textContent).toContain('Tabela 1 – Resultados por semestre')
    expect(within(editor).getByText('Semestre')).toBeInTheDocument()
    expect(within(editor).getByText('2025.1')).toBeInTheDocument()
  })

  it('insere quadro com marcador bruto e renderiza preview visual inline', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)
    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir tabela/quadro' })
    await user.click(within(dialog).getByRole('button', { name: /quadro/i }))
    await user.type(within(dialog).getByPlaceholderText('Ex.: Síntese dos critérios analisados'), 'Critérios de avaliação')
    await user.type(within(dialog).getByPlaceholderText('Ex.: Elaboração própria.'), 'Elaboração própria.')
    await user.type(within(dialog).getByPlaceholderText('Célula 2.1'), 'Aderência')
    await user.type(within(dialog).getByPlaceholderText('Célula 2.2'), 'Alta')
    await user.click(within(dialog).getByRole('button', { name: /^inserir quadro$/i }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toMatch(/\[\[@QUADRO:quadro-\d+\]\]/)
    })

    expect(editor.textContent).toContain('Quadro 1 – Critérios de avaliação')
    expect(within(editor).getByText('Aderência')).toBeInTheDocument()
    expect(within(editor).getByText('Alta')).toBeInTheDocument()
  })

  it('renderiza imediatamente a tabela recém-criada sem fallback usando o id retornado pela API', async () => {
    const user = userEvent.setup()
    vi.spyOn(tableService, 'createTabularElement').mockResolvedValue({
      id: 'table-api-1',
      projectId: 'project-1',
      chapterId: 'chapter-1',
      kind: 'table',
      title: 'Tabela vinda da API',
      sourceText: 'Elaboração própria.',
      rows: [
        ['Coluna A', 'Coluna B'],
        ['Valor 1', 'Valor 2'],
      ],
    })

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)
    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir tabela/quadro' })
    await user.type(within(dialog).getByPlaceholderText('Ex.: Distribuição dos resultados por turma'), 'Tabela vinda da API')
    await user.clear(within(dialog).getByPlaceholderText('Cabeçalho 1'))
    await user.type(within(dialog).getByPlaceholderText('Cabeçalho 1'), 'Coluna A')
    await user.clear(within(dialog).getByPlaceholderText('Cabeçalho 2'))
    await user.type(within(dialog).getByPlaceholderText('Cabeçalho 2'), 'Coluna B')
    await user.type(within(dialog).getByPlaceholderText('Célula 2.1'), 'Valor 1')
    await user.type(within(dialog).getByPlaceholderText('Célula 2.2'), 'Valor 2')
    await user.click(within(dialog).getByRole('button', { name: /^inserir tabela$/i }))

    expect(editor.textContent).toContain('Tabela 1 – Tabela vinda da API')
    expect(editor.textContent).not.toContain('Tabela removida ou inválida')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toContain('[[@TABLE:table-api-1]]')
    })
  })

  it('renderiza imediatamente o quadro recém-criado sem fallback usando o id retornado pela API', async () => {
    const user = userEvent.setup()
    vi.spyOn(tableService, 'createTabularElement').mockResolvedValue({
      id: 'quadro-api-1',
      projectId: 'project-1',
      chapterId: 'chapter-1',
      kind: 'quadro',
      title: 'Quadro vindo da API',
      sourceText: 'Adaptado pelo autor.',
      rows: [
        ['Critério', 'Descrição'],
        ['Escopo', 'Visão consolidada'],
      ],
    })

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)
    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir tabela/quadro' })
    await user.click(within(dialog).getByRole('button', { name: /quadro/i }))
    await user.type(within(dialog).getByPlaceholderText('Ex.: Síntese dos critérios analisados'), 'Quadro vindo da API')
    await user.clear(within(dialog).getByPlaceholderText('Cabeçalho 1'))
    await user.type(within(dialog).getByPlaceholderText('Cabeçalho 1'), 'Critério')
    await user.clear(within(dialog).getByPlaceholderText('Cabeçalho 2'))
    await user.type(within(dialog).getByPlaceholderText('Cabeçalho 2'), 'Descrição')
    await user.type(within(dialog).getByPlaceholderText('Célula 2.1'), 'Escopo')
    await user.type(within(dialog).getByPlaceholderText('Célula 2.2'), 'Visão consolidada')
    await user.click(within(dialog).getByRole('button', { name: /^inserir quadro$/i }))

    expect(editor.textContent).toContain('Quadro 1 – Quadro vindo da API')
    expect(editor.textContent).not.toContain('Quadro removido ou inválido')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toContain('[[@QUADRO:quadro-api-1]]')
    })
  })

  it('insere referência cruzada de figura e preserva o marcador bruto', async () => {
    const user = userEvent.setup()
    await updateChapterContent('chapter-1', 'Texto com [[@FIG:figure-1]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)
    await user.click(screen.getByRole('button', { name: /inserir referência cruzada/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir referência cruzada' })
    await user.click(within(dialog).getByRole('button', { name: /inserir referência cruzada/i }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(editor.textContent).toContain('Figura 1')

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toContain('[[@XREF:FIG:figure-1]]')
    })
  })

  it('insere referência cruzada de tabela e renderiza inline corretamente', async () => {
    const user = userEvent.setup()
    await updateChapterContent('chapter-1', 'Texto com [[@TABLE:table-1]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)
    await user.click(screen.getByRole('button', { name: /inserir referência cruzada/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir referência cruzada' })
    await user.click(within(dialog).getByRole('button', { name: /tabela/i }))
    await user.click(within(dialog).getByRole('button', { name: /inserir referência cruzada/i }))

    expect(editor.textContent).toContain('Tabela 1')
  })

  it('insere referência cruzada de quadro e renderiza inline corretamente', async () => {
    const user = userEvent.setup()
    await updateChapterContent('chapter-1', 'Texto com [[@QUADRO:quadro-1]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)
    await user.click(screen.getByRole('button', { name: /inserir referência cruzada/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir referência cruzada' })
    await user.click(within(dialog).getByRole('button', { name: /quadro/i }))
    await user.click(within(dialog).getByRole('button', { name: /inserir referência cruzada/i }))

    expect(editor.textContent).toContain('Quadro 1')
  })

  it('insere referência cruzada de capítulo e renderiza inline como Capítulo N', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)
    await user.click(screen.getByRole('button', { name: /inserir referência cruzada/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir referência cruzada' })
    await user.click(within(dialog).getByRole('button', { name: /capítulo/i }))
    await user.click(within(dialog).getByRole('button', { name: /inserir referência cruzada/i }))

    expect(editor.textContent).toContain('Capítulo 1')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toContain('[[@XREF:CHAPTER:chapter-1]]')
    })
  })

  it('mostra mensagem útil quando a criação de tabela/quadro retorna 404', async () => {
    const user = userEvent.setup()
    vi.spyOn(tableService, 'createTabularElement').mockRejectedValue(
      new Error('Não foi possível criar a tabela/quadro. Verifique se o projeto e o capítulo ainda existem.'),
    )

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir tabela/quadro' })
    await user.type(within(dialog).getByPlaceholderText('Ex.: Distribuição dos resultados por turma'), 'Resultados')
    await user.clear(within(dialog).getByPlaceholderText('Cabeçalho 1'))
    await user.type(within(dialog).getByPlaceholderText('Cabeçalho 1'), 'Coluna A')
    await user.clear(within(dialog).getByPlaceholderText('Cabeçalho 2'))
    await user.type(within(dialog).getByPlaceholderText('Cabeçalho 2'), 'Coluna B')
    await user.type(within(dialog).getByPlaceholderText('Célula 2.1'), 'Valor 1')
    await user.type(within(dialog).getByPlaceholderText('Célula 2.2'), 'Valor 2')
    await user.click(within(dialog).getByRole('button', { name: /^inserir tabela$/i }))

    expect(await within(dialog).findByText('Não foi possível criar a tabela/quadro. Verifique se o projeto e o capítulo ainda existem.')).toBeInTheDocument()
  })

  it('valida controles de grade para adicionar e remover linha e coluna', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir tabela/quadro' })
    expect(within(dialog).getByTestId('tabular-grid-toolbar')).toBeInTheDocument()
    expect(within(dialog).getAllByPlaceholderText(/Cabeçalho|Célula/)).toHaveLength(4)

    await user.click(within(dialog).getByRole('button', { name: /\+ linha/i }))
    expect(within(dialog).getAllByPlaceholderText(/Cabeçalho|Célula/)).toHaveLength(6)

    await user.click(within(dialog).getByRole('button', { name: /\+ coluna/i }))
    expect(within(dialog).getAllByPlaceholderText(/Cabeçalho|Célula/)).toHaveLength(9)

    await user.click(within(dialog).getByRole('button', { name: /- linha/i }))
    expect(within(dialog).getAllByPlaceholderText(/Cabeçalho|Célula/)).toHaveLength(6)

    await user.click(within(dialog).getByRole('button', { name: /- coluna/i }))
    expect(within(dialog).getAllByPlaceholderText(/Cabeçalho|Célula/)).toHaveLength(4)
  })

  it('impede submit de tabela vazia e destaca a grade inválida', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir tabela/quadro' })
    await user.type(within(dialog).getByPlaceholderText('Ex.: Distribuição dos resultados por turma'), 'Tabela inválida')
    expect(within(dialog).getByRole('button', { name: /^inserir tabela$/i })).toBeDisabled()
  })

  it('mantém body rolável e footer visível no modal de tabela', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByTestId('tabular-modal')
    const body = within(dialog).getByTestId('tabular-modal-body')
    const footer = within(dialog).getByTestId('tabular-modal-footer')

    expect(dialog.className).toContain('w-[min(90vw,860px)]')
    expect(dialog.className).toContain('max-w-[860px]')
    expect(dialog.className).toContain('max-h-[90vh]')
    expect(body.className).toContain('overflow-y-auto')
    expect(footer).toBeVisible()
    expect(within(footer).getByRole('button', { name: /cancelar/i })).toBeVisible()
    expect(within(footer).getByRole('button', { name: /inserir tabela/i })).toBeVisible()
  })

  it('renderiza tipo, título, fonte, grade e preview em ordem no modal único', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir tabela/quadro' })
    const stack = within(dialog).getByTestId('tabular-modal-stack')
    const toolbar = within(dialog).getByTestId('tabular-grid-toolbar')
    const scroller = within(dialog).getByTestId('tabular-grid-scroller')
    const preview = within(dialog).getByTestId('tabular-preview-card')

    expect(stack).toContainElement(within(dialog).getByText('Tipo'))
    expect(stack).toContainElement(within(dialog).getByPlaceholderText('Ex.: Distribuição dos resultados por turma'))
    expect(stack).toContainElement(within(dialog).getByPlaceholderText('Ex.: Elaboração própria.'))
    expect(stack).toContainElement(toolbar)
    expect(stack).toContainElement(scroller)
    expect(stack).toContainElement(preview)
    expect(preview.className).not.toContain('sticky')
    expect(preview.className).not.toContain('absolute')
  })

  it('toolbar mostra apenas um botão para tabela/quadro e o modal abre com tabela por padrão', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    expect(screen.getAllByRole('button', { name: /inserir tabela\/quadro/i })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /^inserir tabela$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^inserir quadro$/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir tabela/quadro' })
    expect(within(dialog).getByRole('button', { name: /^inserir tabela$/i })).toBeInTheDocument()
  })

  it('selecionar quadro muda preview e botão final no modal único', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(screen.getByRole('button', { name: /inserir tabela\/quadro/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir tabela/quadro' })
    await user.click(within(dialog).getByRole('button', { name: /quadro/i }))

    expect(within(dialog).getByRole('button', { name: /^inserir quadro$/i })).toBeInTheDocument()
    expect(within(dialog).getByText(/quadro 1/i)).toBeInTheDocument()
  })

  it('insere figura entre dois trechos preservando texto antes e depois', async () => {
    const user = userEvent.setup()
    const file = new File(['figure'], 'fluxograma.png', { type: 'image/png' })
    await updateChapterContent('chapter-1', 'Texto antesTexto depois')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)

    const textNode = editor.firstChild
    const selection = window.getSelection()
    const range = document.createRange()
    expect(textNode?.nodeType).toBe(Node.TEXT_NODE)
    range.setStart(textNode as Text, 'Texto antes'.length)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)

    await user.click(screen.getByRole('button', { name: /inserir figura/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir figura' })
    await user.upload(within(dialog).getByLabelText('Upload da imagem da figura'), file)
    await user.type(within(dialog).getByPlaceholderText('Ex.: Arquitetura geral do sistema'), 'Figura entre trechos')
    await user.click(within(dialog).getByRole('button', { name: /^inserir figura$/i }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toMatch(/^Texto antes\n\n\[\[@FIG:figure-\d+\]\]\n\nTexto depois$/)
    })
  })

  it('devolve o foco ao editor após inserir a figura sem perder o texto seguinte', async () => {
    const user = userEvent.setup()
    const file = new File(['figure'], 'fluxograma.png', { type: 'image/png' })
    await updateChapterContent('chapter-1', 'Texto antesTexto depois')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)

    const textNode = editor.firstChild
    const selection = window.getSelection()
    const range = document.createRange()
    range.setStart(textNode as Text, 'Texto antes'.length)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)

    await user.click(screen.getByRole('button', { name: /inserir figura/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Inserir figura' })
    await user.upload(within(dialog).getByLabelText('Upload da imagem da figura'), file)
    await user.type(within(dialog).getByPlaceholderText('Ex.: Arquitetura geral do sistema'), 'Figura com continuação')
    await user.click(within(dialog).getByRole('button', { name: /^inserir figura$/i }))

    await waitFor(() => {
      expect(editor.textContent).toContain('Figura 1 – Figura com continuação')
    })

    await waitFor(() => {
      expect(document.activeElement).toBe(editor)
    })

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toMatch(/^Texto antes\n\n\[\[@FIG:figure-\d+\]\]\n\nTexto depois$/)
    })
  })

  it('renderiza a citação inline com autor e ano reais', async () => {
    const user = userEvent.setup()

    renderWithRouter([
      { path: '/editor/:projectId', element: <EditorPage /> },
      { path: '/editor/:projectId/:nodeId', element: <EditorPage /> },
    ], ['/editor/project-1/chapter-1'])

    expect(await screen.findByRole('heading', { name: 'Introdução' })).toBeInTheDocument()

    const editor = screen.getByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)

    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)

    await user.click(screen.getAllByRole('button', { name: /inserir citação/i })[0])

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByPlaceholderText('Ex.: 42-43'), '33')
    await user.click(within(dialog).getByRole('button', { name: /^inserir citação$/i }))

    await waitFor(() => {
      expect(editor.textContent).toContain('(ANDERSON; CORBETT et al., 1995, p. 33)')
    })
  })

  it('renderiza citação narrativa inline com autor fora dos parênteses', async () => {
    const user = userEvent.setup()

    renderWithRouter([
      { path: '/editor/:projectId', element: <EditorPage /> },
      { path: '/editor/:projectId/:nodeId', element: <EditorPage /> },
    ], ['/editor/project-1/chapter-1'])

    expect(await screen.findByRole('heading', { name: 'Introdução' })).toBeInTheDocument()

    const editor = screen.getByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(editor)

    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)

    await user.click(screen.getAllByRole('button', { name: /inserir citação/i })[0])

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /narrativa/i }))
    await user.type(within(dialog).getByPlaceholderText('Ex.: 42-43'), '12')
    await user.click(within(dialog).getByRole('button', { name: /^inserir citação$/i }))

    await waitFor(() => {
      expect(editor.textContent).toContain('Anderson; Corbett et al. (1995, p. 12)')
    })
  })

  it('mostra fallback quando a citação não é encontrada', async () => {
    await updateChapterContent('chapter-3', 'Texto com marcador órfão [[@CITE:missing-citation]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    expect(await screen.findByRole('heading', { name: 'Metodologia' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Editor do capítulo' }).textContent).toContain('(Citação não encontrada)')
    })
  })

  it('mostra fallback quando a figura não é encontrada', async () => {
    await updateChapterContent('chapter-3', 'Texto com marcador órfão [[@FIG:missing-figure]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    expect(await screen.findByRole('heading', { name: 'Metodologia' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Editor do capítulo' }).textContent).toContain('Figura indisponível')
    })
  })

  it('mostra fallback quando a tabela não é encontrada', async () => {
    await updateChapterContent('chapter-3', 'Texto com marcador órfão [[@TABLE:missing-table]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    expect(await screen.findByRole('heading', { name: 'Metodologia' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Editor do capítulo' }).textContent).toContain('Tabela removida ou inválida')
    })
  })

  it('mostra fallback quando o quadro não é encontrado', async () => {
    await updateChapterContent('chapter-3', 'Texto com marcador órfão [[@QUADRO:missing-quadro]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    expect(await screen.findByRole('heading', { name: 'Metodologia' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Editor do capítulo' }).textContent).toContain('Quadro removido ou inválido')
    })
  })

  it('mostra fallback quando a referência cruzada não é encontrada', async () => {
    await updateChapterContent('chapter-3', 'Texto com marcador órfão [[@XREF:FIG:missing-figure]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    expect(await screen.findByRole('heading', { name: 'Metodologia' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Editor do capítulo' }).textContent).toContain('referência inválida')
    })
  })

  it('mostra fallback quando a referência cruzada de capítulo não é encontrada', async () => {
    await updateChapterContent('chapter-3', 'Texto com marcador órfão [[@XREF:CHAPTER:missing-chapter]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    expect(await screen.findByRole('heading', { name: 'Metodologia' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Editor do capítulo' }).textContent).toContain('referência inválida')
    })
  })

  it('reload reconstrói o preview visual da figura a partir do marcador', async () => {
    await updateChapterContent('chapter-3', 'Texto antes.\n\n[[@FIG:figure-1]]\n\nTexto depois.')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    const image = within(editor).getByRole('img', { name: 'Arquitetura geral do sistema de tutoria inteligente' })
    expect(image).toBeInTheDocument()
    expect(image.getAttribute('src')).toBe('data:image/png;base64,mock')
    expect(editor.textContent).toContain('Figura 1 – Arquitetura geral do sistema de tutoria inteligente')
    expect(editor.textContent).toContain('Fonte: Elaboração própria.')
  })

  it('reload reconstrói o preview visual de tabela e quadro a partir dos marcadores', async () => {
    await updateChapterContent('chapter-3', 'Texto antes.\n\n[[@TABLE:table-1]]\n\n[[@QUADRO:quadro-1]]\n\nTexto depois.')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    expect(editor.textContent).toContain('Tabela 1 – Distribuição de estudos por período')
    expect(editor.textContent).toContain('Quadro 1 – Síntese dos critérios de análise')
    expect(within(editor).getByText('Período')).toBeInTheDocument()
    expect(within(editor).getByText('Critério')).toBeInTheDocument()
  })

  it('mantém ordem e numeração independentes para tabelas e quadros nos pós-textuais', async () => {
    mockDb.tabularElements.push(
      {
        id: 'table-2',
        projectId: 'project-1',
        chapterId: 'chapter-1',
        kind: 'table',
        title: 'Resultados por grupo',
        sourceText: 'Base da pesquisa.',
        rows: [['Grupo', 'Valor'], ['A', '10']],
        createdAt: new Date('2024-03-23'),
      },
      {
        id: 'quadro-2',
        projectId: 'project-1',
        chapterId: 'chapter-1',
        kind: 'quadro',
        title: 'Categorias de análise',
        sourceText: 'Roteiro metodológico.',
        rows: [['Categoria', 'Descrição'], ['C1', 'Teste']],
        createdAt: new Date('2024-03-24'),
      },
    )
    await updateChapterContent('chapter-2', 'Texto [[@TABLE:table-1]] e [[@QUADRO:quadro-1]].')
    await updateChapterContent('chapter-1', 'Texto [[@TABLE:table-2]] e [[@QUADRO:quadro-2]].')

    const { unmount } = renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/tables'],
    )

    expect(await screen.findByRole('heading', { name: 'Lista de tabelas' })).toBeInTheDocument()
    expect(screen.getByText('Tabela 1 – Resultados por grupo')).toBeInTheDocument()
    expect(screen.getByText('Tabela 2 – Distribuição de estudos por período')).toBeInTheDocument()

    unmount()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/quadros'],
    )

    expect(await screen.findByRole('heading', { name: 'Lista de quadros' })).toBeInTheDocument()
    expect(screen.getByText('Quadro 1 – Categorias de análise')).toBeInTheDocument()
    expect(screen.getByText('Quadro 2 – Síntese dos critérios de análise')).toBeInTheDocument()
  })

  it('listas de tabelas e quadros mostram apenas elementos usados no texto', async () => {
    await updateChapterContent('chapter-2', 'Fundamentação com [[@TABLE:table-1]] e [[@QUADRO:quadro-1]].')

    mockDb.tabularElements.push(
      {
        id: 'table-unused',
        projectId: 'project-1',
        chapterId: 'chapter-2',
        kind: 'table',
        title: 'Tabela não citada',
        sourceText: 'Rascunho.',
        rows: [['A', 'B'], ['1', '2']],
        createdAt: new Date('2024-03-25'),
      },
      {
        id: 'quadro-unused',
        projectId: 'project-1',
        chapterId: 'chapter-2',
        kind: 'quadro',
        title: 'Quadro não citado',
        sourceText: 'Rascunho.',
        rows: [['A', 'B'], ['1', '2']],
        createdAt: new Date('2024-03-25'),
      },
    )

    const { unmount } = renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/tables'],
    )

    expect(await screen.findByRole('heading', { name: 'Lista de tabelas' })).toBeInTheDocument()
    expect(screen.getByText('Tabela 1 – Distribuição de estudos por período')).toBeInTheDocument()
    expect(screen.queryByText('Tabela não citada')).not.toBeInTheDocument()

    unmount()

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/quadros'],
    )

    expect(await screen.findByRole('heading', { name: 'Lista de quadros' })).toBeInTheDocument()
    expect(screen.getByText('Quadro 1 – Síntese dos critérios de análise')).toBeInTheDocument()
    expect(screen.queryByText('Quadro não citado')).not.toBeInTheDocument()
  })

  it('carrega a imagem da figura via service ao reconstruir preview sem imageUrl pré-resolvida', async () => {
    vi.spyOn(figureService, 'getFigureImage').mockResolvedValue('blob:figure-preview')
    mockDb.figures[0].imageUrl = undefined
    await updateChapterContent('chapter-3', 'Texto antes.\n\n[[@FIG:figure-1]]\n\nTexto depois.')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-3'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await waitFor(() => {
      const image = within(editor).getByRole('img', { name: 'Arquitetura geral do sistema de tutoria inteligente' })
      expect(image.getAttribute('src')).toBe('blob:figure-preview')
    })

    expect(figureService.getFigureImage).toHaveBeenCalledWith('project-1', 'figure-1')
  })

  it('aplica widthPercent na largura visual do preview da figura', async () => {
    await updateChapterContent('chapter-1', 'Texto com [[@FIG:figure-1]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    const image = within(editor).getByRole('img', { name: 'Arquitetura geral do sistema de tutoria inteligente' })
    const frame = image.closest('figure')?.firstElementChild as HTMLElement | null

    expect(frame).not.toBeNull()
    expect(frame?.style.width).toBe('75%')
  })

  it('serializa o preview de figura de volta para o marcador bruto', async () => {
    const user = userEvent.setup()
    await updateChapterContent('chapter-1', 'Texto com [[@FIG:figure-1]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    expect(editor.textContent).toContain('Figura 1 – Arquitetura geral do sistema de tutoria inteligente')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toContain('[[@FIG:figure-1]]')
    })
  })

  it('serializa o preview de tabela e quadro de volta para os marcadores brutos', async () => {
    const user = userEvent.setup()
    await updateChapterContent('chapter-1', 'Texto.\n\n[[@TABLE:table-1]]\n\n[[@QUADRO:quadro-1]]')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toContain('[[@TABLE:table-1]]')
      expect(updatedChapter?.content).toContain('[[@QUADRO:quadro-1]]')
    })
  })

  it('serializa a referência cruzada de volta para o marcador bruto e mantém o reload correto', async () => {
    const user = userEvent.setup()
    await updateChapterContent('chapter-1', 'Texto com [[@FIG:figure-1]] e [[@XREF:FIG:figure-1]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    expect(editor.textContent).toContain('Figura 1')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toContain('[[@XREF:FIG:figure-1]]')
    })
  })

  it('serializa a referência cruzada de capítulo de volta para o marcador bruto e mantém o reload correto', async () => {
    const user = userEvent.setup()
    await updateChapterContent('chapter-1', 'Texto com [[@XREF:CHAPTER:chapter-2]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    expect(editor.textContent).toContain('Capítulo 2')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toContain('[[@XREF:CHAPTER:chapter-2]]')
    })
  })

  it('serializa figura preservando o texto depois do bloco', async () => {
    const user = userEvent.setup()
    await updateChapterContent('chapter-1', 'Texto antes\n\n[[@FIG:figure-1]]\n\nTexto depois.')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toBe('Texto antes\n\n[[@FIG:figure-1]]\n\nTexto depois.')
    })
  })

  it('remover o marcador do texto remove o preview visual da figura', async () => {
    const user = userEvent.setup()
    await updateChapterContent('chapter-1', 'Texto com [[@FIG:figure-1]] para edição.')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    expect(within(editor).getByRole('img', { name: 'Arquitetura geral do sistema de tutoria inteligente' })).toBeInTheDocument()

    await user.clear(editor)
    await user.type(editor, 'Texto sem preview de figura.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toBe('Texto sem preview de figura.')
    })

    expect(within(editor).queryByRole('img', { name: 'Arquitetura geral do sistema de tutoria inteligente' })).not.toBeInTheDocument()
  })

  it('citação cadastrada sem marcador não conta no pós-textual', async () => {
    await updateChapterContent('chapter-2', 'Fundamentação sem citações.')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/references'],
    )

    expect(await screen.findByRole('heading', { name: 'Referências' })).toBeInTheDocument()
    expect(screen.getByText(/nenhuma referência citada no texto ainda/i)).toBeInTheDocument()
    expect(screen.queryByText(/Artificial Intelligence: A Modern Approach/i)).not.toBeInTheDocument()
  })

  it('lista apenas referências citadas no pós-textual', async () => {
    await updateChapterContent('chapter-2', 'Fundamentação com [[@CITE:citation-1]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/references'],
    )

    expect(await screen.findByRole('heading', { name: 'Referências' })).toBeInTheDocument()
    expect(screen.getByText(/Artificial Intelligence: A Modern Approach/i)).toBeInTheDocument()
    expect(screen.queryByText(/The relative effectiveness of human tutoring/i)).not.toBeInTheDocument()
  })

  it('lista apenas figuras usadas no pós-textual', async () => {
    await updateChapterContent('chapter-2', 'Fundamentação com [[@FIG:figure-1]].')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/figures'],
    )

    expect(await screen.findByRole('heading', { name: 'Lista de figuras' })).toBeInTheDocument()
    expect(screen.getByText(/Figura 1 – Arquitetura geral do sistema de tutoria inteligente/i)).toBeInTheDocument()
  })

  it('renderiza múltiplas figuras no mesmo capítulo preservando a ordem dos marcadores', async () => {
    mockDb.figures.push({
      id: 'figure-2',
      projectId: 'project-1',
      chapterId: 'chapter-1',
      caption: 'Fluxo editorial do capítulo',
      sourceText: 'Acervo da pesquisa.',
      originalFilename: 'fluxo-editorial.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 120000,
      widthPercent: 50,
      createdAt: new Date('2024-03-22'),
      imageUrl: 'data:image/png;base64,mock-2',
    })
    await updateChapterContent('chapter-1', '[[@FIG:figure-2]]\n\n[[@FIG:figure-1]]')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    const text = editor.textContent ?? ''
    expect(text.indexOf('Figura 1 – Fluxo editorial do capítulo')).toBeLessThan(text.indexOf('Figura 2 – Arquitetura geral do sistema de tutoria inteligente'))
  })

  it('não chama DELETE automaticamente quando o marcador some do texto', async () => {
    const user = userEvent.setup()
    const deleteSpy = vi.spyOn(citationService, 'deleteCitation')

    await updateChapterContent('chapter-1', 'Texto com [[@CITE:citation-1]] para edição.')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.clear(editor)
    await user.type(editor, 'Texto sem citação.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toBe('Texto sem citação.')
    })

    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('não chama DELETE de figura automaticamente quando o marcador some do texto', async () => {
    const user = userEvent.setup()
    const deleteSpy = vi.spyOn(figureService, 'deleteFigure')

    await updateChapterContent('chapter-1', 'Texto com [[@FIG:figure-1]] para edição.')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.clear(editor)
    await user.type(editor, 'Texto sem figura.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toBe('Texto sem figura.')
    })

    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('não chama DELETE de tabela ou quadro automaticamente quando o marcador some do texto', async () => {
    const user = userEvent.setup()
    const deleteSpy = vi.spyOn(tableService, 'deleteTabularElement')

    await updateChapterContent('chapter-1', 'Texto com [[@TABLE:table-1]] e [[@QUADRO:quadro-1]] para edição.')

    renderWithRouter(
      [{ path: '/editor/:projectId/:nodeId', element: <EditorPage /> }],
      ['/editor/project-1/chapter-1'],
    )

    const editor = await screen.findByRole('textbox', { name: 'Editor do capítulo' })
    await user.clear(editor)
    await user.type(editor, 'Texto sem elementos tabulares.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const updatedChapter = await getChapter('chapter-1')
      expect(updatedChapter?.content).toBe('Texto sem elementos tabulares.')
    })

    expect(deleteSpy).not.toHaveBeenCalled()
  })
})
