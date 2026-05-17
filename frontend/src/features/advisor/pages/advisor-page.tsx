import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock3, FileClock, MessageSquareText, Send } from 'lucide-react'
import { advisorQuery } from '@/features/advisor/services/advisor.service'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { StatCard } from '@/shared/components/data-display/stat-card'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Textarea } from '@/shared/ui/textarea'

export function AdvisorPage() {
  const { data, isLoading, isError, refetch } = useQuery(advisorQuery)

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError || !data) {
    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  const pending = data.comments.filter((comment) => !comment.resolved)
  const resolved = data.comments.filter((comment) => comment.resolved)

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Guidance"
        title="Área do orientador"
        description="Comentários, capítulos em revisão e histórico de versões em uma superfície separada da escrita."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Pendentes" value={pending.length} helper="Comentários aguardando resposta" icon={Clock3} />
        <StatCard title="Resolvidos" value={resolved.length} helper="Itens já fechados" icon={CheckCircle2} />
        <StatCard title="Capítulos em revisão" value={data.chapters.filter((chapter) => chapter.status === 'review').length} helper="Seções ainda em ajuste" icon={MessageSquareText} />
      </div>

      <Tabs defaultValue="pending" className="space-y-5">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl">
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pending.map((comment) => (
            <Card key={comment.id} className="surface-card rounded-[28px]">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{comment.advisorName}</p>
                    <p className="text-sm text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <StatusBadge label="Pendente" tone="warning" />
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{comment.content}</p>
                <Textarea className="min-h-[110px] rounded-[24px]" placeholder="Responder ao comentário..." />
                <div className="flex justify-end">
                  <Button className="rounded-2xl">
                    <Send className="h-4 w-4" />
                    Enviar resposta
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          {resolved.length === 0 ? (
            <Card className="surface-card rounded-[28px]">
              <CardContent className="pt-6 text-sm text-muted-foreground">Nenhum comentário resolvido ainda.</CardContent>
            </Card>
          ) : (
            resolved.map((comment) => (
              <Card key={comment.id} className="surface-card rounded-[28px]">
                <CardContent className="pt-6">
                  <p className="font-medium text-foreground">{comment.advisorName}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{comment.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {['Introdução v3', 'Fundamentação v1', 'Metodologia v1'].map((item) => (
            <Card key={item} className="surface-card rounded-[28px]">
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileClock className="h-4 w-4" />
                  </div>
                  <p className="font-medium text-foreground">{item}</p>
                </div>
                <StatusBadge label="Em trilha" tone="info" />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
