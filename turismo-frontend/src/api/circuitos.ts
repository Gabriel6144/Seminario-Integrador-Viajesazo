import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/http'
import type {
  AlternativasReemplazoResponse,
  CircuitoSeleccionadoResponse,
  GeneracionCircuitoResponse,
  SeleccionCircuitoRequest,
} from '@/types/api'

interface GenerarCircuitoVariables {
  viajeId: number
  reemplazar?: boolean
}

/**
 * Circuito de un viaje. La primera generación responde 201. Si el circuito ya existe, el backend
 * responde 409 y solo regenera cuando se manda `reemplazar=true` de forma explícita.
 */
export function useGenerarCircuito() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: number | GenerarCircuitoVariables) => {
      const viajeId = typeof variables === 'number' ? variables : variables.viajeId
      const reemplazar = typeof variables === 'number' ? false : (variables.reemplazar ?? false)
      const query = reemplazar ? '?reemplazar=true' : ''
      return apiPost<GeneracionCircuitoResponse, undefined>(
        `/api/viajes/${viajeId}/circuito${query}`,
        undefined,
      )
    },
    onSuccess: (data, variables) => {
      const viajeId = typeof variables === 'number' ? variables : variables.viajeId
      queryClient.setQueryData(queryKeys.circuito(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.circuitosAll() })
    },
  })
}

export function fetchCircuito(
  viajeId: number,
  signal?: AbortSignal,
): Promise<GeneracionCircuitoResponse> {
  return apiGet<GeneracionCircuitoResponse>(`/api/viajes/${viajeId}/circuito`, signal)
}

export function useCircuito(viajeId: number | null) {
  return useQuery({
    queryKey: queryKeys.circuito(viajeId ?? 0),
    queryFn: ({ signal }) => fetchCircuito(viajeId ?? 0, signal),
    enabled: viajeId !== null,
  })
}

export function fetchCircuitoSeleccionado(
  viajeId: number,
  signal?: AbortSignal,
): Promise<CircuitoSeleccionadoResponse> {
  return apiGet<CircuitoSeleccionadoResponse>(
    `/api/viajes/${viajeId}/circuito/seleccionado`,
    signal,
  )
}

/** VZ-26: circuito elegido, ya agrupado por día por el backend. */
export function useCircuitoSeleccionado(viajeId: number | null) {
  return useQuery({
    queryKey: queryKeys.circuitoSeleccionado(viajeId ?? 0),
    queryFn: ({ signal }) => fetchCircuitoSeleccionado(viajeId ?? 0, signal),
    enabled: viajeId !== null,
  })
}

/**
 * VZ-29: elimina una parada del circuito seleccionado. El backend exige `confirmar=true` y
 * devuelve el circuito actualizado, que se escribe en la caché para que la página no parpadee.
 */
export function useEliminarParadaCircuito() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ viajeId, itemId }: { viajeId: number; itemId: number }) =>
      apiDelete<CircuitoSeleccionadoResponse>(
        `/api/viajes/${viajeId}/circuito/seleccionado/items/${itemId}?confirmar=true`,
      ),
    onSuccess: (data, { viajeId }) => {
      queryClient.setQueryData(queryKeys.circuitoSeleccionado(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.circuito(viajeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
    },
  })
}

export function fetchAlternativasReemplazo(
  viajeId: number,
  itemId: number,
  signal?: AbortSignal,
): Promise<AlternativasReemplazoResponse> {
  return apiGet<AlternativasReemplazoResponse>(
    `/api/viajes/${viajeId}/circuito/seleccionado/items/${itemId}/alternativas`,
    signal,
  )
}

/** VZ-28: opciones que entran en el bloque horario de la parada sin romper el itinerario. */
export function useAlternativasReemplazo(viajeId: number | null, itemId: number | null) {
  return useQuery({
    queryKey: queryKeys.alternativasReemplazo(viajeId ?? 0, itemId ?? 0),
    queryFn: ({ signal }) => fetchAlternativasReemplazo(viajeId ?? 0, itemId ?? 0, signal),
    enabled: viajeId !== null && itemId !== null,
  })
}

/**
 * VZ-28: reemplaza una parada del circuito seleccionado. El backend vuelve a validar la
 * propuesta y devuelve el circuito actualizado, que se escribe en la caché.
 */
export function useReemplazarParadaCircuito() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      viajeId,
      itemId,
      propuestaId,
    }: {
      viajeId: number
      itemId: number
      propuestaId: number
    }) =>
      apiPut<CircuitoSeleccionadoResponse, { propuestaId: number }>(
        `/api/viajes/${viajeId}/circuito/seleccionado/items/${itemId}`,
        { propuestaId },
      ),
    onSuccess: (data, { viajeId, itemId }) => {
      queryClient.setQueryData(queryKeys.circuitoSeleccionado(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.circuito(viajeId) })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.alternativasReemplazo(viajeId, itemId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
    },
  })
}

/**
 * Selecciona una de las alternativas. También es única: el backend responde 400 si ya hay una
 * estrategia seleccionada, así que el botón se deshabilita cuando `estrategiaSeleccionada` existe.
 */
export function useSeleccionarCircuito() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ viajeId, estrategia }: { viajeId: number } & SeleccionCircuitoRequest) =>
      apiPost<GeneracionCircuitoResponse, SeleccionCircuitoRequest>(
        `/api/viajes/${viajeId}/circuito/seleccion`,
        { estrategia },
      ),
    onSuccess: (data, { viajeId }) => {
      queryClient.setQueryData(queryKeys.circuito(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
    },
  })
}
