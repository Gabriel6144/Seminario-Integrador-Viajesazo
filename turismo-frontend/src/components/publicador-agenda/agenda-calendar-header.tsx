import { Button } from '@/components/ui/button'

import type { AgendaCalendarView } from './agenda-layout'

interface AgendaCalendarHeaderProps {
  view: AgendaCalendarView
  rangeLabel: string
  onViewChange: (view: AgendaCalendarView) => void
  onPrev: () => void
  onNext: () => void
}

export function AgendaCalendarHeader({
  view,
  rangeLabel,
  onViewChange,
  onPrev,
  onNext,
}: AgendaCalendarHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="font-heading text-base font-bold tracking-tight text-slate-50 sm:text-lg">
        Calendario de Eventos y Actividades - Córdoba
      </h3>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="inline-flex rounded-full border border-slate-700 bg-slate-900 p-0.5">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              view === 'month'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => onViewChange('month')}
          >
            Mes
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              view === 'week'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => onViewChange('week')}
          >
            Semana
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-full border-slate-700 bg-slate-900 p-0 text-slate-200 hover:bg-slate-800"
            onClick={onPrev}
            aria-label="Anterior"
          >
            ‹
          </Button>
          <p className="min-w-[8.5rem] text-center text-xs font-medium capitalize text-slate-300">
            {rangeLabel}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-full border-slate-700 bg-slate-900 p-0 text-slate-200 hover:bg-slate-800"
            onClick={onNext}
            aria-label="Siguiente"
          >
            ›
          </Button>
        </div>
      </div>
    </div>
  )
}
