import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, BookOpen, Copy, Link2, Pencil, Plus, Quote, Trash2 } from 'lucide-react'
import { referencesQuery } from '@/features/references/services/references.service'
import { getActiveProjectId } from '@/shared/services/active-project.service'
import { getChapters } from '@/shared/services/chapter.service'
import { createReference, deleteReference, updateReference } from '@/shared/services/reference.service'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { SearchInput } from '@/shared/components/forms/search-input'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

export function ReferencesPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<{ referenceId: string; tone: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState({
    title: '',
    type: 'article',
    authors: '',
    year: '',
    chapterId: 'none',
  })
  const queryClient = useQueryClient()
  const activeProjectId = getActiveProjectId() ?? undefined
  const { data, isLoading, isError, refetch } = useQuery(referencesQuery(activeProjectId))
  const { data: chapters } = useQuery({
    queryKey: ['chapters', activeProjectId],
    queryFn: () => getChapters(activeProjectId),
    enabled: Boolean(activeProjectId),
  })

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((item) => {
      const matchText = `${item.title} ${item.authors.join(' ')}`.toLowerCase().includes(search.toLowerCase())
      const matchType = type === 'all' || item.type === type
      return matchText && matchType
    })
  }, [data, search, type])

  async function invalidateReferenceQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['references'] }),
      queryClient.invalidateQueries({ queryKey: ['export-status'] }),
      queryClient.invalidateQueries({ queryKey: ['project-details', activeProjectId] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }

  async function handleCopyAbnt(referenceId: string, abntFormatted?: string) {
    if (!abntFormatted) return

    try {
      await navigator.clipboard.writeText(abntFormatted)
      setCopyFeedback({
        referenceId,
        tone: 'success',
        message: 'Referência copiada para a área de transferência.',
      })
    } catch {
      setCopyFeedback({
        referenceId,
        tone: 'error',
        message: 'Não foi possível copiar a referência agora.',
      })
    }
  }

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError || !data) {
    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Bibliografia"
        title="Referências"
        description="Base centralizada para fontes acadêmicas, associação com capítulos e formatação ABNT."
        action={
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) {
                setEditingId(null)
                setForm({ title: '', type: 'article', authors: '', year: '', chapterId: 'none' })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="rounded-2xl"
                onClick={() => {
                  setEditingId(null)
                  setForm({ title: '', type: 'article', authors: '', year: '', chapterId: 'none' })
                  setDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Nova referência
              </Button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar referência' : 'Adicionar referência'}</DialogTitle>
                <DialogDescription>Cadastre, ajuste e associe referências ao projeto e aos capítulos.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Título da obra" />
                </div>
                <div className="space-y-2">
                  <Label>Autores</Label>
                  <Input value={form.authors} onChange={(event) => setForm((current) => ({ ...current, authors: event.target.value }))} placeholder="Sobrenome, Nome; Sobrenome, Nome" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">Artigo</SelectItem>
                      <SelectItem value="book">Livro</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} placeholder="2024" />
                </div>
                <div className="space-y-2">
                  <Label>Capítulo associado</Label>
                  <Select value={form.chapterId} onValueChange={(value) => setForm((current) => ({ ...current, chapterId: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem capítulo</SelectItem>
                      {chapters?.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>{chapter.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => {
                    setDialogOpen(false)
                    setEditingId(null)
                  }}>Cancelar</Button>
                  <Button
                    onClick={async () => {
                      const payload = {
                        title: form.title,
                        authors: form.authors.split(';').map((item) => item.trim()).filter(Boolean),
                        type: form.type as 'article' | 'book' | 'website',
                        year: Number(form.year || new Date().getFullYear()),
                        chapterId: form.chapterId === 'none' ? undefined : form.chapterId,
                      }

                      if (editingId) {
                        await updateReference(editingId, payload)
                      } else {
                        await createReference(payload, activeProjectId)
                      }

                      await invalidateReferenceQueries()

                      setForm({ title: '', type: 'article', authors: '', year: '', chapterId: 'none' })
                      setEditingId(null)
                      setDialogOpen(false)
                    }}
                  >
                    {editingId ? 'Atualizar referência' : 'Salvar referência'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="max-w-xl flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por título ou autor..." />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full rounded-2xl bg-white/80 lg:w-[220px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="article">Artigos</SelectItem>
            <SelectItem value="book">Livros</SelectItem>
            <SelectItem value="website">Websites</SelectItem>
            <SelectItem value="dissertation">Dissertações</SelectItem>
            <SelectItem value="thesis">Teses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-card rounded-[26px] border-amber-100 bg-amber-50/70">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="font-medium text-foreground">Referência sem citação</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Há obras cadastradas que ainda não aparecem no texto corrido.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-card rounded-[26px] border-sky-100 bg-sky-50/70">
          <CardContent className="flex items-start gap-3 pt-6">
            <Quote className="mt-0.5 h-5 w-5 text-sky-700" />
            <div>
              <p className="font-medium text-foreground">Citação sem referência</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Estruture um fluxo para validar trechos citados e sua origem bibliográfica.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhuma referência encontrada" description="Ajuste o filtro ou crie um novo item bibliográfico." />
      ) : (
        <div className="space-y-4">
          {filtered.map((reference) => (
            <Card key={reference.id} className="surface-card rounded-[30px]">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusBadge label={reference.type.toUpperCase()} tone="info" />
                  {reference.hasCitation ? (
                    <StatusBadge label="Citado" tone="success" />
                  ) : (
                    <StatusBadge label="Sem citação" tone="warning" />
                  )}
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl leading-8">{reference.title}</CardTitle>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {reference.authors.join('; ')} ({reference.year})
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(250,249,246,1),rgba(245,243,239,0.8))] px-5 py-5">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Formato ABNT</p>
                  <p className="mt-3 text-sm leading-7 text-foreground/82">{reference.abntFormatted}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    disabled={!reference.abntFormatted}
                    onClick={() => void handleCopyAbnt(reference.id, reference.abntFormatted)}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar ABNT
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => {
                      setEditingId(reference.id)
                      setForm({
                        title: reference.title,
                        type: reference.type,
                        authors: reference.authors.join('; '),
                        year: String(reference.year),
                        chapterId: reference.primaryChapterId ?? 'none',
                      })
                      setDialogOpen(true)
                    }}
                  >
                    <Link2 className="h-4 w-4" />
                    Associar a capítulo
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => {
                      setEditingId(reference.id)
                      setForm({
                        title: reference.title,
                        type: reference.type,
                        authors: reference.authors.join('; '),
                        year: String(reference.year),
                        chapterId: reference.primaryChapterId ?? 'none',
                      })
                      setDialogOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={async () => {
                      await deleteReference(reference.id)
                      await invalidateReferenceQueries()
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={async () => {
                      await updateReference(reference.id, {
                        title: reference.title,
                        authors: reference.authors,
                        type: reference.type,
                        year: reference.year,
                        journal: reference.journal,
                        publisher: reference.publisher,
                        chapterId: reference.primaryChapterId,
                        hasCitation: !reference.hasCitation,
                      })
                      await invalidateReferenceQueries()
                    }}
                  >
                    {reference.hasCitation ? <Quote className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {reference.hasCitation ? 'Desmarcar citação' : 'Marcar como citado'}
                  </Button>
                </div>
                {copyFeedback?.referenceId === reference.id ? (
                  <p className={`text-sm ${copyFeedback.tone === 'success' ? 'text-emerald-700' : 'text-destructive'}`}>
                    {copyFeedback.message}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
