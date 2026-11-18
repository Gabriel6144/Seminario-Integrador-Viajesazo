import { useState } from 'react'

import { usePublicadorAgenda } from '@/api/publicador-portal'
import { AgendaCalendarShell } from '@/components/publicador-agenda/agenda-calendar-shell'
import {
  type AgendaCalendarView,
  daysInMonth,
  monthLabel,
  toIsoLocalDate,
  weekDaysFromAnchor,
  weekRangeLabel,
} from '@/components/publicador-agenda/agenda-layout'
import { PublicadorAgendaMonthList } from '@/components/publicador-agenda/publicador-agenda-month-list'
import { ErrorState, GridSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { addDaysLocalDate } from '@/lib/dates'
import type { LocalDate, PublicadorAgendaItemResponse } from '@/types/api'

function sortAgendaItems(items: PublicadorAgendaItemResponse[]) {
  return items.slice().sort((a, b) => {
    if (a.fechaInicio !== b.fechaInicio) return a.fechaInicio < b.fechaInicio ? -1 : 1
    if (a.fechaFin !== b.fechaFin) return a.fechaFin < b.fechaFin ? -1 : 1
    return a.nombre.localeCompare(b.nombre, 'es')
  })
}

/**
 * Agenda del publicador: listado (mes o semana) a la izquierda + calendario dark a la derecha.
 * No reemplaza la Agenda turística provincial.
 */
export function PublicadorAgendaPage() {
  const query = usePublicadorAgenda()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [monthIndex, setMonthIndex] = useState(today.getMonth())
  const [view, setView] = useState<AgendaCalendarView>('month')
  const [weekAnchor, setWeekAnchor] = useState<LocalDate>(() => toIsoLocalDate(today))

  if (query.isPending) return <GridSkeleton />
  if (query.isError) return <ErrorState error={query.error} />

  const allItems = query.data ?? []
  const weekDays = weekDaysFromAnchor(weekAnchor)
  const weekStart = weekDays[0]
  const weekEnd = weekDays[weekDays.length - 1]

  const totalDays = daysInMonth(year, monthIndex)
  const monthStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`

  const listItems = sortAgendaItems(
    allItems.filter((item) => {
      if (view === 'week') {
        return item.fechaFin >= weekStart && item.fechaInicio <= weekEnd
      }
      return item.fechaFin >= monthStart && item.fechaInicio <= monthEnd
    }),
  )

  const listTitle = view === 'week' ? 'Listado de la semana' : 'Listado del mes'
  const emptyTitle =
    view === 'week' ? 'Sin propuestas en esta semana' : 'Sin propuestas en este mes'
  const rangeNavLabel =
    view === 'week' ? weekRangeLabel(weekDays) : monthLabel(year, monthIndex)

  function goPrev() {
    if (view === 'week') {
      setWeekAnchor((a) => addDaysLocalDate(a, -7))
      return
    }
    if (monthIndex === 0) {
      setYear((y) => y - 1)
      setMonthIndex(11)
    } else {
      setMonthIndex((m) => m - 1)
    }
  }

  function goNext() {
    if (view === 'week') {
      setWeekAnchor((a) => addDaysLocalDate(a, 7))
      return
    }
    if (monthIndex === 11) {
      setYear((y) => y + 1)
      setMonthIndex(0)
    } else {
      setMonthIndex((m) => m + 1)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
          Mi agenda de propuestas
        </h2>
        <p className="text-sm text-[#3f484e]">
          Listado a la izquierda y calendario a la derecha. Arrastrá un evento o actividad a otro
          día (desde hoy en adelante) para reprogramarlo; se pide confirmación. Podés tener varias
          propuestas el mismo día.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={goPrev}>
          Anterior
        </Button>
        <p className="font-heading text-lg font-bold capitalize text-[#191c1e]">{rangeNavLabel}</p>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={goNext}>
          Siguiente
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="hidden items-center justify-between gap-2 lg:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={goPrev}
            >
              Anterior
            </Button>
            <p className="font-heading text-sm font-bold capitalize text-[#191c1e]">
              {rangeNavLabel}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={goNext}
            >
              Siguiente
            </Button>
          </div>
          <PublicadorAgendaMonthList
            monthItems={listItems}
            title={listTitle}
            emptyTitle={emptyTitle}
          />
        </div>

        <AgendaCalendarShell
          items={allItems}
          year={year}
          monthIndex={monthIndex}
          onMonthChange={(y, m) => {
            setYear(y)
            setMonthIndex(m)
          }}
          view={view}
          onViewChange={setView}
          weekAnchor={weekAnchor}
          onWeekAnchorChange={setWeekAnchor}
        />
      </div>
    </div>
  )
}
