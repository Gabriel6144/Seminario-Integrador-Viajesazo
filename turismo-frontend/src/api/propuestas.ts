import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { PAGE_SIZE } from '@/api/eventos'
import { apiGet } from '@/lib/http'
import { getPage, queryKeys } from '@/api/queries'
import type {
  Categoria,
  EstadoPropuesta,
  PropuestaResumenContadoresResponse,
  PropuestaResumenResponse,
  TipoPropuesta,
  TipoRegistro,
  ZonaResponse,
} from '@/types/api'

export interface PropuestaFiltros {
  tipo?: TipoRegistro
  /** Si viene, el listado queda acotado a ese publicador (vista del portal publicador). */
  publicadorId?: number
  q?: string
  ciudad?: string
  localidad?: string
  estado?: EstadoPropuesta
  tipoPropuesta?: TipoPropuesta
  categoria?: Categoria
  fechaDesde?: string
  fechaHasta?: string
  incluirCanceladas?: boolean
}

/** Normaliza los filtros a query params, omitiendo los vacíos. Se usa también como clave de caché. */
function filtrosParams(filtros: PropuestaFiltros): Record<string, string> {
  const params: Record<string, string> = {}
  if (filtros.tipo) params.tipo = filtros.tipo
  if (filtros.publicadorId != null) params.publicadorId = String(filtros.publicadorId)
  if (filtros.q?.trim()) params.q = filtros.q.trim()
  if (filtros.ciudad) params.ciudad = filtros.ciudad
  if (filtros.localidad) params.localidad = filtros.localidad
  if (filtros.estado) params.estado = filtros.estado
  if (filtros.tipoPropuesta) params.tipoPropuesta = filtros.tipoPropuesta
  if (filtros.categoria) params.categoria = filtros.categoria
  if (filtros.fechaDesde) params.fechaDesde = filtros.fechaDesde
  if (filtros.fechaHasta) params.fechaHasta = filtros.fechaHasta
  if (filtros.incluirCanceladas) params.incluirCanceladas = 'true'
  return params
}

/**
 * `GET /api/propuestas` — listado unificado de eventos y actividades.
 *
 * El filtrado, el orden y la paginación viven en el servidor: el cliente no vuelve a filtrar la
 * página recibida.
 */
export function usePropuestas(page: number, filtros: PropuestaFiltros = {}) {
  const params = filtrosParams(filtros)
  const query = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
    ...params,
  })

  return useQuery({
    queryKey: queryKeys.propuestas(page, PAGE_SIZE, params),
    queryFn: ({ signal }) =>
      getPage<PropuestaResumenResponse>(`/api/propuestas?${query.toString()}`, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * `GET /api/propuestas/resumen` — contadores por tipo para las píldoras del catálogo.
 *
 * Se le pasan los mismos filtros que al listado, pero sin `tipo`: las tres cifras describen el
 * conjunto completo y no solo la píldora seleccionada.
 */
export function useResumenPropuestas(filtros: PropuestaFiltros = {}) {
  const params = filtrosParams({ ...filtros, tipo: undefined })
  const query = new URLSearchParams(params)
  const suffix = Object.keys(params).length > 0 ? `?${query.toString()}` : ''

  return useQuery({
    queryKey: queryKeys.propuestasResumen(params),
    queryFn: ({ signal }) =>
      apiGet<PropuestaResumenContadoresResponse>(`/api/propuestas/resumen${suffix}`, signal),
    placeholderData: keepPreviousData,
  })
}

/** `GET /api/propuestas/zonas` — ciudades/localidades para el selector de zona. */
export function useZonasPropuestas({
  publicadorId,
  incluirCanceladas,
}: {
  publicadorId?: number
  incluirCanceladas?: boolean
} = {}) {
  const params: Record<string, string> = {}
  if (publicadorId != null) params.publicadorId = String(publicadorId)
  if (incluirCanceladas) params.incluirCanceladas = 'true'
  const query = new URLSearchParams(params)
  const suffix = Object.keys(params).length > 0 ? `?${query.toString()}` : ''

  return useQuery({
    queryKey: queryKeys.propuestasZonas(params),
    queryFn: ({ signal }) =>
      apiGet<ZonaResponse[]>(`/api/propuestas/zonas${suffix}`, signal),
  })
}
