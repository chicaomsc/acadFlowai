import type {
  AISkill,
  Advisor,
  AdvisorComment,
  AiSuggestion,
  Chapter,
  Notification,
  PDFDocument,
  Plan,
  Project,
  Reference,
  TimelineTask,
  User,
  WeeklyProgress,
} from '@/shared/types/contracts'

export interface MockDatabase {
  users: User[]
  advisors: Advisor[]
  projects: Project[]
  chapters: Chapter[]
  references: Reference[]
  timelineTasks: TimelineTask[]
  advisorComments: AdvisorComment[]
  aiSuggestions: AiSuggestion[]
  aiSkills: AISkill[]
  pdfDocuments: PDFDocument[]
  plans: Plan[]
  notifications: Notification[]
  weeklyProgressByProject: Record<string, WeeklyProgress[]>
}

const users: User[] = [
  {
    id: 'user-1',
    name: 'Maria Silva',
    email: 'maria.silva@email.com',
    institution: 'Universidade Federal de São Paulo',
    course: 'Ciência da Computação',
    role: 'student',
    plan: 'pro',
    createdAt: new Date('2024-01-15'),
  },
]

const advisors: Advisor[] = [
  {
    id: 'advisor-1',
    name: 'Dr. Carlos Mendes',
    email: 'carlos.mendes@unifesp.br',
    institution: 'Universidade Federal de São Paulo',
  },
]

const chapters: Chapter[] = [
  {
    id: 'chapter-1',
    projectId: 'project-1',
    title: 'Introdução',
    type: 'introduction',
    content:
      'A educação superior enfrenta desafios significativos no século XXI, especialmente no que diz respeito à personalização do ensino e ao acompanhamento individualizado dos estudantes. Nesse contexto, os Sistemas de Tutoria Inteligente emergem como uma solução promissora, combinando técnicas de Inteligência Artificial com teorias pedagógicas para oferecer experiências de aprendizagem adaptativas.\n\nEste trabalho propõe uma análise aprofundada sobre a aplicação de sistemas de tutoria inteligente no contexto da educação superior brasileira, investigando seus impactos no desempenho acadêmico e na experiência de aprendizagem dos estudantes.',
    status: 'review',
    order: 1,
    wordCount: 87,
    lastEditedAt: new Date('2024-03-18'),
  },
  {
    id: 'chapter-2',
    projectId: 'project-1',
    title: 'Fundamentação Teórica',
    type: 'theoretical',
    content:
      '2.1 Inteligência Artificial na Educação\n\nA aplicação de Inteligência Artificial na educação não é um fenômeno recente. Desde os primeiros sistemas especialistas da década de 1970, pesquisadores exploram formas de utilizar a tecnologia para personalizar e otimizar o processo de ensino-aprendizagem.\n\n2.2 Sistemas de Tutoria Inteligente\n\nOs Sistemas de Tutoria Inteligente são ambientes computacionais projetados para simular o comportamento de um tutor humano, oferecendo instrução personalizada e feedback adaptativo aos estudantes.',
    status: 'writing',
    order: 2,
    wordCount: 95,
    lastEditedAt: new Date('2024-03-20'),
  },
  {
    id: 'chapter-3',
    projectId: 'project-1',
    title: 'Metodologia',
    type: 'methodology',
    content: '',
    status: 'not_started',
    order: 3,
    wordCount: 0,
    lastEditedAt: new Date('2024-03-01'),
  },
  {
    id: 'chapter-4',
    projectId: 'project-1',
    title: 'Resultados e Discussão',
    type: 'results',
    content: '',
    status: 'not_started',
    order: 4,
    wordCount: 0,
    lastEditedAt: new Date('2024-03-01'),
  },
  {
    id: 'chapter-5',
    projectId: 'project-1',
    title: 'Conclusão',
    type: 'conclusion',
    content: '',
    status: 'not_started',
    order: 5,
    wordCount: 0,
    lastEditedAt: new Date('2024-03-01'),
  },
  {
    id: 'chapter-6',
    projectId: 'project-1',
    title: 'Referências',
    type: 'references',
    content: '',
    status: 'not_started',
    order: 6,
    wordCount: 0,
    lastEditedAt: new Date('2024-03-01'),
  },
]

