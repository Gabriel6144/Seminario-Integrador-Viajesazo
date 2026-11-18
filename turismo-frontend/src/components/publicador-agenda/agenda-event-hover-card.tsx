import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import type { PublicadorAgendaItemResponse } from '@/types/api'

import {
  agendaDetailPath,
  formatAgendaTimeRange,
  truncateAgendaDescription,
} from './agenda-layout'

interface AgendaEventHoverCardProps {
  item: PublicadorAgendaItemResponse
  children: ReactNode
}

/**
 * Preview al hover: título, imagen, descripción corta y link al detalle.
 * openDelay alto para no pelear con el drag (PointerSensor distance 6).
 */
export function AgendaEventHoverCard({ item, children }: AgendaEventHoverCardProps) {
  const descripcion = truncateAgendaDescription(item.descripcion)
  const horario = formatAgendaTimeRange(item.horarioInicio, item.horarioFin)
  const detailTo = agendaDetailPath(item)

  return (
    <HoverCard openDelay={280} closeDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        className="border-slate-700 bg-slate-900 text-slate-100 shadow-xl"
      >
        <div className="flex flex-col gap-2">
          {item.imagenUrl ? (
            <img
              src={item.imagenUrl}
              alt=""
              loading="lazy"
              className="h-24 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="h-16 w-full rounded-lg bg-slate-800" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-50">{item.nombre}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {item.tipo} · {horario}
            </p>
            {descripcion ? (
              <p className="mt-2 text-xs leading-snug text-slate-300">{descripcion}</p>
            ) : null}
          </div>
          <Link
            to={detailTo}
            className="text-xs font-semibold text-sky-300 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            Ver detalle
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
