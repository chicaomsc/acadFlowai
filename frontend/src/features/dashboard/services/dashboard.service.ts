import { getDashboardPayload } from '@/shared/services/dashboard.service'

export const dashboardQuery = {
  queryKey: ['dashboard'],
  queryFn: getDashboardPayload,
}
