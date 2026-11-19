import { MODALIDAD_LABELS, type PublicadorAgendaItemResponse } from '@/types/api'

import { formatAgendaTimeRange } from './agenda-layout'

interface AgendaEventCardProps {
  item: PublicadorAgendaItemResponse
  compact?: boolean
}

/**
 * Tarjeta de propuesta en el calendario dark: imagen, título, badges y horario.
 */
export function AgendaEventCard({ item, compact = false }: AgendaEventCardProps) {
  const modalidadLabel =
    item.modalidad != null ? MODALIDAD_LABELS[item.modalidad] : null
  const horario = formatAgendaTimeRange(item.horarioInicio, item.horarioFin)

  return (
    <article
      className={`overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/90 shadow-sm ${
        compact ? 'p-1.5' : 'p-2'
      }`}
      title={item.nombre}
    >
      <div className={`flex gap-2 ${compact ? 'items-start' : 'items-center'}`}>
        {item.imagenUrl ? (
          <img
            src={item.imagenUrl}
            alt=""
            className={`shrink-0 rounded object-cover ${compact ? 'h-8 w-8' : 'h-12 w-12'}`}
          />
        ) : (
          <div
            className={`shrink-0 rounded bg-slate-800 ${compact ? 'h-8 w-8' : 'h-12 w-12'}`}
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={`truncate font-semibold text-slate-100 ${
              compact ? 'text-[10px] leading-tight' : 'text-xs'
            }`}
          >
            {item.nombre}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded bg-sky-500/20 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-300">
              {item.tipo}
            </span>
            {modalidadLabel ? (
              <span className="rounded bg-violet-500/20 px-1 py-0.5 text-[9px] font-semibold text-violet-300">
                {modalidadLabel}
              </span>
            ) : null}
          </div>
          <p className={`mt-1 text-slate-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            {horario}
          </p>
        </div>
      </div>
    </article>
  )
}
