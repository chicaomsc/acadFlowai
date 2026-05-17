import { getReferences } from '@/shared/services/reference.service'

export function referencesQuery(projectId?: string) {
  return {
    queryKey: ['references', projectId ?? 'active'],
    queryFn: () => getReferences(projectId),
  }
}