const references: Reference[] = [
  {
    id: 'reference-1',
    projectId: 'project-1',
    primaryChapterId: 'chapter-2',
    chapterIds: ['chapter-2'],
    type: 'article',
    authors: ['ANDERSON, J. R.', 'CORBETT, A. T.', 'KOEDINGER, K. R.', 'PELLETIER, R.'],
    title: 'Cognitive tutors: Lessons learned',
    year: 1995,
    journal: 'The Journal of the Learning Sciences',
    abntFormatted:
      'ANDERSON, J. R. et al. Cognitive tutors: Lessons learned. The Journal of the Learning Sciences, v. 4, n. 2, p. 167-207, 1995.',
    hasCitation: true,
  },
  {
    id: 'reference-2',
    projectId: 'project-1',
    primaryChapterId: 'chapter-2',
    chapterIds: ['chapter-2'],
    type: 'book',
    authors: ['RUSSELL, S.', 'NORVIG, P.'],
    title: 'Artificial Intelligence: A Modern Approach',
    year: 2020,
    publisher: 'Pearson',
    abntFormatted:
      'RUSSELL, S.; NORVIG, P. Artificial Intelligence: A Modern Approach. 4. ed. Pearson, 2020.',
    hasCitation: true,
  },
  {
    id: 'reference-3',
    projectId: 'project-1',
    type: 'article',
    authors: ['VANLEHN, K.'],
    title: 'The relative effectiveness of human tutoring, intelligent tutoring systems, and other tutoring systems',
    year: 2011,
    journal: 'Educational Psychologist',
    doi: '10.1080/00461520.2011.611369',
    chapterIds: [],
    abntFormatted:
      'VANLEHN, K. The relative effectiveness of human tutoring, intelligent tutoring systems, and other tutoring systems. Educational Psychologist, v. 46, n. 4, p. 197-221, 2011.',
    hasCitation: false,
  },
]

const timelineTasks: TimelineTask[] = [
  {
    id: 'task-1',
    projectId: 'project-1',
    chapterId: 'chapter-1',
    title: 'Definir tema e problema de pesquisa',
    status: 'completed',
    priority: 'high',
    order: 1,
  },
  {
    id: 'task-2',
    projectId: 'project-1',
    title: 'Validar tema com orientador',
    status: 'completed',
    priority: 'high',
    order: 2,
  },
  {
    id: 'task-3',
    projectId: 'project-1',
    chapterId: 'chapter-1',
    title: 'Escrever Introdução',
    status: 'completed',
    priority: 'high',
    dueDate: new Date('2024-03-10'),
    order: 3,
  },
  {
    id: 'task-4',
    projectId: 'project-1',
    chapterId: 'chapter-2',
    title: 'Desenvolver Fundamentação Teórica',
    description: 'Concluir os fundamentos conceituais e fechar a conexão com estudos clássicos.',
    status: 'in_progress',
    priority: 'high',
    dueDate: new Date('2024-04-15'),
    order: 4,
  },
  {
    id: 'task-5',
    projectId: 'project-1',
    chapterId: 'chapter-3',
    title: 'Definir Metodologia',
    description: 'Estruturar abordagem, amostra e instrumentos de análise.',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date('2024-05-01'),
    order: 5,
  },
  {
    id: 'task-6',
    projectId: 'project-1',
    chapterId: 'chapter-4',
    title: 'Coletar e analisar dados',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date('2024-07-01'),
    order: 6,
  },
  {
    id: 'task-7',
    projectId: 'project-1',
    chapterId: 'chapter-4',
    title: 'Escrever Resultados',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date('2024-09-01'),
    order: 7,
  },
  {
    id: 'task-8',
    projectId: 'project-1',
    chapterId: 'chapter-5',
    title: 'Finalizar Conclusão',
    status: 'todo',
    priority: 'high',
    dueDate: new Date('2024-10-15'),
    order: 8,
  },
  {
    id: 'task-9',
    projectId: 'project-1',
    title: 'Preparar apresentação de defesa',
    status: 'todo',
    priority: 'high',
    dueDate: new Date('2024-12-01'),
    order: 9,
  },
]

