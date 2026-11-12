import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { PAGE_SIZE } from '@/api/eventos'
import { getPage, queryKeys } from '@/api/queries'
import type { Categoria, PropuestaResumenResponse, TipoAcceso, TipoPropuesta } from '@/types/api'

export interface AgendaFilters {
  fechaDesde: string
  fechaHasta: string
  tipoPropuesta: TipoPropuesta | ''
  categoria: Categoria | ''
  ubicacion: string
  tipoAcceso: TipoAcceso | ''
}

export const AGENDA_FILTERS_DEFAULT: AgendaFilters = {
  fechaDesde: '',
  fechaHasta: '',
  tipoPropuesta: '',
  categoria: '',
  ubicacion: '',
  tipoAcceso: '',
}

function buildAgendaQueryParams(page: number, size: number, filters?: AgendaFilters): {
  queryString: string
  activeParams: Record<string, string>
} {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  const activeParams: Record<string, string> = {}

  if (filters) {
    if (filters.fechaDesde.trim() !== '') {
      params.set('fechaDesde', filters.fechaDesde.trim())
      activeParams.fechaDesde = filters.fechaDesde.trim()
    }
    if (filters.fechaHasta.trim() !== '') {
      params.set('fechaHasta', filters.fechaHasta.trim())
      activeParams.fechaHasta = filters.fechaHasta.trim()
    }
    if (filters.tipoPropuesta !== '') {
      params.set('tipoPropuesta', filters.tipoPropuesta)
      activeParams.tipoPropuesta = filters.tipoPropuesta
    }
    if (filters.categoria !== '') {
      params.set('categoria', filters.categoria)
      activeParams.categoria = filters.categoria
    }
    if (filters.ubicacion.trim() !== '') {
      params.set('ubicacion', filters.ubicacion.trim())
      activeParams.ubicacion = filters.ubicacion.trim()
    }
    if (filters.tipoAcceso !== '') {
      params.set('tipoAcceso', filters.tipoAcceso)
      activeParams.tipoAcceso = filters.tipoAcceso
    }
  }

  return {
    queryString: `?${params.toString()}`,
    activeParams,
  }
}

/**
 * `GET /api/agenda?page=&size=&...` — agenda de eventos con filtros opcionales.
 *
 * El backend aplica los filtros, el orden cronológico (más próximos primero) y la exclusión de
 * eventos cancelados/terminados. El cliente solo arma la query.
 */
export function useAgenda(page: number, filters?: AgendaFilters) {
  const { queryString, activeParams } = buildAgendaQueryParams(page, PAGE_SIZE, filters)

  return useQuery({
    queryKey: queryKeys.agenda(page, PAGE_SIZE, activeParams),
    queryFn: ({ signal }) =>
      getPage<PropuestaResumenResponse>(`/api/agenda${queryString}`, signal),
    placeholderData: keepPreviousData,
  })
}