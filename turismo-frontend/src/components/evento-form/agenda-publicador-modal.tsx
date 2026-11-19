import { useEffect, useMemo, useState } from 'react'

import { usePublicadorAgenda } from '@/api/publicador-portal'
import {
  agendaDayHeaders,
  indexItemsByDay,
  monthCellDays,
  monthLabel,
} from '@/components/publicador-agenda/agenda-layout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LocalDate } from '@/types/api'

interface AgendaPublicadorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fechaInicio: string
  fechaFin: string
  onSelectInicio: (fecha: LocalDate) => void
  onSelectFin: (fecha: LocalDate) => void
}

/** Agenda propia del publicador en un modal, para no ocupar espacio en el formulario. */
export function AgendaPublicadorModal({
  open,
  onOpenChange,
  fechaInicio,
  fechaFin,
  onSelectInicio,
  onSelectFin,
}: AgendaPublicadorModalProps) {
  const query = usePublicadorAgenda(open)
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [monthIndex, setMonthIndex] = useState(today.getMonth())

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const items = useMemo(() => query.data ?? [], [query.data])
  const byDay = useMemo(() => indexItemsByDay(items), [items])
  const cells = useMemo(() => monthCellDays(year, monthIndex), [year, monthIndex])
  const headers = agendaDayHeaders()

  if (!open) return null

  function moverMes(delta: number) {
    const next = monthIndex + delta
    if (next < 0) {
      setYear((value) => value - 1)
      setMonthIndex(11)
    } else if (next > 11) {
      setYear((value) => value + 1)
      setMonthIndex(0)
    } else {
      setMonthIndex(next)
    }
  }

  function elegirDia(day: LocalDate) {
    if (fechaInicio === '' || (fechaInicio !== '' && fechaFin !== '')) {
      onSelectInicio(day)
      onSelectFin(day)
      return
    }
    if (day < fechaInicio) {
      onSelectInicio(day)
      onSelectFin(fechaInicio)
      return
    }
    onSelectFin(day)
  }

  const enRango = (day: LocalDate) =>
    fechaInicio !== '' &&
    (fechaFin === '' ? day === fechaInicio : day >= fechaInicio && day <= fechaFin)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Mi agenda"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Mi agenda</h2>
            <p className="text-xs text-slate-500">
              Elegí el inicio y el fin. El solapamiento está permitido.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Cerrar agenda"
            onClick={() => onOpenChange(false)}
          >
            ✕
          </Button>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => moverMes(-1)}>
            ‹
          </Button>
          <p className="font-heading text-sm font-bold capitalize text-slate-800">
            {monthLabel(year, monthIndex)}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => moverMes(1)}>
            ›
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400">
          {headers.map((header) => (
            <span key={header}>{header}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (day === null) return <span key={`empty-${index}`} />
            const count = byDay.get(day)?.length ?? 0
            return (
              <button
                key={day}
                type="button"
                onClick={() => elegirDia(day)}
                className={cn(
                  'relative flex h-10 items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                  enRango(day)
                    ? 'bg-sky-600 text-white'
                    : count > 0
                      ? 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                      : 'text-slate-600 hover:bg-slate-100',
                )}
                title={`${day}${count > 0 ? ` · ${count} propuesta(s)` : ''}`}
              >
                {Number(day.slice(-2))}
                {count > 0 ? (
                  <span
                    className={cn(
                      'absolute bottom-1 h-1 w-1 rounded-full',
                      enRango(day) ? 'bg-white' : 'bg-sky-500',
                    )}
                  />
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          {fechaInicio === ''
            ? 'Elegí un día para marcar el inicio.'
            : `Rango elegido: ${fechaInicio}${fechaFin !== '' && fechaFin !== fechaInicio ? ` a ${fechaFin}` : ''}.`}
        </div>

        {query.isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">Cargando agenda…</p>
        ) : null}
        {query.isError ? (
          <p className="mt-3 text-xs text-destructive">No se pudo cargar la agenda.</p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Listo
          </Button>
        </div>
      </section>
    </div>
  )
}
