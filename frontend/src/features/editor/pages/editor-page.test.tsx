import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as citationService from '@/shared/services/citation.service'
import * as figureService from '@/shared/services/figure.service'
import { buildCitationAbntPreview, EditorPage, extractCitationIds, extractFigureIds } from '@/features/editor/pages/editor-page'
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
})
