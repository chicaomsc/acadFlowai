export const authRoutes = ['/login', '/register', '/forgot-password'] as const

export const pageTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    description: 'Visão executiva do progresso do TCC, entregas e sinais da IA.',
  },
  '/projects': {
    title: 'Projetos',
    description: 'Central para criação, acompanhamento e evolução dos trabalhos.',
  },
  '/references': {
    title: 'Referências',
    description: 'Bibliografia organizada, formatada e conectada aos capítulos.',
  },
  '/pdf-reader': {
    title: 'Leitor de PDFs',
    description: 'Análises mockadas de artigos com resumo, achados e citações úteis.',
  },
  '/ai-assistant': {
    title: 'Assistente IA',
    description: 'Skills de pesquisa, escrita e defesa em um chat visual.',
  },
  '/timeline': {
    title: 'Cronograma',
    description: 'Etapas do TCC distribuídas por status, prazos e prioridade.',
  },
  '/advisor': {
    title: 'Orientador',
    description: 'Comentários, histórico de versões e capítulos em revisão.',
  },
  '/export': {
    title: 'Exportação',
    description: 'Checklist acadêmico, formatos e opções de entrega final.',
  },
  '/billing': {
    title: 'Planos',
    description: 'Estratégia comercial para Free, Pro Aluno, Defesa e Institution.',
  },
  '/settings': {
    title: 'Configurações',
    description: 'Perfil, instituição, norma padrão e preferências da plataforma.',
  },
}
