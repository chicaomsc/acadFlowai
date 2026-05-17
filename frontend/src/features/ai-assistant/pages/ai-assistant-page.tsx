import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot, Send, Sparkles, User2, WandSparkles } from 'lucide-react'
import { aiAssistantQuery } from '@/features/ai-assistant/services/ai-assistant.service'
import { useAiSuggestions } from '@/shared/hooks/use-domain-data'
import { getActiveProjectId } from '@/shared/services/active-project.service'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const defaultResponses: Record<string, string> = {
  'Gerar Tema': 'Sugestão: IA aplicada à personalização do ensino superior em universidades públicas brasileiras.',
  'Criar Problema de Pesquisa': 'Problema: como sistemas de IA podem ampliar personalização sem comprometer rigor pedagógico?',
  'Simular Banca': 'Banca mockada: prepare justificativa metodológica, relevância nacional e limitações do estudo.',
}

export function AiAssistantPage() {
  const { data, isLoading, isError, refetch } = useQuery(aiAssistantQuery)
  const activeProjectId = getActiveProjectId() ?? undefined
  const { data: suggestions } = useAiSuggestions(activeProjectId)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError || !data) {
    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  function pushSkill(name: string) {
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: 'user', content: name },
      { id: `${Date.now()}-assistant`, role: 'assistant', content: defaultResponses[name] ?? `Resposta mockada para "${name}".` },
    ])
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Copilot"
        title="Assistente IA"
        description="Chat visual com skills orientadas a tema, escrita, revisão e defesa."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="surface-card rounded-[30px]">
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-[24px] border border-primary/10 bg-primary/5 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Orientador virtual</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Skills desenhadas para orientar tema, método, escrita e defesa sem parecer um chatbot genérico.
              </p>
            </div>
            {suggestions?.slice(0, 2).map((suggestion) => (
              <div key={suggestion.id} className="rounded-[22px] border border-border bg-white px-4 py-4">
                <p className="font-medium text-foreground">{suggestion.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{suggestion.description}</p>
              </div>
            ))}
            {data.skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => pushSkill(skill.name)}
                className="w-full rounded-[22px] border border-border bg-white px-4 py-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{skill.name}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{skill.description}</p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    <WandSparkles className="h-4 w-4" />
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-card-strong flex min-h-[680px] flex-col rounded-[32px]">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-5 pt-6">
            <div ref={containerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">Selecione uma skill ou digite uma pergunta</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Prompts sugeridos: {data.suggestedPrompts.join(' • ')}
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'assistant' ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                        <Bot className="h-5 w-5" />
                      </div>
                    ) : null}
                    <div className={`max-w-[80%] rounded-[24px] px-4 py-4 ${message.role === 'user' ? 'bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(23,41,85,0.12)]' : 'border border-border bg-white/90'}`}>
                      <p className="text-sm leading-7">{message.content}</p>
                    </div>
                    {message.role === 'user' ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-muted text-muted-foreground">
                        <User2 className="h-5 w-5" />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <form
              className="flex gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (!input.trim()) return
                pushSkill(input)
                setInput('')
              }}
            >
              <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pergunte algo sobre tema, metodologia ou defesa..." className="h-12 rounded-2xl" />
              <Button type="submit" className="h-12 rounded-2xl">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
