import { Lock } from 'lucide-react'

import type { LocalDate, PublicadorAgendaItemResponse } from '@/types/api'

import { AgendaDraggableCard } from './agenda-draggable-card'
import { AgendaDroppableDay } from './agenda-droppable-day'
import {
  agendaDayHeaders,
  indexItemsByDay,
  isAgendaDayPast,
  timeToMinutes,
  toIsoLocalDate,
  weekDaysFromAnchor,
} from './agenda-layout'

/** Ventana visible 06:00–24:00 (18 h) para posicionar cards con horario. */
const DAY_START_MIN = 6 * 60
const DAY_SPAN_MIN = 18 * 60

interface AgendaWeekGridProps {
  items: PublicadorAgendaItemResponse[]
  weekAnchor: LocalDate
}

export function AgendaWeekGrid({ items, weekAnchor }: AgendaWeekGridProps) {
  const days = weekDaysFromAnchor(weekAnchor)
  const byDay = indexItemsByDay(items)
  const today = toIsoLocalDate(new Date())

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/60 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {days.map((iso, i) => {
          const isPast = isAgendaDayPast(iso, today)
          return (
            <div
              key={iso}
              className={`flex items-center justify-center gap-1 px-1 py-2 ${
                iso === today ? 'text-sky-300' : isPast ? 'text-slate-500' : ''
              }`}
            >
              <div>
                <span>{agendaDayHeaders()[i]}</span>
                <span className="mt-0.5 block text-xs font-bold text-slate-200">
                  {Number(iso.slice(8, 10))}
                </span>
              </div>
              {isPast ? (
                <Lock className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-7">
        {days.map((iso) => {
          const dayItems = byDay.get(iso) ?? []
          const isPast = isAgendaDayPast(iso, today)
          return (
            <AgendaDroppableDay
              key={iso}
              iso={iso}
              className={`relative min-h-72 border-b border-r border-slate-800/60 p-1 ${
                isPast
                  ? 'bg-slate-900/70'
                  : iso === today
                    ? 'bg-sky-950/30'
                    : 'bg-slate-950'
              }`}
            >
              {isPast ? (
                <div
                  className="pointer-events-none absolute inset-0 z-0 bg-slate-950/35"
                  aria-hidden
                />
              ) : null}
              {dayItems.map((item, index) => (
                <WeekDayCard key={`${item.propuestaId}-${iso}`} item={item} dayIso={iso} stackIndex={index} />
              ))}
            </AgendaDroppableDay>
          )
        })}
      </div>
    </div>
  )
}

function WeekDayCard({
  item,
  dayIso,
  stackIndex,
}: {
  item: PublicadorAgendaItemResponse
  dayIso: LocalDate
  stackIndex: number
}) {
  const start = timeToMinutes(item.horarioInicio)
  const end = timeToMinutes(item.horarioFin)
  const card = <AgendaDraggableCard item={item} dayIso={dayIso} compact />

  if (start == null || end == null || end <= start) {
    return (
      <div
        className="absolute inset-x-1 z-10"
        style={{ top: `${4 + stackIndex * 28}%` }}
      >
        {card}
      </div>
    )
  }

  const topPct = Math.max(0, ((start - DAY_START_MIN) / DAY_SPAN_MIN) * 100)
  const heightPct = Math.max(8, ((end - start) / DAY_SPAN_MIN) * 100)

  return (
    <div
      className="absolute inset-x-1 z-10"
      style={{ top: `${topPct}%`, height: `${Math.min(heightPct, 100 - topPct)}%` }}
    >
      {card}
    </div>
  )
}
