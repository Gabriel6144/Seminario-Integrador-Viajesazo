import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/http'
import type { ActividadRequest, ActividadResponse } from '@/types/api'

function invalidateActividadViews(queryClient: QueryClient, publicadorId: number): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.propuestasAll() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.actividadesAll() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.eventosAll() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.publicadorEventosAll(publicadorId) })
}

/** `GET /api/actividades/{id}` — detalle de actividad turística. */
export function useActividad(id: number | null) {
  return useQuery({
    queryKey: queryKeys.actividad(id ?? 0),
    queryFn: ({ signal }) => apiGet<ActividadResponse>(`/api/actividades/${id}`, signal),
    enabled: id !== null,
  })
}

/** `POST /api/actividades` — alta de actividad turística. */
export function useCrearActividad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ActividadRequest) =>
      apiPost<ActividadResponse, ActividadRequest>('/api/actividades', request),
    onSuccess: (actividad) => {
      invalidateActividadViews(queryClient, actividad.publicadorId)
    },
  })
}

interface ActualizarActividadVariables {
  id: number
  request: ActividadRequest
  previousPublicadorId: number
}

/** `PUT /api/actividades/{id}` — modificación de actividad turística. */
export function useActualizarActividad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: ActualizarActividadVariables) =>
      apiPut<ActividadResponse, ActividadRequest>(`/api/actividades/${id}`, request),
    onSuccess: (actividad, { id, previousPublicadorId }) => {
      invalidateActividadViews(queryClient, actividad.publicadorId)
      if (previousPublicadorId !== actividad.publicadorId) {
        invalidateActividadViews(queryClient, previousPublicadorId)
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.actividad(id) })
    },
  })
}

interface BorrarActividadVariables {
  id: number
  publicadorId: number
}

/** `DELETE /api/actividades/{id}` — baja física de actividad turística. */
export function useBorrarActividad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: BorrarActividadVariables) => apiDelete(`/api/actividades/${id}`),
    onSuccess: (_data, { id, publicadorId }) => {
      invalidateActividadViews(queryClient, publicadorId)
      queryClient.removeQueries({ queryKey: queryKeys.actividad(id) })
    },
  })
}
