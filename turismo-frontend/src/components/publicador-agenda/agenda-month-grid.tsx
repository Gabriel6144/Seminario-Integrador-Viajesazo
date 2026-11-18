import { Lock } from 'lucide-react'

import type { LocalDate, PublicadorAgendaItemResponse } from '@/types/api'

import { AgendaDraggableCard } from './agenda-draggable-card'
import { AgendaDroppableDay } from './agenda-droppable-day'
import {
  agendaDayHeaders,
  indexItemsByDay,
  isAgendaDayPast,
  monthCellDays,
  toIsoLocalDate,
} from './agenda-layout'

interface AgendaMonthGridProps {
  items: PublicadorAgendaItemResponse[]
  year: number
  monthIndex: number
}

const MAX_VISIBLE = 3

export function AgendaMonthGrid({ items, year, monthIndex }: AgendaMonthGridProps) {
  const byDay = indexItemsByDay(items)
  const cells = monthCellDays(year, monthIndex)
  const today = toIsoLocalDate(new Date())

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/60 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {agendaDayHeaders().map((d) => (
          <div key={d} className="px-1 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 bg-slate-900 p-1">
        {cells.map((iso, index) => {
          if (iso === null) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-32 rounded-md border border-slate-800/40 bg-slate-950/40"
              />
            )
          }
          const dayItems = byDay.get(iso as LocalDate) ?? []
          const isToday = iso === today
          const isPast = isAgendaDayPast(iso, today)
          const visible = dayItems.slice(0, MAX_VISIBLE)
          const overflow = dayItems.length - visible.length

          return (
            <AgendaDroppableDay
              key={iso}
              iso={iso}
              className={`relative min-h-32 overflow-hidden rounded-md border p-1.5 ${
                isPast
                  ? 'border-slate-800/40 bg-slate-900/70'
                  : isToday
                    ? 'border-slate-800/60 bg-sky-950/40'
                    : 'border-slate-800/60 bg-slate-950'
              }`}
            >
              {isPast ? (
                <div
                  className="pointer-events-none absolute inset-0 bg-slate-950/35"
                  aria-hidden
                />
              ) : null}
              <div className="relative mb-1.5 flex items-center justify-between gap-1">
                <p
                  className={`text-[10px] font-semibold ${
                    isToday ? 'text-sky-300' : isPast ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {Number(iso.slice(8, 10))}
                </p>
                {isPast ? (
                  <Lock
                    className="h-3 w-3 shrink-0 text-slate-500"
                    aria-label="Día pasado: no se pueden mover propuestas aquí"
                  />
                ) : null}
              </div>
              <div className="relative flex max-h-24 flex-col gap-1 overflow-y-auto">
                {visible.map((item) => (
                  <AgendaDraggableCard
                    key={`${item.propuestaId}-${iso}`}
                    item={item}
                    dayIso={iso}
                    compact
                  />
                ))}
                {overflow > 0 ? (
                  <p className="px-0.5 text-[9px] font-medium text-slate-400">+{overflow} más</p>
                ) : null}
              </div>
            </AgendaDroppableDay>
          )
        })}
      </div>
    </div>
  )
}