const advisorComments: AdvisorComment[] = [
  {
    id: 'comment-1',
    projectId: 'project-1',
    chapterId: 'chapter-1',
    advisorId: 'advisor-1',
    advisorName: 'Dr. Carlos Mendes',
    content:
      'A introdução está bem estruturada, mas sugiro expandir a contextualização do cenário brasileiro. Adicione dados sobre o ensino superior no Brasil.',
    createdAt: new Date('2024-03-19'),
    resolved: false,
  },
  {
    id: 'comment-2',
    projectId: 'project-1',
    chapterId: 'chapter-2',
    advisorId: 'advisor-1',
    advisorName: 'Dr. Carlos Mendes',
    content:
      'Excelente levantamento teórico. Continue desenvolvendo a seção sobre os tipos de sistemas de tutoria inteligente.',
    createdAt: new Date('2024-03-20'),
    resolved: false,
  },
]

const projects: Project[] = [
  {
    id: 'project-1',
    title: 'Inteligência Artificial Aplicada à Educação: Um Estudo sobre Sistemas de Tutoria Inteligente',
    course: 'Ciência da Computação',
    institution: 'Universidade Federal de São Paulo',
    advisorId: 'advisor-1',
    norm: 'ABNT',
    deadline: new Date('2024-12-15'),
    status: 'writing',
    progress: 45,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-20'),
    theme: 'Sistemas de Tutoria Inteligente na Educação Superior',
    researchProblem:
      'Como os sistemas de tutoria inteligente podem melhorar o desempenho acadêmico de estudantes universitários?',
    generalObjective:
      'Analisar a eficácia dos sistemas de tutoria inteligente no contexto da educação superior brasileira.',
    specificObjectives: [
      'Mapear os principais sistemas de tutoria inteligente utilizados globalmente',
      'Identificar as características pedagógicas mais eficazes',
      'Propor um modelo adaptativo para o contexto brasileiro',
    ],
    userId: 'user-1',
    chapterIds: chapters.filter((chapter) => chapter.projectId === 'project-1').map((chapter) => chapter.id),
    referenceIds: references.filter((reference) => reference.projectId === 'project-1').map((reference) => reference.id),
    timelineTaskIds: timelineTasks.filter((task) => task.projectId === 'project-1').map((task) => task.id),
    advisorCommentIds: advisorComments.filter((comment) => comment.projectId === 'project-1').map((comment) => comment.id),
  },
]

const aiSuggestions: AiSuggestion[] = [
  {
    id: 'ai-suggestion-1',
    projectId: 'project-1',
    chapterId: 'chapter-2',
    type: 'improve',
    title: 'Melhore a transição entre IA e tutoria inteligente',
    description: 'Conecte o contexto amplo de IA com a definição específica de STI no trecho atual.',
    content: 'Sugira uma ponte entre os parágrafos para reduzir quebra conceitual.',
    createdAt: new Date('2024-03-20'),
  },
  {
    id: 'ai-suggestion-2',
    projectId: 'project-1',
    chapterId: 'chapter-2',
    type: 'references',
    title: 'Incluir VanLehn (2011) na fundamentação',
    description: 'A referência já está cadastrada e ainda não foi citada no capítulo atual.',
    content: 'Use o estudo comparativo para sustentar a eficácia de sistemas tutores.',
    createdAt: new Date('2024-03-20'),
  },
  {
    id: 'ai-suggestion-3',
    projectId: 'project-1',
    type: 'theme',
    title: 'Delimitar o recorte brasileiro',
    description: 'Especifique melhor o contexto institucional para fortalecer o problema de pesquisa.',
    content: 'Explicite como universidades públicas brasileiras aparecem no recorte.',
    createdAt: new Date('2024-03-18'),
  },
]

const aiSkills: AISkill[] = [
  {
    id: 'skill-1',
    name: 'Gerar Tema',
    description: 'Sugere temas de pesquisa baseados na sua área de estudo',
    icon: 'Lightbulb',
    category: 'theme',
  },
  {
    id: 'skill-2',
    name: 'Criar Problema de Pesquisa',
    description: 'Formula problemas de pesquisa claros e objetivos',
    icon: 'HelpCircle',
    category: 'research',
  },
  {
    id: 'skill-3',
    name: 'Criar Objetivo Geral',
    description: 'Desenvolve o objetivo geral alinhado ao problema',
    icon: 'Target',
    category: 'research',
  },
  {
    id: 'skill-4',
    name: 'Criar Objetivos Específicos',
    description: 'Desdobra o objetivo geral em objetivos específicos',
    icon: 'ListChecks',
    category: 'research',
  },
  {
    id: 'skill-5',
    name: 'Revisar Introdução',
    description: 'Analisa e sugere melhorias para a introdução',
    icon: 'FileText',
    category: 'review',
  },
  {
    id: 'skill-6',
    name: 'Revisar Metodologia',
    description: 'Verifica a coerência metodológica',
    icon: 'FlaskConical',
    category: 'review',
  },
  {
    id: 'skill-7',
    name: 'Simular Banca',
    description: 'Simula perguntas que a banca pode fazer',
    icon: 'Mic2',
    category: 'defense',
  },
]

