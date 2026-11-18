import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { apiGet } from '@/lib/http'
import type { AdminDashboardResponse } from '@/types/api'

export function useAdminDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminDashboard(),
    queryFn: ({ signal }) => apiGet<AdminDashboardResponse>('/api/admin/dashboard', signal),
    enabled,
  })
}
