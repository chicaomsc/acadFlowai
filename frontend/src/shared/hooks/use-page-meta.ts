import { useLocation } from 'react-router-dom'
import { pageTitles } from '@/shared/constants/routes'

export function usePageMeta() {
  const { pathname } = useLocation()

  if (pathname.startsWith('/projects/') && pathname !== '/projects/new') {
    return {
      title: 'Detalhes do Projeto',
      description: 'Resumo acadêmico, estrutura sugerida e próximos passos.',
    }
  }

  if (pathname.startsWith('/editor/')) {
    return {
      title: 'Editor',
      description: 'Escrita focada por capítulo com painel lateral de IA.',
    }
  }

  if (pathname === '/projects/new') {
    return {
      title: 'Novo Projeto',
      description: 'Wizard de criação do TCC com direcionamento acadêmico.',
    }
  }

  return (
    pageTitles[pathname] ?? {
      title: 'AcadFlow AI',
      description: 'Workspace acadêmico com organização, IA e exportação.',
    }
  )
}
