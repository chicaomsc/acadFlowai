import { getTimelineTasks } from '@/shared/services/timeline.service'

export function timelineQuery(projectId?: string) {
  return {
    queryKey: ['timeline', projectId ?? 'active'],
    queryFn: () => getTimelineTasks(projectId),
  }
}
