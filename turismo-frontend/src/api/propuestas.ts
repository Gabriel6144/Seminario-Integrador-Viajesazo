import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { PAGE_SIZE } from '@/api/eventos'
import { getPage, pageParams, queryKeys } from '@/api/queries'
import type { PropuestaResumenResponse, TipoRegistro } from '@/types/api'

/**
 * `GET /api/propuestas` — listado unificado de eventos y actividades.
 *
 * Permite filtrar opcionalmente por `tipo` (`EVENTO` | `ACTIVIDAD`).
 */
export function usePropuestas(page: number, tipo?: TipoRegistro) {
  const query = `${pageParams(page, PAGE_SIZE)}${tipo ? `&tipo=${tipo}` : ''}`

  return useQuery({
    queryKey: queryKeys.propuestas(page, PAGE_SIZE, tipo),
    queryFn: ({ signal }) => getPage<PropuestaResumenResponse>(`/api/propuestas${query}`, signal),
    placeholderData: keepPreviousData,
  })
}

