import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { PAGE_SIZE } from '@/api/eventos'
import { getPage, queryKeys } from '@/api/queries'
import type { Categoria, EventoResponse, TipoAcceso, TipoPropuesta } from '@/types/api'

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
 * `GET /api/agenda/semanal?page=&size=&...` — agenda de eventos con filtros opcionales.
 */
export function useAgendaSemanal(page: number, filters?: AgendaFilters) {
  const { queryString, activeParams } = buildAgendaQueryParams(page, PAGE_SIZE, filters)

  return useQuery({
    queryKey: queryKeys.agenda(page, PAGE_SIZE, activeParams),
    queryFn: ({ signal }) =>
      getPage<EventoResponse>(`/api/agenda/semanal${queryString}`, signal),
    placeholderData: keepPreviousData,
  })
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Filtra y ordena cronológicamente los eventos en memoria (CA1 y CA2).
 *
 * Permite que el filtrado funcione de inmediato en el frontend y siga siendo consistente
 * cuando el backend aplique los mismos parámetros desde la base de datos.
 */
export function filterAndSortAgendaEventos(
  eventos: EventoResponse[],
  filters: AgendaFilters,
): EventoResponse[] {
  const desde = filters.fechaDesde.trim()
  const hasta = filters.fechaHasta.trim()
  const ubicacionBuscada = normalizeText(filters.ubicacion)

  return eventos
    .filter((evento) => {
      if (desde !== '' && evento.fechaFin < desde) {
        return false
      }
      if (hasta !== '' && evento.fechaInicio > hasta) {
        return false
      }
      if (filters.tipoPropuesta !== '' && evento.tipoPropuesta !== filters.tipoPropuesta) {
        return false
      }
      if (filters.categoria !== '' && evento.categoria !== filters.categoria) {
        return false
      }
      if (filters.tipoAcceso !== '') {
        const accesoEvento = evento.tipoAcceso ?? 'GRATUITO'
        if (accesoEvento !== filters.tipoAcceso) {
          return false
        }
      }
      if (ubicacionBuscada !== '') {
        const camposUbicacion = [
          evento.localidad ?? '',
          evento.lugarRecinto ?? '',
          evento.direccion ?? '',
        ]
          .map(normalizeText)
          .join(' ')
        if (!camposUbicacion.includes(ubicacionBuscada)) {
          return false
        }
      }
      return true
    })
    .sort((a, b) => {
      const cmpFecha = a.fechaInicio.localeCompare(b.fechaInicio)
      if (cmpFecha !== 0) return cmpFecha
      const horaA = a.horarioInicio ?? '99:99'
      const horaB = b.horarioInicio ?? '99:99'
      return horaA.localeCompare(horaB)
    })
}
