import { getAdvisorComments } from '@/shared/services/advisor.service'
import { getChapters } from '@/shared/services/chapter.service'

export const advisorQuery = {
  queryKey: ['advisor'],
  queryFn: async () => ({
    comments: await getAdvisorComments(),
    chapters: await getChapters(),
  }),
}
