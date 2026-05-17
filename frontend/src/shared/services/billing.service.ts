import { mockDb } from '@/shared/mocks/database'
import { apiClient } from '@/shared/services/api-client'
import type { Plan } from '@/shared/types/contracts'

export async function getPlans(): Promise<Plan[]> {
  return apiClient.get('/plans', () => mockDb.plans)
}
