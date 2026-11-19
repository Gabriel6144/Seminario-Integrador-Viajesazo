import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { apiDelete, apiGet, apiPost } from '@/lib/http'
import type { MeGustaResponse } from '@/types/api'

/** `GET /api/propuestas/{id}/me-gusta` */
export function useMeGusta(propuestaId: number | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.meGusta(propuestaId ?? 0),
    queryFn: ({ signal }) =>
      apiGet<MeGustaResponse>(`/api/propuestas/${propuestaId}/me-gusta`, signal),
    enabled: enabled && propuestaId != null && propuestaId > 0,
  })
}

/** `POST /api/propuestas/{id}/me-gusta` */
export function useDarMeGusta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (propuestaId: number) =>
      apiPost<MeGustaResponse, undefined>(`/api/propuestas/${propuestaId}/me-gusta`, undefined),
    onSuccess: (data, propuestaId) => {
      queryClient.setQueryData(queryKeys.meGusta(propuestaId), data)
    },
  })
}

/** `DELETE /api/propuestas/{id}/me-gusta` */
export function useQuitarMeGusta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (propuestaId: number) =>
      apiDelete<null>(`/api/propuestas/${propuestaId}/me-gusta`).then(() => ({
        meGusta: false as const,
      })),
    onSuccess: (_data, propuestaId) => {
      const prev = queryClient.getQueryData<MeGustaResponse>(queryKeys.meGusta(propuestaId))
      queryClient.setQueryData(queryKeys.meGusta(propuestaId), {
        meGusta: false,
        total: Math.max(0, (prev?.total ?? 1) - 1),
      })
    },
  })
}
