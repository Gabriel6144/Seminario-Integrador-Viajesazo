import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { getPage, pageParams, queryKeys } from '@/api/queries'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/http'
import type { ViajeBorradorRequest, ViajeRequest, ViajeResponse } from '@/types/api'

export const PAGE_SIZE = 20

/** Listado del turista autenticado: el JWT identifica al usuario (sin `?usuario=`). */
export function useBorradores(page: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.borradores(page, PAGE_SIZE),
    queryFn: ({ signal }) =>
      getPage<ViajeResponse>(`/api/viajes/borradores${pageParams(page, PAGE_SIZE)}`, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useViajes(page: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.viajes(page, PAGE_SIZE),
    queryFn: ({ signal }) =>
      getPage<ViajeResponse>(`/api/viajes${pageParams(page, PAGE_SIZE)}`, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useBorrador(id: number | null) {
  return useQuery({
    queryKey: queryKeys.borrador(id ?? 0),
    queryFn: ({ signal }) => apiGet<ViajeResponse>(`/api/viajes/borradores/${id}`, signal),
    enabled: id !== null,
  })
}

export function useViaje(id: number | null) {
  return useQuery({
    queryKey: queryKeys.viaje(id ?? 0),
    queryFn: ({ signal }) => apiGet<ViajeResponse>(`/api/viajes/${id}`, signal),
    enabled: id !== null,
  })
}

export function useCrearViaje() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ViajeRequest) => apiPost<ViajeResponse, ViajeRequest>('/api/viajes', request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.borradoresAll() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
    },
  })
}

export function useGuardarBorrador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ViajeBorradorRequest) =>
      apiPost<ViajeResponse, ViajeBorradorRequest>('/api/viajes/borradores', request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.borradoresAll() })
    },
  })
}

export function useActualizarBorrador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: ViajeBorradorRequest }) =>
      apiPut<ViajeResponse, ViajeBorradorRequest>(`/api/viajes/borradores/${id}`, request),
    onSuccess: (_borrador, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.borradoresAll() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.borrador(id) })
    },
  })
}

export function useCompletarBorrador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      apiPost<ViajeResponse, undefined>(`/api/viajes/borradores/${id}/completar`, undefined),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.borradoresAll() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
      queryClient.removeQueries({ queryKey: queryKeys.borrador(id) })
    },
  })
}

export function useDescartarBorrador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/viajes/borradores/${id}`),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.borradoresAll() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
      queryClient.removeQueries({ queryKey: queryKeys.borrador(id) })
    },
  })
}

/**
 * VZ-23: baja lógica de un viaje confirmado. El backend lo pasa a `CANCELADO` y responde 204;
 * deja de listarse y el turista deja de figurar en las inscripciones de sus propuestas.
 */
export function useCancelarViaje() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/viajes/${id}`),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.borradoresAll() })
      queryClient.removeQueries({ queryKey: queryKeys.viaje(id) })
      queryClient.removeQueries({ queryKey: queryKeys.circuito(id) })
    },
  })
}
