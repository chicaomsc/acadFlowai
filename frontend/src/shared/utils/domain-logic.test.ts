import { describe, expect, it } from 'vitest'
import type { Chapter } from '@/shared/types/contracts'
import { calculateProjectProgress, countWords } from '@/shared/utils/domain-logic'

function makeChapter(
  id: string,
  status: Chapter['status'],
  overrides: Partial<Chapter> = {},
): Chapter {
  return {
    id,
    projectId: 'project-test',
    title: `Capítulo ${id}`,
    type: 'introduction',
    content: '',
    status,
    order: 1,
    wordCount: 0,
    lastEditedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

describe('domain-logic', () => {
  it('countWords conta palavras ignorando espaços extras e quebras de linha', () => {
    expect(countWords('  Um texto\ncom   espaços   extras.  ')).toBe(5)
    expect(countWords('')).toBe(0)
  })

  it('calculateProjectProgress calcula o progresso ponderado pelos status dos capítulos', () => {
    const chapters = [
      makeChapter('1', 'approved'),
      makeChapter('2', 'review'),
      makeChapter('3', 'writing'),
      makeChapter('4', 'not_started'),
    ]

    expect(calculateProjectProgress(chapters)).toBe(60)
  })
})
