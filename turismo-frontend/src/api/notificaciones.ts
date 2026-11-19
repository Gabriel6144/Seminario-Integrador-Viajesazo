import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { apiGet, apiPatch } from '@/lib/http'
import type { NotificacionResponse } from '@/types/api'

/** `GET /api/notificaciones` — bandeja del usuario autenticado. */
export function useNotificaciones(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notificaciones(),
    queryFn: ({ signal }) => apiGet<NotificacionResponse[]>('/api/notificaciones', signal),
    enabled,
  })
}

/** `PATCH /api/notificaciones/{id}/leida` */
export function useMarcarNotificacionLeida() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      apiPatch<NotificacionResponse, Record<string, never>>(`/api/notificaciones/${id}/leida`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones() })
    },
  })
}
