import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Presentation, Settings2 } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { exportStatusQuery } from '@/features/export/services/export.service'
import { projectDetailsQuery } from '@/features/projects/services/projects.service'
import { getActiveProjectId, setActiveProjectId } from '@/shared/services/active-project.service'
import { downloadExportArtifact, downloadPdfExportArtifact, generateExportArtifact } from '@/shared/services/export.service'
import { getAcademicTemplateLabel } from '@/shared/services/project.service'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { ProgressBar } from '@/shared/components/data-display/progress-bar'
import { SectionCard } from '@/shared/components/data-display/section-card'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { Button } from '@/shared/ui/button'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { Switch } from '@/shared/ui/switch'

const formats = [
  ['docx', 'DOCX', 'Documento editável'],
  ['pdf', 'PDF', 'Documento final formatado'],
  ['slides', 'Slides', 'Apresentação de defesa'],
] as const

const pendingSections = [
  {
    key: 'metadata',
    title: 'Metadata acadêmica',
    description: 'Dados institucionais e de identificação do trabalho.',
  },
  {
    key: 'abstract',
    title: 'Resumo',
    description: 'Resumo em português e abstract em inglês.',
  },
  {
    key: 'chapters',
    title: 'Capítulos',
    description: 'Estrutura textual e conteúdo mínimo do trabalho.',
  },
  {
    key: 'references',
    title: 'Referências',
    description: 'Base bibliográfica e citações vinculadas ao texto.',
  },
  {
    key: 'other',
    title: 'Outras pendências',
    description: 'Itens adicionais retornados pela validação de exportação.',
  },
] as const

type PendingSectionKey = (typeof pendingSections)[number]['key']

function classifyPendingItem(item: string): PendingSectionKey {
  const normalizedItem = item
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

  if (
    /(titulo|title|subtitle|subtitulo|orientador|advisor|academic degree|grau|defense city|cidade da defesa|defense year|ano da defesa|keyword|palavra-chave|institution|instituicao|course|curso)/.test(normalizedItem)
  ) {
    return 'metadata'
  }

  if (/(abstract|resumo)/.test(normalizedItem)) {
    return 'abstract'
  }

  if (/(chapter|capitulo|introducao|metodologia|conclusao|fundamentacao|resultado|conteudo)/.test(normalizedItem)) {
    return 'chapters'
  }

  if (/(reference|referencia|citacao|citation|bibliograf)/.test(normalizedItem)) {
    return 'references'
  }

  return 'other'
}

function buildDownloadFileName(title: string, extension: 'docx' | 'pdf') {
  const normalizedTitle = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const baseName = normalizedTitle && normalizedTitle !== 'Projeto sem título' ? normalizedTitle : 'TCC'
  return `${baseName}.${extension}`
}

