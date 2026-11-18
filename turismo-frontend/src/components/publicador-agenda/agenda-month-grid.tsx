import type { LocalDate, PublicadorAgendaItemResponse } from '@/types/api'

import { AgendaDraggableCard } from './agenda-draggable-card'
import { AgendaDroppableDay } from './agenda-droppable-day'
import { agendaDayHeaders, indexItemsByDay, monthCellDays, toIsoLocalDate } from './agenda-layout'

interface AgendaMonthGridProps {
  items: PublicadorAgendaItemResponse[]
  year: number
  monthIndex: number
}

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
          const item = byDay.get(iso as LocalDate)
          const isToday = iso === today
          return (
            <AgendaDroppableDay
              key={iso}
              iso={iso}
              className={`min-h-32 overflow-hidden rounded-md border border-slate-800/60 p-1.5 ${
                isToday ? 'bg-sky-950/40' : 'bg-slate-950'
              }`}
            >
              <p
                className={`mb-1.5 text-[10px] font-semibold ${
                  isToday ? 'text-sky-300' : 'text-slate-400'
                }`}
              >
                {Number(iso.slice(8, 10))}
              </p>
              {item ? <AgendaDraggableCard item={item} dayIso={iso} compact /> : null}
            </AgendaDroppableDay>
          )
        })}
      </div>
    </div>
  )
}
