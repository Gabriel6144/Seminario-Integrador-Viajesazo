import { useDraggable } from '@dnd-kit/core'

import type { LocalDate, PublicadorAgendaItemResponse } from '@/types/api'

import { AgendaEventCard } from './agenda-event-card'
import { useAgendaDnd } from './agenda-dnd-context'
import { draggableIdForEvento } from './agenda-layout'

interface AgendaDraggableCardProps {
  item: PublicadorAgendaItemResponse
  /** Día de la celda (hace único el id de drag en rangos multi-día). */
  dayIso: LocalDate
  compact?: boolean
}

/**
 * Card arrastrable para EVENTO o ACTIVIDAD en cualquier día del rango.
 */
export function AgendaDraggableCard({
  item,
  dayIso,
  compact = true,
}: AgendaDraggableCardProps) {
  const canDrag = item.tipo === 'EVENTO' || item.tipo === 'ACTIVIDAD'
  const { activeItem } = useAgendaDnd()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableIdForEvento(item.propuestaId, dayIso),
    disabled: !canDrag,
    data: { propuestaId: item.propuestaId, tipo: item.tipo, dayIso },
  })

  if (!canDrag) {
    return <AgendaEventCard item={item} compact={compact} />
  }

  // Silueta = DragOverlay; todas las celdas del mismo ítem quedan atenuadas.
  const hidden = isDragging || activeItem?.propuestaId === item.propuestaId

  return (
    <div
      ref={setNodeRef}
      className={`cursor-grab touch-none active:cursor-grabbing ${hidden ? 'opacity-30' : ''}`}
      {...listeners}
      {...attributes}
    >
      <AgendaEventCard item={item} compact={compact} />
    </div>
  )
}
