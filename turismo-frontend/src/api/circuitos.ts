import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { apiGet, apiPost } from '@/lib/http'
import type {
  GeneracionCircuitoResponse,
  SeleccionCircuitoRequest,
} from '@/types/api'

/**
 * Circuito de un viaje. La generación es **una sola vez** por viaje: el backend responde 400 si
 * ya existe, así que la mutación no se reintenta ni se vuelve a llamar tras un éxito.
 */
export function useGenerarCircuito() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (viajeId: number) =>
      apiPost<GeneracionCircuitoResponse, undefined>(
        `/api/viajes/${viajeId}/circuito`,
        undefined,
      ),
    onSuccess: (data, viajeId) => {
      queryClient.setQueryData(queryKeys.circuito(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.circuitosAll() })
    },
  })
}

export function useCircuito(viajeId: number | null) {
  return useQuery({
    queryKey: queryKeys.circuito(viajeId ?? 0),
    queryFn: ({ signal }) =>
      apiGet<GeneracionCircuitoResponse>(`/api/viajes/${viajeId}/circuito`, signal),
    enabled: viajeId !== null,
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
    },
  })
}
