import { afterEach, describe, expect, it } from 'vitest'
import {
  clearActiveProjectId,
  getStoredActiveProjectId,
  resolveValidActiveProjectId,
  setActiveProjectId,
  syncActiveProjectId,
} from '@/shared/services/active-project.service'

describe('active project service', () => {
  afterEach(() => {
    clearActiveProjectId()
  })

  it('mantém o projeto ativo salvo quando ele ainda existe na lista real', () => {
    setActiveProjectId('project-2')

    expect(resolveValidActiveProjectId(['project-1', 'project-2', 'project-3'])).toBe('project-2')
  })

  it('troca para o primeiro projeto real quando o ativo salvo ficou inválido', () => {
    setActiveProjectId('stale-project')

    const resolvedProjectId = syncActiveProjectId(['project-9', 'project-10'])

    expect(resolvedProjectId).toBe('project-9')
    expect(getStoredActiveProjectId()).toBe('project-9')
  })

  it('limpa a seleção quando não existe projeto disponível', () => {
    setActiveProjectId('project-1')

    const resolvedProjectId = syncActiveProjectId([])

    expect(resolvedProjectId).toBeNull()
    expect(getStoredActiveProjectId()).toBeNull()
  })
})