export function ExportPage() {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>()
  const [searchParams] = useSearchParams()
  const requestedFormat = searchParams.get('format')
  const [format, setFormat] = useState<'docx' | 'pdf' | 'slides'>(
    requestedFormat === 'pdf' || requestedFormat === 'slides' ? requestedFormat : 'docx',
  )
  const [options, setOptions] = useState({
    toc: true,
    references: true,
    appendix: false,
  })
  const [exporting, setExporting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [downloadInfo, setDownloadInfo] = useState<{ fileName: string; downloadUrl: string } | null>(null)
  const [downloadSuccess, setDownloadSuccess] = useState('')
  const [pdfDownloadSuccess, setPdfDownloadSuccess] = useState('')
  const [exportError, setExportError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [pdfDownloadError, setPdfDownloadError] = useState('')
  const activeProjectId = routeProjectId ?? getActiveProjectId() ?? undefined

  useEffect(() => {
    if (routeProjectId) {
      setActiveProjectId(routeProjectId)
    }
  }, [routeProjectId])

  useEffect(() => {
    if (requestedFormat === 'pdf' || requestedFormat === 'slides' || requestedFormat === 'docx') {
      setFormat(requestedFormat)
    }
  }, [requestedFormat])

  const projectDetails = useQuery({
    ...projectDetailsQuery(activeProjectId ?? ''),
    enabled: Boolean(activeProjectId),
  })
  const { data, isLoading, isError, refetch } = useQuery({
    ...exportStatusQuery(activeProjectId, format),
    enabled: Boolean(activeProjectId),
  })

  if (!activeProjectId) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Delivery" title="Exportação" description="Validação final do trabalho antes da geração do arquivo." />
        <EmptyState
          icon={FileText}
          title="Selecione um projeto para exportar"
          description="Crie um novo TCC ou abra um projeto existente para liberar a validação e a geração do arquivo final."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild className="rounded-2xl">
                <Link to="/projects/new">Criar projeto</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl">
                <Link to="/projects">Selecionar projeto</Link>
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError) {
    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  if (!data) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Delivery" title="Exportação" description="Validação final do trabalho antes da geração do arquivo." />
        <EmptyState
          icon={FileText}
          title="Nenhum dado de exportação disponível"
          description="Abra um projeto válido para verificar pendências e gerar o artefato final."
          action={
            <Button asChild className="rounded-2xl">
              <Link to="/projects">Ver projetos</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const canExport = data.ready && data.pendingItems.length === 0
  const canGenerateDocx = canExport
  const canGeneratePdf = canExport
  const appliedTemplateLabel = getAcademicTemplateLabel(projectDetails.data?.project.templateProfile)
  const projectTitle = projectDetails.data?.project.title ?? 'Projeto sem título'
  const projectStatus = (projectDetails.data?.project.status ?? 'planning') as keyof typeof statusLabel
  const projectUpdatedAt = projectDetails.data?.project.updatedAt
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(projectDetails.data.project.updatedAt)
    : 'Não disponível'
  const statusLabel = {
    planning: 'Planejamento',
    writing: 'Em escrita',
    review: 'Em revisão',
    defense: 'Defesa',
    completed: 'Concluído',
  } as const
  const groupedPendingItems = pendingSections
    .map((section) => ({
      ...section,
      items: data.pendingItems.filter((item) => classifyPendingItem(item) === section.key),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Delivery"
        title="Exportação"
        description="Validação final do trabalho com geração real de DOCX quando o projeto estiver pronto."
      />

      <SectionCard title="Projeto em exportação" description="Confirme o contexto antes de gerar o arquivo final.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Exportando projeto</p>
            <p className="mt-2 text-base font-semibold text-foreground">{projectTitle}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Modelo acadêmico</p>
            <p className="mt-2 text-base font-semibold text-foreground">{appliedTemplateLabel}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
            <p className="mt-2 text-base font-semibold text-foreground">{statusLabel[projectStatus]}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Última atualização</p>
            <p className="mt-2 text-base font-semibold text-foreground">{projectUpdatedAt}</p>
          </div>
        </div>
        <div className="mt-4 rounded-[22px] border border-primary/15 bg-primary/5 px-4 py-4">
          <p className="text-sm font-medium text-foreground">Você está exportando o projeto {projectTitle}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">O arquivo será gerado com o modelo {appliedTemplateLabel} aplicado a este projeto.</p>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SectionCard title="Formato de exportação" description="Escolha a saída principal do material.">
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as 'docx' | 'pdf' | 'slides')} className="grid gap-4">
              {formats.map(([value, title, description]) => (
                <label key={value} className="flex items-center gap-4 rounded-[24px] border border-border bg-white/70 px-4 py-4">
                  <RadioGroupItem value={value} />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <StatusBadge label={value === format ? 'Selecionado' : 'Disponível'} tone={value === format ? 'primary' : 'neutral'} />
                </label>
              ))}
            </RadioGroup>
          </SectionCard>

          <SectionCard title="Opções adicionais" description="Configurações que futuramente podem compor payloads de exportação.">
            <div className="space-y-5">
              {[
                ['toc', 'Sumário automático'],
                ['references', 'Lista de referências'],
                ['appendix', 'Apêndices'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">Inclui esta seção no documento final.</p>
                  </div>
                  <Switch
                    checked={options[key as keyof typeof options]}
                    onCheckedChange={(checked) => setOptions((current) => ({ ...current, [key]: checked }))}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Checklist ABNT" description="Antes de exportar, valide os principais marcos.">
            <div className="space-y-4">
              <ProgressBar value={data.progress} label="Conformidade geral" helper={`${data.progress}%`} />
              {[
                {
                  label: 'Capítulos consolidados',
                  ok: data.chapterCoverage.completed >= Math.max(1, data.chapterCoverage.total - 2),
                },
                {
                  label: 'Referências consistentes',
                  ok: data.referenceCoverage.cited === data.referenceCoverage.total,
                },
                {
                  label: 'Pendências críticas resolvidas',
                  ok: data.pendingItems.length === 0,
                },
                {
                  label: 'Formato pronto para exportação',
                  ok: data.ready,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-white/70 px-4 py-4">
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <StatusBadge label={item.ok ? 'Ok' : 'Pendente'} tone={item.ok ? 'success' : 'warning'} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Ação final" description="DOCX e PDF ficam disponíveis como formatos de download direto.">
            <div className="space-y-3">
              <div className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
                <div className="flex items-center gap-3">
                  {format === 'slides' ? <Presentation className="h-5 w-5 text-primary" /> : format === 'pdf' ? <FileText className="h-5 w-5 text-primary" /> : <Settings2 className="h-5 w-5 text-primary" />}
                  <p className="font-medium text-foreground">Arquivo selecionado: {format.toUpperCase()}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Exportando com modelo {appliedTemplateLabel}</p>
              </div>
              {data.pendingItems.length > 0 ? (
                <div className="rounded-[22px] border border-amber-100 bg-amber-50/70 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Pendências atuais</p>
                  <div className="mt-3 space-y-4">
                    {groupedPendingItems.map((section) => (
                      <div key={section.key} className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{section.title}</p>
                          <p className="text-sm leading-6 text-muted-foreground">{section.description}</p>
                        </div>
                        <div className="space-y-2">
                          {section.items.map((item) => (
                            <p key={`${section.key}-${item}`} className="text-sm leading-6 text-muted-foreground">{item}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {!canExport ? (
                <div className="rounded-[22px] border border-border bg-muted/30 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Exportação bloqueada</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Resolva as pendências do checklist acima para liberar a geração do arquivo final.
                  </p>
                </div>
              ) : null}
              {canExport && format === 'slides' ? (
                <div className="rounded-[22px] border border-border bg-muted/30 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Formato ainda não liberado</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    O download real está disponível para DOCX e PDF. Slides permanecem fora desta integração por enquanto.
                  </p>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-border bg-white/75 px-4 py-4">
                  <p className="text-sm font-semibold text-foreground">Exportar DOCX</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Formato editável para Word.</p>
                  <Button
                    className="mt-4 w-full rounded-2xl"
                    disabled={exporting || !canGenerateDocx}
                    onClick={async () => {
                      if (!canGenerateDocx) return
                      setFormat('docx')
                      setExportError('')
                      setDownloadError('')
                      setDownloadSuccess('')
                      setPdfDownloadError('')
                      setPdfDownloadSuccess('')
                      setExporting(true)
                      setDownloadInfo(null)

                      try {
                        const artifact = await generateExportArtifact(activeProjectId, 'docx')
                        if (artifact) {
                          setDownloadInfo({
                            fileName: artifact.fileName,
                            downloadUrl: artifact.downloadUrl,
                          })
                        } else {
                          setExportError('Nenhum arquivo foi retornado para este projeto.')
                        }
                      } catch (error) {
                        setExportError(error instanceof Error ? error.message : 'Tente novamente em instantes.')
                      } finally {
                        setExporting(false)
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    {exporting ? 'Exportando DOCX...' : 'Exportar DOCX'}
                  </Button>
                </div>
                <div className="rounded-[24px] border border-border bg-white/75 px-4 py-4">
                  <p className="text-sm font-semibold text-foreground">Exportar PDF</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Formato pronto para impressão e envio.</p>
                  <Button
                    className="mt-4 w-full rounded-2xl"
                    disabled={pdfDownloading || !canGeneratePdf}
                    onClick={async () => {
                      if (!canGeneratePdf || !activeProjectId) return
                      setFormat('pdf')
                      setPdfDownloadError('')
                      setPdfDownloadSuccess('')
                      setExportError('')
                      setDownloadError('')
                      setDownloadSuccess('')
                      setPdfDownloading(true)

                      try {
                        await downloadPdfExportArtifact(activeProjectId, buildDownloadFileName(projectTitle, 'pdf'))
                        setPdfDownloadSuccess(`O download de ${buildDownloadFileName(projectTitle, 'pdf')} foi iniciado com sucesso.`)
                      } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Não foi possível gerar o PDF. Tente novamente em instantes.'
                        setPdfDownloadError(errorMessage)
                      } finally {
                        setPdfDownloading(false)
                      }
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    {pdfDownloading ? 'Exportando PDF...' : 'Exportar PDF'}
                  </Button>
                </div>
              </div>
              {exporting ? (
                <div className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Gerando DOCX...</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Validando o projeto e preparando o arquivo final para download.
                  </p>
                </div>
              ) : null}
              {downloading ? (
                <div className="rounded-[22px] border border-border bg-white/70 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Baixando DOCX...</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Preparando o arquivo autenticado para salvar no seu dispositivo.
                  </p>
                </div>
              ) : null}
              {downloadInfo ? (
                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Arquivo pronto para download</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    O backend retornou o DOCX. Use a ação abaixo para baixar o arquivo com autenticação da sua sessão.
                  </p>
                </div>
              ) : null}
              {downloadSuccess ? (
                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Download iniciado</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{downloadSuccess}</p>
                </div>
              ) : null}
              {pdfDownloadSuccess ? (
                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Download iniciado</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{pdfDownloadSuccess}</p>
                </div>
              ) : null}
              {downloadInfo ? (
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  disabled={downloading}
                  onClick={async () => {
                    setDownloadError('')
                    setDownloadSuccess('')
                    setDownloading(true)

                    try {
                      await downloadExportArtifact(downloadInfo.downloadUrl, downloadInfo.fileName)
                      setDownloadSuccess(`O download de ${downloadInfo.fileName} foi iniciado com sucesso.`)
                    } catch (error) {
                      setDownloadError(
                        error instanceof Error
                          ? error.message
                          : 'Não foi possível baixar o arquivo DOCX. Tente novamente em instantes.',
                      )
                    } finally {
                      setDownloading(false)
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  {downloading ? 'Baixando DOCX...' : 'Baixar DOCX'}
                </Button>
              ) : null}
              {pdfDownloadError ? (
                <div className="rounded-[22px] border border-rose-100 bg-rose-50/70 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Não foi possível baixar o PDF</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{pdfDownloadError}</p>
                </div>
              ) : null}
              {downloadError ? (
                <div className="rounded-[22px] border border-rose-100 bg-rose-50/70 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Não foi possível baixar o DOCX</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{downloadError}</p>
                </div>
              ) : null}
              {exportError ? (
                <div className="rounded-[22px] border border-rose-100 bg-rose-50/70 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Não foi possível gerar a exportação</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{exportError}</p>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
