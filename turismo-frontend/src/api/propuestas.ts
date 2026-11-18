import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { PAGE_SIZE } from '@/api/eventos'
import { getPage, pageParams, queryKeys } from '@/api/queries'
import type { PropuestaResumenResponse, TipoRegistro } from '@/types/api'

export interface UsePropuestasOptions {
  tipo?: TipoRegistro
  /** Si viene, el listado queda acotado a ese publicador (vista del portal publicador). */
  publicadorId?: number
}

/**
 * `GET /api/propuestas` — listado unificado de eventos y actividades.
 *
 * Permite filtrar opcionalmente por `tipo` y/o `publicadorId`.
 */
export function usePropuestas(page: number, options?: UsePropuestasOptions) {
  const tipo = options?.tipo
  const publicadorId = options?.publicadorId
  const extra = [
    tipo ? `&tipo=${tipo}` : '',
    publicadorId != null ? `&publicadorId=${publicadorId}` : '',
  ].join('')
  const query = `${pageParams(page, PAGE_SIZE)}${extra}`

  return useQuery({
    queryKey: queryKeys.propuestas(page, PAGE_SIZE, tipo, publicadorId),
    queryFn: ({ signal }) => getPage<PropuestaResumenResponse>(`/api/propuestas${query}`, signal),
    placeholderData: keepPreviousData,
  })
}
