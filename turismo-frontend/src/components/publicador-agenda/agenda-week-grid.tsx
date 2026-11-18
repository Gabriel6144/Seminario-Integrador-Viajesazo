import type { LocalDate, PublicadorAgendaItemResponse } from '@/types/api'

import { AgendaDraggableCard } from './agenda-draggable-card'
import { AgendaDroppableDay } from './agenda-droppable-day'
import {
  agendaDayHeaders,
  indexItemsByDay,
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
        {days.map((iso, i) => (
          <div
            key={iso}
            className={`px-1 py-2 ${iso === today ? 'text-sky-300' : ''}`}
          >
            <span>{agendaDayHeaders()[i]}</span>
            <span className="mt-0.5 block text-xs font-bold text-slate-200">
              {Number(iso.slice(8, 10))}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((iso) => {
          const item = byDay.get(iso)
          return (
            <AgendaDroppableDay
              key={iso}
              iso={iso}
              className={`relative min-h-72 border-b border-r border-slate-800/60 p-1 ${
                iso === today ? 'bg-sky-950/30' : 'bg-slate-950'
              }`}
            >
              {item ? <WeekDayCard item={item} dayIso={iso} /> : null}
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
}: {
  item: PublicadorAgendaItemResponse
  dayIso: LocalDate
}) {
  const start = timeToMinutes(item.horarioInicio)
  const end = timeToMinutes(item.horarioFin)
  const card = <AgendaDraggableCard item={item} dayIso={dayIso} compact />

  if (start == null || end == null || end <= start) {
    return <div className="absolute inset-x-1 top-1 z-10">{card}</div>
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
