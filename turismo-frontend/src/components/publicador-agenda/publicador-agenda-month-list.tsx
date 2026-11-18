import { EmptyState } from '@/components/query-state'
import { formatDateRange } from '@/lib/dates'
import type { PublicadorAgendaItemResponse } from '@/types/api'

interface PublicadorAgendaMonthListProps {
  monthItems: PublicadorAgendaItemResponse[]
  title?: string
  emptyTitle?: string
}

/**
 * Listado del mes o de la semana (filtrado en la página; acá solo render).
 * Scroll interno para no empujar el calendario hacia abajo.
 */
export function PublicadorAgendaMonthList({
  monthItems,
  title = 'Listado del mes',
  emptyTitle = 'Sin propuestas en este mes',
}: PublicadorAgendaMonthListProps) {
  if (monthItems.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description="Cuando publiques un evento o actividad con fechas, van a aparecer acá."
      />
    )
  }

  const eventosCount = monthItems.filter((item) => item.tipo === 'EVENTO').length
  const actividadesCount = monthItems.filter((item) => item.tipo === 'ACTIVIDAD').length
  const conteoParts: string[] = []
  if (eventosCount > 0) {
    conteoParts.push(`${eventosCount} ${eventosCount === 1 ? 'evento' : 'eventos'}`)
  }
  if (actividadesCount > 0) {
    conteoParts.push(`${actividadesCount} ${actividadesCount === 1 ? 'actividad' : 'actividades'}`)
  }
  const conteoLabel = conteoParts.join(' · ')

  return (
    <div className="flex max-h-[min(60vh,560px)] flex-col rounded-2xl border border-[#e0e3e5]/80 bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <div className="shrink-0">
        <h3 className="font-heading text-base font-bold text-[#191c1e]">{title}</h3>
        {conteoLabel ? (
          <p className="mt-0.5 text-xs font-medium text-[#5f6b73]">{conteoLabel}</p>
        ) : null}
      </div>
      <ul className="mt-3 flex flex-col gap-2 overflow-y-auto pr-1">
        {monthItems.map((item) => (
          <li
            key={item.propuestaId}
            className="flex flex-col gap-0.5 rounded-xl border border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-[#191c1e]">{item.nombre}</p>
              <p className="text-xs text-[#5f6b73]">{item.tipo}</p>
            </div>
            <p className="text-xs font-medium text-[#00658d]">
              {formatDateRange(item.fechaInicio, item.fechaFin)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
