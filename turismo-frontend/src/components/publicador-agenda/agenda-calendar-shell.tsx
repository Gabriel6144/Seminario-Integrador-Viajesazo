import { useMemo } from 'react'

import { addDaysLocalDate } from '@/lib/dates'
import type { LocalDate, PublicadorAgendaItemResponse } from '@/types/api'

import { AgendaCalendarHeader } from './agenda-calendar-header'
import { AgendaDndProvider } from './agenda-dnd-context'
import {
  type AgendaCalendarView,
  monthLabel,
  weekDaysFromAnchor,
  weekRangeLabel,
} from './agenda-layout'
import { AgendaMonthGrid } from './agenda-month-grid'
import { AgendaWeekGrid } from './agenda-week-grid'

interface AgendaCalendarShellProps {
  items: PublicadorAgendaItemResponse[]
  year: number
  monthIndex: number
  onMonthChange: (year: number, monthIndex: number) => void
  view: AgendaCalendarView
  onViewChange: (view: AgendaCalendarView) => void
  weekAnchor: LocalDate
  onWeekAnchorChange: (anchor: LocalDate) => void
}

/**
 * Shell dark del calendario publicador: cabecera, Mes|Semana, grillas y DnD.
 * `view` / `weekAnchor` viven en la página para sincronizar el listado izquierdo.
 */
export function AgendaCalendarShell({
  items,
  year,
  monthIndex,
  onMonthChange,
  view,
  onViewChange,
  weekAnchor,
  onWeekAnchorChange,
}: AgendaCalendarShellProps) {
  const weekDays = useMemo(() => weekDaysFromAnchor(weekAnchor), [weekAnchor])
  const rangeLabel =
    view === 'month' ? monthLabel(year, monthIndex) : weekRangeLabel(weekDays)

  function goPrev() {
    if (view === 'month') {
      if (monthIndex === 0) onMonthChange(year - 1, 11)
      else onMonthChange(year, monthIndex - 1)
      return
    }
    onWeekAnchorChange(addDaysLocalDate(weekAnchor, -7))
  }

  function goNext() {
    if (view === 'month') {
      if (monthIndex === 11) onMonthChange(year + 1, 0)
      else onMonthChange(year, monthIndex + 1)
      return
    }
    onWeekAnchorChange(addDaysLocalDate(weekAnchor, 7))
  }

  function handleViewChange(next: AgendaCalendarView) {
    if (next === 'week') {
      onWeekAnchorChange(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`)
    }
    onViewChange(next)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-[0px_4px_24px_rgba(0,0,0,0.35)]">
      <AgendaCalendarHeader
        view={view}
        rangeLabel={rangeLabel}
        onViewChange={handleViewChange}
        onPrev={goPrev}
        onNext={goNext}
      />
      <AgendaDndProvider items={items}>
        {view === 'month' ? (
          <AgendaMonthGrid items={items} year={year} monthIndex={monthIndex} />
        ) : (
          <AgendaWeekGrid items={items} weekAnchor={weekAnchor} />
        )}
      </AgendaDndProvider>
    </section>
  )
}
