import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import { createProject } from '@/features/projects/services/projects.service'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { cn } from '@/shared/utils/cn'

const steps = ['Dados básicos', 'Tema', 'Problema', 'Objetivos', 'Estrutura']

const courses = ['Administração', 'Ciência da Computação', 'Direito', 'Enfermagem', 'Engenharia Civil', 'Medicina']
const norms = ['ABNT', 'APA', 'Vancouver']

export function ProjectWizard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    course: '',
    institution: '',
    advisorName: '',
    deadline: '',
    norm: 'ABNT',
    theme: '',
    researchProblem: '',
    generalObjective: '',
    specificObjectives: ['', '', ''],
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
      course: form.course,
      institution: form.institution,
      advisorName: form.advisorName,
      deadline: form.deadline,
      norm: form.norm as 'ABNT' | 'APA' | 'Vancouver',
      theme: form.theme,
      researchProblem: form.researchProblem,
      generalObjective: form.generalObjective,
      specificObjectives: form.specificObjectives,
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
      <div className="grid gap-3 md:grid-cols-5">
        {steps.map((item, index) => (
          <div key={item} className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold shadow-sm',
                index <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {index < step ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <p className="text-sm text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>

      <div className="surface-card rounded-[28px] p-6">
        {step === 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Título do TCC</Label>
              <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex: Inteligência Artificial aplicada à educação" className="h-12 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Curso</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Norma acadêmica</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Instituição</Label>
              <Input value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} className="h-12 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className="h-12 rounded-2xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Orientador</Label>
              <Input value={form.advisorName} onChange={(event) => setForm({ ...form, advisorName: event.target.value })} className="h-12 rounded-2xl" />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Tema de pesquisa</Label>
              <Button variant="outline" onClick={() => void fillByAi('theme')} disabled={generating}>
                <Sparkles className="h-4 w-4" />
                Sugerir com IA
              </Button>
            </div>
            <Textarea value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value })} className="min-h-[180px] rounded-[24px]" />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Problema de pesquisa</Label>
              <Button variant="outline" onClick={() => void fillByAi('problem')} disabled={generating}>
                <Sparkles className="h-4 w-4" />
                Refinar com IA
              </Button>
            </div>
            <Textarea value={form.researchProblem} onChange={(event) => setForm({ ...form, researchProblem: event.target.value })} className="min-h-[180px] rounded-[24px]" />
          </div>
        ) : null}

        {step === 3 ? (
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
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Estrutura sugerida</h3>
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
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep((current) => current + 1)}>
            Próximo
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => void handleCreateProject()} disabled={creating}>
            Criar projeto
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
