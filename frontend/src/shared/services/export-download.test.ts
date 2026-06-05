import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadExportArtifact, downloadPdfExportArtifact } from '@/shared/services/export.service'
import { setSessionToken } from '@/shared/services/session.service'

describe('download export artifact', () => {
  const fetchMock = vi.fn()
  const createObjectURLMock = vi.fn()
  const revokeObjectURLMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    createObjectURLMock.mockReset()
    revokeObjectURLMock.mockReset()

    vi.stubGlobal('fetch', fetchMock)
    window.URL.createObjectURL = createObjectURLMock
    window.URL.revokeObjectURL = revokeObjectURLMock
    setSessionToken('jwt-token-123')
  })

  it('envia Authorization, baixa blob e usa o filename correto', async () => {
    const blob = new Blob(['docx-content'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    const originalCreateElement = document.createElement.bind(document)
    const anchor = originalCreateElement('a')
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return anchor
      }

      return originalCreateElement(tagName)
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })
    createObjectURLMock.mockReturnValue('blob:http://localhost/docx-1')

    await downloadExportArtifact('http://localhost:8080/downloads/tcc-final.docx', 'tcc-final.docx')

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/downloads/tcc-final.docx', {
      headers: {
        Authorization: 'Bearer jwt-token-123',
      },
    })
    expect(createObjectURLMock).toHaveBeenCalledWith(blob)
    expect(anchor.download).toBe('tcc-final.docx')
    expect(anchor.href).toBe('blob:http://localhost/docx-1')
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/docx-1')

    createElementSpy.mockRestore()
    clickSpy.mockRestore()
  })

  it('mostra erro amigável quando o download falha', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      blob: async () => new Blob(),
    })

    await expect(
      downloadExportArtifact('http://localhost:8080/downloads/tcc-final.docx', 'tcc-final.docx'),
    ).rejects.toThrow('Não foi possível baixar o arquivo DOCX. Tente novamente em instantes.')
  })

  it('baixa o PDF autenticado usando o endpoint real', async () => {
    const blob = new Blob(['pdf-content'], { type: 'application/pdf' })
    const originalCreateElement = document.createElement.bind(document)
    const anchor = originalCreateElement('a')
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return anchor
      }

      return originalCreateElement(tagName)
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })
    createObjectURLMock.mockReturnValue('blob:http://localhost/pdf-1')

    await downloadPdfExportArtifact('project-1', 'Projeto ativo.pdf')

    expect(fetchMock).toHaveBeenCalledWith('/projects/project-1/export/pdf', {
      headers: {
        Authorization: 'Bearer jwt-token-123',
      },
    })
    expect(createObjectURLMock).toHaveBeenCalledWith(blob)
    expect(anchor.download).toBe('Projeto ativo.pdf')
    expect(anchor.href).toBe('blob:http://localhost/pdf-1')
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/pdf-1')

    createElementSpy.mockRestore()
    clickSpy.mockRestore()
  })

  it('mostra erro amigável quando o backend retorna 502 no PDF', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => '',
    })

    await expect(downloadPdfExportArtifact('project-1', 'Projeto ativo.pdf')).rejects.toThrow(
      'Falha ao converter documento para PDF.',
    )
  })

  it('usa a mensagem do backend quando o PDF retorna 400', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'Preencha os metadados obrigatórios.' }),
    })

    await expect(downloadPdfExportArtifact('project-1', 'Projeto ativo.pdf')).rejects.toThrow(
      'Preencha os metadados obrigatórios.',
    )
  })
})
