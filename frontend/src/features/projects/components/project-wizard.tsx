import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { createProject } from '@/features/projects/services/projects.service'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const courses = ['Administração', 'Ciência da Computação', 'Direito', 'Enfermagem', 'Engenharia Civil', 'Medicina']
const norms = ['ABNT', 'APA', 'Vancouver']

export function ProjectWizard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [generating, setGenerating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    course: '',
    institution: '',
    academicDegree: '',
    advisorName: '',
    deadline: '',
    norm: 'ABNT',
    defenseCity: '',
    defenseYear: '',
    theme: '',
    researchProblem: '',
    generalObjective: '',
    specificObjectives: ['', '', ''],
    keywords: '',
  })

  async function fillByAi(field: 'theme' | 'problem' | 'objectives') {
    setGenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    if (field === 'theme') {
      setForm((current) => ({
        ...current,
        theme: 'Sistemas de tutoria inteligente para personalização do ensino superior brasileiro.',
      }))
    }
    if (field === 'problem') {
      setForm((current) => ({
        ...current,
        researchProblem:
          'Como ferramentas de IA podem apoiar a personalização do ensino em cursos de graduação com restrições de tempo e recursos?',
      }))
    }
    if (field === 'objectives') {
      setForm((current) => ({
        ...current,
        generalObjective:
          'Analisar limites e oportunidades do uso de IA na personalização do processo de ensino-aprendizagem em universidades brasileiras.',
        specificObjectives: [
          'Mapear ferramentas de IA aplicadas à educação superior.',
          'Identificar barreiras de adoção institucional.',
          'Propor diretrizes para uso acadêmico responsável.',
        ],
      }))
    }
    setGenerating(false)
  }

  async function handleCreateProject() {
    if (creating) return

    setCreating(true)

    const payload = await createProject({
      title: form.title,
      subtitle: form.subtitle,
      course: form.course,
      institution: form.institution,
      academicDegree: form.academicDegree,
      advisorName: form.advisorName,
      deadline: form.deadline,
      norm: form.norm as 'ABNT' | 'APA' | 'Vancouver',
      defenseCity: form.defenseCity,
      defenseYear: form.defenseYear ? Number(form.defenseYear) : undefined,
      theme: form.theme,
      researchProblem: form.researchProblem,
      generalObjective: form.generalObjective,
      specificObjectives: form.specificObjectives,
      keywords: form.keywords.split(/;\s*|,\s*/).map((item) => item.trim()).filter(Boolean),
    })

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['references'] }),
      queryClient.invalidateQueries({ queryKey: ['timeline'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] }),
      queryClient.invalidateQueries({ queryKey: ['export-status'] }),
    ])

    setCreating(false)
    navigate(`/projects/${payload.project.id}`)
  }

  return (
    <div className="space-y-8">
      <div className="surface-card rounded-[28px] p-6">
        <div className="space-y-6">
          <ProjectFormSection title="Identificação" description="Defina o nome do trabalho e o enquadramento acadêmico principal.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Título do TCC" className="md:col-span-2">
                <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex: Inteligência Artificial aplicada à educação" className="h-12 rounded-2xl" />
              </Field>
              <Field label="Subtítulo" className="md:col-span-2">
                <Input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} className="h-12 rounded-2xl" />
              </Field>
              <Field label="Norma acadêmica">
                <Select value={form.norm} onValueChange={(value) => setForm({ ...form, norm: value })}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {norms.map((norm) => (
                      <SelectItem key={norm} value={norm}>{norm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Grau acadêmico">
                <Input value={form.academicDegree} onChange={(event) => setForm({ ...form, academicDegree: event.target.value })} className="h-12 rounded-2xl" />
              </Field>
            </div>
          </ProjectFormSection>

          <ProjectFormSection title="Instituição e curso" description="Dados institucionais do contexto em que o TCC será defendido.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Curso">
                <Select value={form.course} onValueChange={(value) => setForm({ ...form, course: value })}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder="Selecione um curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course} value={course}>{course}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Instituição">
                <Input value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} className="h-12 rounded-2xl" />
              </Field>
            </div>
          </ProjectFormSection>

          <ProjectFormSection title="Defesa" description="Defina orientação, prazo e identificação formal da defesa.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Orientador" className="md:col-span-2">
                <Input value={form.advisorName} onChange={(event) => setForm({ ...form, advisorName: event.target.value })} className="h-12 rounded-2xl" />
              </Field>
              <Field label="Prazo">
                <Input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className="h-12 rounded-2xl" />
              </Field>
              <Field label="Cidade da defesa">
                <Input value={form.defenseCity} onChange={(event) => setForm({ ...form, defenseCity: event.target.value })} className="h-12 rounded-2xl" />
              </Field>
              <Field label="Ano da defesa">
                <Input type="number" min="1900" max="2999" value={form.defenseYear} onChange={(event) => setForm({ ...form, defenseYear: event.target.value })} className="h-12 rounded-2xl" />
              </Field>
            </div>
          </ProjectFormSection>

          <ProjectFormSection title="Pesquisa" description="Estruture o recorte do problema e o ponto de partida conceitual do estudo.">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Tema de pesquisa</Label>
                <Button variant="outline" onClick={() => void fillByAi('theme')} disabled={generating}>
                  <Sparkles className="h-4 w-4" />
                  Sugerir com IA
                </Button>
              </div>
              <Textarea value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value })} className="min-h-[160px] rounded-[24px]" />
              <div className="flex items-center justify-between">
                <Label>Problema de pesquisa</Label>
                <Button variant="outline" onClick={() => void fillByAi('problem')} disabled={generating}>
                  <Sparkles className="h-4 w-4" />
                  Refinar com IA
                </Button>
              </div>
              <Textarea value={form.researchProblem} onChange={(event) => setForm({ ...form, researchProblem: event.target.value })} className="min-h-[160px] rounded-[24px]" />
            </div>
          </ProjectFormSection>

          <ProjectFormSection title="Objetivos" description="Defina o objetivo geral e os desdobramentos específicos do TCC.">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Label>Objetivos</Label>
                <Button variant="outline" onClick={() => void fillByAi('objectives')} disabled={generating}>
                  <Sparkles className="h-4 w-4" />
                  Preencher com IA
                </Button>
              </div>
              <Textarea value={form.generalObjective} onChange={(event) => setForm({ ...form, generalObjective: event.target.value })} placeholder="Objetivo geral" className="min-h-[120px] rounded-[24px]" />
              <div className="grid gap-3">
                {form.specificObjectives.map((item, index) => (
                  <Input
                    key={`${index}-${item}`}
                    value={item}
                    onChange={(event) => {
                      const specificObjectives = [...form.specificObjectives]
                      specificObjectives[index] = event.target.value
                      setForm({ ...form, specificObjectives })
                    }}
                    placeholder={`Objetivo específico ${index + 1}`}
                    className="h-12 rounded-2xl"
                  />
                ))}
              </div>
            </div>
          </ProjectFormSection>

          <ProjectFormSection title="Metadata" description="Campos usados na identificação e exportação do projeto.">
            <div className="grid gap-5">
              <Field label="Palavras-chave">
                <Input value={form.keywords} onChange={(event) => setForm({ ...form, keywords: event.target.value })} className="h-12 rounded-2xl" placeholder="Ex: inteligência artificial; ensino superior" />
              </Field>
            </div>
          </ProjectFormSection>

          <ProjectFormSection title="Estrutura" description="A estrutura inicial será criada automaticamente a partir do briefing.">
            <div className="grid gap-3">
              {[
                '1. Introdução',
                '2. Fundamentação Teórica',
                '3. Metodologia',
                '4. Resultados e Discussão',
                '5. Conclusão',
                '6. Referências',
              ].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-[22px] border border-border bg-muted/35 px-4 py-4">
                  <span className="font-medium text-foreground">{item}</span>
                  <span className="text-sm text-muted-foreground">Gerado com base no briefing</span>
                </div>
              ))}
            </div>
          </ProjectFormSection>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button onClick={() => void handleCreateProject()} disabled={creating}>
          {creating ? 'Criando projeto...' : 'Criar projeto'}
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function ProjectFormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[26px] border border-border bg-white/70 px-5 py-5">
      <div className="mb-5 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{title}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  )
}