const pdfDocuments: PDFDocument[] = [
  {
    id: 'pdf-1',
    projectId: 'project-1',
    fileName: 'cognitive_tutors_2020.pdf',
    uploadedAt: new Date('2024-03-10'),
    status: 'completed',
    summary:
      'Este artigo apresenta uma revisão sistemática sobre os avanços em tutores cognitivos nos últimos 25 anos.',
    objective:
      'Analisar a evolução dos tutores cognitivos desde sua criação até os modelos baseados em deep learning.',
    methodology:
      'Revisão sistemática de literatura com análise de 150 artigos publicados entre 1995 e 2020.',
    mainResults:
      'Os tutores cognitivos modernos apresentam ganhos de aprendizagem equivalentes a 0.76 desvios-padrão em comparação com instrução tradicional.',
    limitations:
      'A maioria dos estudos foi conduzida em contextos de STEM, limitando a generalização para outras áreas.',
    usefulCitations: [
      'A personalização baseada em IA pode aumentar em até 40% a retenção de conhecimento.',
      'Sistemas adaptativos reduzem o tempo de aprendizagem em média 30%.',
    ],
    howToUse:
      'Utilizar os dados quantitativos na seção de Fundamentação Teórica para justificar a relevância dos STI.',
  },
  {
    id: 'pdf-2',
    projectId: 'project-1',
    fileName: 'ai_education_brazil.pdf',
    uploadedAt: new Date('2024-03-15'),
    status: 'processing',
  },
]

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'monthly',
    features: ['1 projeto', 'Editor básico', 'Referências manuais'],
  },
  {
    id: 'pro',
    name: 'Pro Aluno',
    price: 29.9,
    period: 'monthly',
    features: [
      'Projetos ilimitados',
      'IA ilimitada',
      'Leitor de PDFs com IA',
      'Todas as exportações',
      'Cronograma avançado',
      'Suporte prioritário',
    ],
    recommended: true,
  },
  {
    id: 'defense',
    name: 'Defesa',
    price: 49.9,
    period: 'monthly',
    features: ['Tudo do Pro', 'Simulador de banca', 'Gerador de slides', 'Revisão final intensiva', 'Checklist de defesa'],
  },
  {
    id: 'advisor',
    name: 'Orientador',
    price: 79.9,
    period: 'monthly',
    features: ['Até 10 orientandos', 'Painel de acompanhamento', 'Comentários e revisões', 'Relatórios de progresso', 'Área do orientador'],
  },
]

const notifications: Notification[] = [
  {
    id: 'notification-1',
    title: 'Novo comentário do orientador',
    message: 'Dr. Carlos Mendes comentou na Introdução',
    type: 'info',
    read: false,
    createdAt: new Date('2024-03-19'),
  },
  {
    id: 'notification-2',
    title: 'Prazo se aproximando',
    message: 'A entrega da Fundamentação Teórica é em 5 dias',
    type: 'warning',
    read: false,
    createdAt: new Date('2024-03-18'),
  },
  {
    id: 'notification-3',
    title: 'PDF processado',
    message: 'O arquivo cognitive_tutors_2020.pdf foi analisado',
    type: 'success',
    read: true,
    createdAt: new Date('2024-03-10'),
  },
]

const weeklyProgressByProject: Record<string, WeeklyProgress[]> = {
  'project-1': [
    { day: 'Seg', words: 320 },
    { day: 'Ter', words: 450 },
    { day: 'Qua', words: 280 },
    { day: 'Qui', words: 520 },
    { day: 'Sex', words: 380 },
    { day: 'Sáb', words: 150 },
    { day: 'Dom', words: 0 },
  ],
}

export const mockDb: MockDatabase = {
  users,
  advisors,
  projects,
  chapters,
  references,
  timelineTasks,
  advisorComments,
  aiSuggestions,
  aiSkills,
  pdfDocuments,
  plans,
  notifications,
  weeklyProgressByProject,
}
