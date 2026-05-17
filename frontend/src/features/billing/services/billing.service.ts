import { getPlans } from '@/shared/services/billing.service'

export const billingQuery = {
  queryKey: ['billing'],
  queryFn: getPlans,
}
