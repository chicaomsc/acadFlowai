import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpenCheck, FileText, Quote, Upload } from 'lucide-react'
import { pdfReaderQuery } from '@/features/pdf-reader/services/pdf-reader.service'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

export function PdfReaderPage() {
  const { data, isLoading, isError, refetch } = useQuery(pdfReaderQuery)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError || !data) {
    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  const selected = data.documents.find((document) => document.id === selectedId) ?? data.selectedDocument

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Reading room"
        title="Leitor de PDFs"
        description="Upload visual mockado e análise acadêmica de artigos para acelerar revisão bibliográfica."
        action={
          <Button className="rounded-2xl">
            <Upload className="h-4 w-4" />
            Enviar PDF
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Card className="surface-card rounded-[26px]">
            <CardContent className="pt-6">
              <div className="rounded-[22px] border border-dashed border-border bg-muted/25 px-4 py-6 text-center">
                <Upload className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-3 font-medium text-foreground">Upload visual mockado</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Arraste um PDF ou utilize o botão superior para simular a ingestão.
                </p>
              </div>
            </CardContent>
          </Card>
          {data.documents.map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => document.status === 'completed' && setSelectedId(document.id)}
              className={`w-full rounded-[24px] border px-4 py-4 text-left ${
                selected?.id === document.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-white/80'
              }`}
            >
              <p className="font-medium text-foreground">{document.fileName}</p>
              <div className="mt-3">
                <StatusBadge
                  label={document.status === 'completed' ? 'Concluído' : document.status === 'processing' ? 'Processando' : 'Enviando'}
                  tone={document.status === 'completed' ? 'success' : 'primary'}
                />
              </div>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="grid gap-6">
            <Card className="surface-card-strong rounded-[30px]">
              <CardHeader>
                <CardTitle>{selected.fileName}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <InfoCard title="Resumo" content={selected.summary ?? ''} icon={FileText} />
                  <InfoCard title="Objetivo" content={selected.objective ?? ''} icon={BookOpenCheck} />
                </div>
                <InfoCard title="Metodologia" content={selected.methodology ?? ''} icon={BookOpenCheck} />
                <InfoCard title="Principais resultados" content={selected.mainResults ?? ''} icon={BookOpenCheck} />
                <div className="grid gap-3">
                  {selected.usefulCitations?.map((citation) => (
                    <div key={citation} className="rounded-[22px] border border-border bg-muted/35 px-4 py-4">
                      <div className="flex gap-3">
                        <Quote className="mt-1 h-4 w-4 text-primary" />
                        <p className="text-sm leading-6 text-muted-foreground">{citation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <EmptyState icon={FileText} title="Selecione um documento" description="Escolha um item da lateral ou envie um PDF para iniciar a leitura." />
        )}
      </div>
    </div>
  )
}

function InfoCard({
  title,
  content,
  icon: Icon,
}: {
  title: string
  content: string
  icon: typeof BookOpenCheck
}) {
  return (
    <Card className="rounded-[24px] border-border/80 bg-muted/20">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-7 text-muted-foreground">{content}</p>
      </CardContent>
    </Card>
  )
}
