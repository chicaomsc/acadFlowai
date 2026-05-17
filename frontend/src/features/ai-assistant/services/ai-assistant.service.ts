import { getAiAssistantPayload } from '@/shared/services/ai.service'

export const aiAssistantQuery = {
  queryKey: ['ai-assistant'],
  queryFn: getAiAssistantPayload,
}
