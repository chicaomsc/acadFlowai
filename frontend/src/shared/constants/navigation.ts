import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Bot,
  CalendarRange,
  CreditCard,
  Download,
  FileSearch,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Settings,
  SquarePen,
  Users,
} from 'lucide-react'

export interface NavigationItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
}

export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Projetos', href: '/projects', icon: FolderKanban },
      { label: 'Editor', href: '/editor', icon: SquarePen },
      { label: 'Assistente IA', href: '/ai-assistant', icon: Bot, badge: 'Novo' },
    ],
  },
  {
    label: 'Pesquisa',
    items: [
      { label: 'Referências', href: '/references', icon: BookOpen },
      { label: 'Leitor de PDFs', href: '/pdf-reader', icon: FileSearch },
    ],
  },
  {
    label: 'Execução',
    items: [
      { label: 'Cronograma', href: '/timeline', icon: CalendarRange },
      { label: 'Orientador', href: '/advisor', icon: Users },
      { label: 'Exportação', href: '/export', icon: Download },
    ],
  },
  {
    label: 'Conta',
    items: [
      { label: 'Planos', href: '/billing', icon: CreditCard },
      { label: 'Configurações', href: '/settings', icon: Settings },
    ],
  },
]

export const brandMeta = {
  name: 'AcadFlow AI',
  tagline: 'Do tema à defesa com estrutura acadêmica.',
  icon: GraduationCap,
  heroKicker: 'Academic writing OS',
  heroTitle: 'Um workspace para transformar TCC em execução consistente.',
  heroDescription:
    'Planejamento, escrita, referências, revisão e exportação em uma jornada preparada para escalar como produto SaaS.',
  heroFeatures: [
    'Fluxos separados por auth, app shell e features',
    'Dados mockados prontos para virar APIs',
    'Base visual sóbria, clara e orientada a produtividade',
  ],
  secondaryMetric: {
    label: 'Progresso acompanhado',
    value: '45%',
  },
  secondaryStat: {
    label: 'Referências analisadas',
    value: '138',
  },
  note: 'Pensado para alunos, orientadores e instituições.',
  sideCardTitle: 'Escrita acadêmica com menos fricção',
  sideCardDescription: 'Mantenha capítulos, prazos e revisões conectados sem cair em um dashboard genérico.',
  sideCardHighlight: 'Arquitetura preparada para backend futuro',
  sideCardIcon: FileText,
}
