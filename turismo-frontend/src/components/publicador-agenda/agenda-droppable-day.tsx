import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

import type { LocalDate } from '@/types/api'

import { useAgendaDnd } from './agenda-dnd-context'
import { isAgendaDayPast, isValidAgendaDrop, toIsoLocalDate } from './agenda-layout'

interface AgendaDroppableDayProps {
  iso: LocalDate
  className?: string
  children: ReactNode
}

/**
 * Celda/columna droppable. Marca inválido (rojo) si el destino es pasado u otro caso inválido.
 */
export function AgendaDroppableDay({ iso, className = '', children }: AgendaDroppableDayProps) {
  const today = toIsoLocalDate(new Date())
  const past = isAgendaDayPast(iso, today)
  const { setNodeRef, isOver } = useDroppable({ id: iso })
  const { activeItem, items } = useAgendaDnd()

  const invalid =
    isOver &&
    activeItem != null &&
    !isValidAgendaDrop(items, activeItem, iso, today)

  const validHint =
    isOver &&
    activeItem != null &&
    isValidAgendaDrop(items, activeItem, iso, today)

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${
        invalid
          ? 'ring-2 ring-inset ring-red-500/60 bg-red-950/40'
          : validHint
            ? 'ring-2 ring-inset ring-sky-500/50 bg-sky-950/50'
            : ''
      }`}
      data-day={iso}
      data-past={past || undefined}
      data-drop-invalid={invalid || undefined}
    >
      {children}
    </div>
  )
}
