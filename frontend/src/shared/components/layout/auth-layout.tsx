import { Outlet } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  Circle,
  Clock3,
  FileText,
  GraduationCap,
} from 'lucide-react'

const heroFeatures = [
  'Editor por capítulos com revisão IA',
  'Referências ABNT automáticas',
  'Orientador + histórico de versões',
]

const thesisStages = [
  { label: 'Tema', state: 'done' },
  { label: 'Problema', state: 'done' },
  { label: 'Objetivos', state: 'done' },
  { label: 'Metodologia', state: 'active' },
  { label: 'Defesa', state: 'pending' },
] as const

const thesisChapters = [
  { label: 'Introdução', state: 'done' },
  { label: 'Fundamentação Teórica', state: 'done' },
  { label: 'Metodologia', state: 'active' },
  { label: 'Resultados', state: 'pending' },
  { label: 'Conclusão', state: 'pending' },
] as const

// TODO: conectar API para substituir indicadores mockados.
const heroStats = [
  { value: '4.2k', label: 'Alunos ativos' },
  { value: '93%', label: 'No prazo' },
  { value: '138', label: 'Refs / dia' },
]

export function AuthLayout() {
  return (
    <div className="grid h-screen overflow-hidden bg-background lg:grid-cols-[1.08fr_0.92fr]">
      <section className="hidden h-screen lg:flex">
        <div className="auth-hero-surface flex h-full w-full flex-col border-r border-white/6 px-10 py-8 text-white xl:px-12 xl:py-9">
          <div className="flex h-full flex-col justify-between">
            <div className="space-y-7">
              <div className="auth-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <span className="h-[5px] w-[5px] rounded-full bg-green-400" />
                <span className="font-sans text-[11px] font-normal tracking-[0.14em] text-white/54">
                  Workspace para TCC
                </span>
              </div>

              <div className="auth-fade-up space-y-4">
                <h1 className="max-w-[520px] font-serif text-[32px] leading-[1.1] tracking-[-0.03em] text-white xl:text-[35px]">
                  Do tema à defesa
                  <br />
                  <span className="text-white/48">sem perder a linha de raciocínio.</span>
                </h1>
                <p className="max-w-[300px] font-sans text-[12.5px] font-light leading-[1.72] text-white/58">
                  Escrita, referências, cronograma e IA num único workspace preparado para o
                  TCC brasileiro.
                </p>
              </div>

              <div className="auth-fade-up grid gap-2.5">
                {heroFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5">
                    <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white/12 bg-white/6">
                      <Check className="h-2.5 w-2.5 text-white/70" strokeWidth={2} />
                    </div>
                    <span className="font-sans text-[12px] font-light leading-5 text-white/58">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <div className="auth-fade-up auth-float rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_14px_36px_rgba(2,8,20,0.18)] backdrop-blur-[10px]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-sans text-[11px] font-normal uppercase tracking-[0.18em] text-white/46">
                      Estrutura de pensamento
                    </p>
                    <h2 className="mt-1.5 font-sans text-[14px] font-medium tracking-[-0.01em] text-white/92">
                      Linha mestra do TCC
                    </h2>
                  </div>
                  <div className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-2.5 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-100/78">
                    Em progresso
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5 overflow-hidden rounded-full border border-white/8 bg-[#0B1524]/55 px-2.5 py-1.5">
                  {thesisStages.map((stage, index) => (
                    <div key={stage.label} className="flex items-center gap-1.5">
                      <div
                        className={
                          stage.state === 'done'
                            ? 'flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-300/16 text-emerald-100'
                            : stage.state === 'active'
                              ? 'flex h-4.5 w-4.5 items-center justify-center rounded-full bg-sky-300/14 text-sky-100'
                              : 'flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white/7 text-white/38'
                        }
                      >
                        {stage.state === 'done' ? (
                          <Check className="h-2.5 w-2.5" strokeWidth={2.2} />
                        ) : stage.state === 'active' ? (
                          <Clock3 className="h-2.5 w-2.5" strokeWidth={2.2} />
                        ) : (
                          <Circle className="h-2 w-2 fill-current" strokeWidth={0} />
                        )}
                      </div>
                      <span
                        className={
                          stage.state === 'pending'
                            ? 'font-sans text-[10px] font-normal text-white/42'
                            : 'font-sans text-[10px] font-normal text-white/78'
                        }
                      >
                        {stage.label}
                      </span>
                      {index < thesisStages.length - 1 ? (
                        <ChevronRight className="h-3 w-3 text-white/24" />
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-[18px] border border-white/8 bg-[#09111d]/44 p-3.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="font-sans text-[11px] font-normal uppercase tracking-[0.16em] text-white/40">
                      Capítulos do TCC
                    </p>
                    <span className="font-sans text-[10px] font-normal text-white/38">
                      3 de 5 estruturados
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {thesisChapters.slice(0, 4).map((chapter) => (
                      <div key={chapter.label} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={
                              chapter.state === 'done'
                                ? 'flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-300/16 text-emerald-100'
                                : chapter.state === 'active'
                                  ? 'flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-200/14 text-amber-100'
                                  : 'flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white/7 text-white/34'
                            }
                          >
                            {chapter.state === 'done' ? (
                              <Check className="h-2.5 w-2.5" strokeWidth={2.2} />
                            ) : chapter.state === 'active' ? (
                              <Clock3 className="h-2.5 w-2.5" strokeWidth={2.2} />
                            ) : (
                              <Circle className="h-2 w-2 fill-current" strokeWidth={0} />
                            )}
                          </div>
                          <span
                            className={
                              chapter.state === 'pending'
                                ? 'font-sans text-[11px] font-light text-white/52'
                                : 'font-sans text-[11px] font-light text-white/84'
                            }
                          >
                            {chapter.label}
                          </span>
                        </div>
                        <div
                          className={
                            chapter.state === 'done'
                              ? 'h-1.5 w-12 rounded-full bg-emerald-200/36'
                              : chapter.state === 'active'
                                ? 'h-1.5 w-12 rounded-full bg-gradient-to-r from-amber-200/50 to-white/14'
                                : 'h-1.5 w-12 rounded-full bg-white/8'
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-fade-up mt-4 flex rounded-[20px] border border-white/[0.07] bg-white/[0.03] px-1 py-4">
              {heroStats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={
                    index > 0
                      ? 'flex flex-1 flex-col justify-center border-l border-white/[0.07] px-4'
                      : 'flex flex-1 flex-col justify-center px-4'
                  }
                >
                  <div className="font-serif text-[21px] font-normal leading-none tracking-[-0.02em] text-white">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 font-sans text-[10px] font-normal uppercase tracking-[0.16em] text-white/38">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="auth-side-panel flex h-screen px-4 py-4 md:px-5 md:py-5">
        <div className="flex w-full items-center justify-center">
          <div className="flex h-full w-full max-w-[472px] flex-col justify-center">
            <div className="mx-auto flex w-full max-w-[420px] flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#0D1B2A,#16314A)] text-white shadow-[0_12px_22px_rgba(13,27,42,0.14)]">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    AcadFlow AI
                  </p>
                  <p className="font-sans text-[13px] font-light text-muted-foreground/90">
                    Workspace acadêmico para escrita de TCC.
                  </p>
                </div>
              </div>

              <div className="auth-card relative grid gap-6 px-6 py-6 md:px-7 md:py-7">
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(44,74,122,0.18),transparent)]" />
                <Outlet />
              </div>

              <div className="auth-info-card p-[18px] backdrop-blur-sm md:p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0D1B2A]/6 text-[#0D1B2A]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-sans text-[14px] font-medium text-foreground">
                      Escrita acadêmica mais clara e menos dispersa
                    </p>
                    <p className="mt-1 font-sans text-[12px] font-light leading-[1.45] text-muted-foreground/90">
                      Organize capítulos, referências e prazos em um fluxo único, sem depender
                      de ferramentas soltas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
