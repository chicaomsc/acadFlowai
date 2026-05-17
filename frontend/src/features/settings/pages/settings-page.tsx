import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Palette, Save, Sparkles, User2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { projectsQuery } from '@/features/projects/services/projects.service'
import { settingsQuery, updateCurrentUser } from '@/features/settings/services/settings.service'
import {
  clearActiveProjectId,
  getStoredActiveProjectId,
  resolveValidActiveProjectId,
  setActiveProjectId,
} from '@/shared/services/active-project.service'
import { useAppShellStore } from '@/shared/services/app-store'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const setCurrentUser = useAppShellStore((state) => state.setCurrentUser)
  const { data, isLoading, isError, refetch } = useQuery(settingsQuery)
  const {
    data: projects = [],
    isLoading: projectsLoading,
    isError: projectsError,
  } = useQuery(projectsQuery)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const activeProjectId = useMemo(
    () => resolveValidActiveProjectId(projects.map((project) => project.id), getStoredActiveProjectId()),
    [projects],
  )
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  )

  useEffect(() => {
    if (data) {
      setName(data.name)
    }
  }, [data])

  useEffect(() => {
    if (projectsLoading || projectsError) return

    if (activeProjectId) {
      setActiveProjectId(activeProjectId)
      return
    }

    clearActiveProjectId()
  }, [activeProjectId, projectsError, projectsLoading])

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError || !data) {
    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  async function handleSave() {
    if (saving) return

    setSaving(true)
    setFeedback(null)

    try {
      const user = await updateCurrentUser({ name })
      setCurrentUser(user)
      await queryClient.invalidateQueries({ queryKey: ['settings-user'] })
      setFeedback({ tone: 'success', message: 'Perfil atualizado com sucesso.' })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível salvar suas configurações.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Preferences"
        title="Configurações"
        description="Gerencie seu perfil, consulte os dados acadêmicos do projeto ativo e ajuste preferências da experiência."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl md:grid-cols-4">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="academic">Acadêmico</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
          <TabsTrigger value="plan">Plano</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="surface-card-strong space-y-5 rounded-[28px] p-6">
          <Section icon={User2} title="Informações pessoais">
            <Field
              label="Nome completo"
              value={name}
              onChange={setName}
            />
            <Field
              label="E-mail"
              value={data.email}
              disabled
              helper="O e-mail vem da sua conta e não pode ser alterado nesta tela."
            />
          </Section>
        </TabsContent>

        <TabsContent value="academic" className="surface-card-strong space-y-5 rounded-[28px] p-6">
          <Section icon={Building2} title="Dados acadêmicos">
            <Field
              label="Instituição"
              value={activeProject?.institution ?? ''}
              disabled
              helper={activeProject
                ? 'A instituição pertence ao projeto ativo. Edite esse dado na tela do projeto.'
                : 'Crie ou selecione um projeto para preencher dados acadêmicos.'}
            />
            <Field
              label="Curso"
              value={activeProject?.course ?? ''}
              disabled
              helper={activeProject
                ? 'O curso pertence ao projeto ativo. Edite esse dado na tela do projeto.'
                : 'Crie ou selecione um projeto para preencher dados acadêmicos.'}
            />
            <Field
              label="Grau acadêmico"
              value={activeProject?.academicDegree ?? ''}
              disabled
              helper={activeProject
                ? 'Esse campo pertence ao projeto ativo e pode ser ajustado na tela do projeto.'
                : 'Crie ou selecione um projeto para definir o grau acadêmico.'}
            />
            <Field
              label="Cidade da defesa"
              value={activeProject?.defenseCity ?? ''}
              disabled
              helper={activeProject
                ? 'A cidade da defesa é mantida no projeto ativo.'
                : 'Crie ou selecione um projeto para definir a cidade da defesa.'}
            />
            <Field
              label="Ano da defesa"
              value={activeProject?.defenseYear ? String(activeProject.defenseYear) : ''}
              disabled
              helper={activeProject
                ? 'O ano da defesa é mantido no projeto ativo.'
                : 'Crie ou selecione um projeto para definir o ano da defesa.'}
            />
            <div className="space-y-2">
              <Label>Norma padrão</Label>
              <Select value={activeProject?.norm ?? 'ABNT'} disabled>
                <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABNT">ABNT</SelectItem>
                  <SelectItem value="APA">APA</SelectItem>
                  <SelectItem value="Vancouver">Vancouver</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                A norma também pertence ao projeto ativo. {activeProject ? 'Edite no projeto para refletir no editor e exportação.' : 'Nenhum projeto ativo selecionado.'}
              </p>
            </div>
            <Field
              label="Subtítulo"
              value={activeProject?.subtitle ?? ''}
              disabled
              helper={activeProject
                ? 'O subtítulo do trabalho é lido do projeto ativo.'
                : 'Crie ou selecione um projeto para preencher o subtítulo.'}
            />
            <Field
              label="Palavras-chave"
              value={activeProject?.keywords?.join(', ') ?? ''}
              disabled
              helper={activeProject
                ? 'As palavras-chave são exibidas aqui apenas para consulta rápida.'
                : 'Crie ou selecione um projeto para definir palavras-chave.'}
            />
            <div className="md:col-span-2">
              <Button asChild variant="outline" className="rounded-2xl">
                <Link to={activeProject ? `/projects/${activeProject.id}` : '/projects/new'}>
                  {activeProject ? 'Abrir projeto ativo' : 'Criar projeto'}
                </Link>
              </Button>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="preferences" className="surface-card-strong space-y-5 rounded-[28px] p-6">
          <Section icon={Palette} title="Tema e comportamento">
            <div className="space-y-2">
              <Label>Tema visual</Label>
              <Select defaultValue="light">
                <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow title="Sugestões automáticas de IA" description="Receber indicações enquanto escreve." />
            <ToggleRow title="Salvamento automático" description="Persistir rascunhos automaticamente quando houver backend." defaultChecked />
          </Section>
        </TabsContent>

        <TabsContent value="plan" className="surface-card-strong space-y-5 rounded-[28px] p-6">
          <Section icon={Sparkles} title="Plano atual">
            <div className="rounded-[24px] border border-primary/15 bg-primary/5 px-4 py-4">
              <p className="font-medium text-foreground">Pro Aluno</p>
              <p className="mt-1 text-sm text-muted-foreground">IA ilimitada, leitor de PDFs e exportação completa.</p>
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col items-end gap-3">
        {feedback ? (
          <p className={feedback.tone === 'success' ? 'text-sm text-primary' : 'text-sm text-destructive'}>
            {feedback.message}
          </p>
        ) : null}
        <Button className="rounded-2xl" onClick={() => void handleSave()} disabled={saving || !name.trim() || name.trim() === data.name.trim()}>
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User2
  title: string
  children: ReactNode
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  helper,
  disabled = false,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  helper?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        disabled={disabled}
        readOnly={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-12 rounded-2xl"
      />
      {helper ? <p className="text-sm text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

function ToggleRow({
  title,
  description,
  defaultChecked = false,
}: {
  title: string
  description: string
  defaultChecked?: boolean
}) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-border bg-white/70 px-4 py-4">
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  )
}
