import { useQuery } from '@tanstack/react-query'

import { obtenerRutaDia, type ParadaCoord, type RutaDia } from '@/lib/rutas'
import type { CircuitStrategy } from '@/types/api'

export function rutaQueryKey(
  viajeId: number,
  estrategia: CircuitStrategy | null | undefined,
  fecha: string,
  stopIds: string[],
) {
  return ['ruta', viajeId, estrategia ?? 'seleccionado', fecha, 'foot', ...stopIds] as const
}

export function useRutaDia(
  viajeId: number,
  fecha: string,
  paradas: ParadaCoord[],
  stopIds: string[],
  enabled = true,
  estrategia?: CircuitStrategy | null,
) {
  return useQuery<RutaDia>({
    queryKey: rutaQueryKey(viajeId, estrategia, fecha, stopIds),
    queryFn: ({ signal }) => obtenerRutaDia(paradas, signal),
    enabled: enabled && paradas.length >= 2 && fecha !== '',
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
