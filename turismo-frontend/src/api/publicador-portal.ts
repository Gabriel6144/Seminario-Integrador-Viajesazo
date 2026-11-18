import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { apiGet } from '@/lib/http'
import type {
  PublicadorAgendaItemResponse,
  PublicadorDashboardResponse,
} from '@/types/api'

export function usePublicadorDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.publicadorDashboard(),
    queryFn: ({ signal }) =>
      apiGet<PublicadorDashboardResponse>('/api/publicador/dashboard', signal),
    enabled,
  })
}

export function usePublicadorAgenda(enabled = true) {
  return useQuery({
    queryKey: queryKeys.publicadorAgenda(),
    queryFn: ({ signal }) =>
      apiGet<PublicadorAgendaItemResponse[]>('/api/publicador/agenda', signal),
    enabled,
  })
}

export function usePublicadorFechasOcupadas(enabled = true) {
  return useQuery({
    queryKey: queryKeys.publicadorFechasOcupadas(),
    queryFn: ({ signal }) => apiGet<string[]>('/api/publicador/fechas-ocupadas', signal),
    enabled,
  })
}
