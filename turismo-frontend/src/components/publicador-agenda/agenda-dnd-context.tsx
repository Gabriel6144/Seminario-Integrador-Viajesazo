import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

import { useReprogramarActividad } from '@/api/actividades'
import { useReprogramarEvento, useReprogramarPreview } from '@/api/eventos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { addDaysLocalDate, formatDateRange, formatLocalDate } from '@/lib/dates'
import { toUserMessage } from '@/lib/http'
import type { LocalDate, PublicadorAgendaItemResponse } from '@/types/api'

import { AgendaEventCard } from './agenda-event-card'
import {
  durationOffsetDays,
  isAgendaDayPast,
  isValidAgendaDrop,
  parseDraggableEventoId,
  toIsoLocalDate,
} from './agenda-layout'

interface PendingDrop {
  item: PublicadorAgendaItemResponse
  fechaOriginal: LocalDate
  fechaNueva: LocalDate
}

interface AgendaDndContextValue {
  items: PublicadorAgendaItemResponse[]
  activeItem: PublicadorAgendaItemResponse | null
  overDay: LocalDate | null
  isOverValid: boolean
}

const AgendaDndCtx = createContext<AgendaDndContextValue | null>(null)

export function useAgendaDnd(): AgendaDndContextValue {
  const ctx = useContext(AgendaDndCtx)
  if (!ctx) {
    throw new Error('useAgendaDnd debe usarse dentro de AgendaDndProvider')
  }
  return ctx
}

interface AgendaDndProviderProps {
  items: PublicadorAgendaItemResponse[]
  children: ReactNode
}

/**
 * DnD del calendario: silueta, celdas inválidas, modal de confirmación y PATCH reprogramar.
 * Toast solo al intentar soltar en un día pasado.
 */
export function AgendaDndProvider({ items, children }: AgendaDndProviderProps) {
  const reprogramarEvento = useReprogramarEvento()
  const reprogramarActividad = useReprogramarActividad()
  const [activeItem, setActiveItem] = useState<PublicadorAgendaItemResponse | null>(null)
  const [overDay, setOverDay] = useState<LocalDate | null>(null)
  const [pending, setPending] = useState<PendingDrop | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const saving = reprogramarEvento.isPending || reprogramarActividad.isPending

  // Preview/notificaciones solo para eventos.
  const preview = useReprogramarPreview(
    pending?.item.tipo === 'EVENTO' ? (pending.item.propuestaId ?? null) : null,
    pending?.item.tipo === 'EVENTO' ? (pending.fechaNueva ?? null) : null,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const today = toIsoLocalDate(new Date())
  const isOverValid =
    activeItem != null &&
    overDay != null &&
    isValidAgendaDrop(items, activeItem, overDay, today)

  const value = useMemo<AgendaDndContextValue>(
    () => ({ items, activeItem, overDay, isOverValid }),
    [items, activeItem, overDay, isOverValid],
  )

  function findItem(propuestaId: number): PublicadorAgendaItemResponse | undefined {
    return items.find((i) => i.propuestaId === propuestaId)
  }

  function onDragStart(event: DragStartEvent) {
    const id = parseDraggableEventoId(event.active.id)
    if (id == null) return
    const item = findItem(id)
    if (item == null || (item.tipo !== 'EVENTO' && item.tipo !== 'ACTIVIDAD')) return
    setActiveItem(item)
    setModalError(null)
  }

  function onDragOver(event: DragOverEvent) {
    const overId = event.over?.id
    if (overId == null) {
      setOverDay(null)
      return
    }
    // Droppable ids son ISO LocalDate (yyyy-MM-dd)
    const iso = String(overId)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      setOverDay(null)
      return
    }
    setOverDay(iso)
  }

  function onDragEnd(event: DragEndEvent) {
    const item = activeItem
    setActiveItem(null)
    setOverDay(null)

    const overId = event.over?.id
    if (item == null || overId == null) return
    const target = String(overId)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) return
    // Destino pasado → feedback claro y snap-back.
    if (isAgendaDayPast(target, today)) {
      toast.error('No podés mover una propuesta a un día anterior a hoy.')
      return
    }
    if (!isValidAgendaDrop(items, item, target, today)) return

    setPending({
      item,
      fechaOriginal: item.fechaInicio,
      fechaNueva: target,
    })
    setModalError(null)
  }

  function onDragCancel() {
    setActiveItem(null)
    setOverDay(null)
  }

  function closeModal() {
    if (saving) return
    setPending(null)
    setModalError(null)
  }

  function confirmDrop() {
    if (!pending) return
    setModalError(null)
    const vars = { id: pending.item.propuestaId, fechaInicio: pending.fechaNueva }
    const callbacks = {
      onSuccess: () => {
        setPending(null)
        setModalError(null)
      },
      onError: (error: unknown) => {
        // Sin toast: feedback mínimo inline; el ítem no se movió en UI hasta el refetch.
        setModalError(toUserMessage(error))
      },
    }
    if (pending.item.tipo === 'ACTIVIDAD') {
      reprogramarActividad.mutate(vars, callbacks)
      return
    }
    reprogramarEvento.mutate(vars, callbacks)
  }

  return (
    <AgendaDndCtx.Provider value={value}>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <div className="w-44 scale-105 opacity-90 shadow-xl ring-2 ring-sky-400/50">
              <AgendaEventCard item={activeItem} compact />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AlertDialog
        open={pending != null}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reprogramación</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {pending ? (
                  <>
                    <p>
                      Se moverá &ldquo;{pending.item.nombre}&rdquo; del{' '}
                      {formatLocalDate(pending.fechaOriginal)} al{' '}
                      {formatLocalDate(pending.fechaNueva)}.
                    </p>
                    {durationOffsetDays(pending.item) > 0 ? (
                      <p>
                        Nuevo rango:{' '}
                        {formatDateRange(
                          pending.fechaNueva,
                          addDaysLocalDate(
                            pending.fechaNueva,
                            durationOffsetDays(pending.item),
                          ),
                        )}
                        . Se conserva la duración.
                      </p>
                    ) : (
                      <p>La propuesta sigue siendo de un solo día. Se conserva la duración.</p>
                    )}
                    {pending.item.tipo === 'EVENTO' ? (
                      <div className="mt-3 space-y-1 rounded-md border border-border bg-muted/40 p-3 text-foreground">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Vista previa de la notificación
                        </p>
                        {preview.isLoading ? (
                          <p className="text-sm text-muted-foreground">Cargando vista previa…</p>
                        ) : preview.isError ? (
                          <p className="text-sm text-destructive" role="alert">
                            No se pudo cargar la vista previa.
                          </p>
                        ) : preview.data ? (
                          <>
                            <p className="text-sm font-medium">{preview.data.titulo}</p>
                            <p className="text-sm text-muted-foreground">{preview.data.cuerpo}</p>
                            {preview.data.destinatarios > 0 ? (
                              <p className="text-sm">
                                Se notificará a {preview.data.destinatarios} turista
                                {preview.data.destinatarios === 1 ? '' : 's'}.
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Ningún turista tiene este evento en su circuito; no se enviarán
                                notificaciones.
                              </p>
                            )}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {modalError ? (
            <p className="text-sm text-destructive" role="alert">
              {modalError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={saving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault()
                confirmDrop()
              }}
            >
              {saving ? 'Guardando…' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AgendaDndCtx.Provider>
  )
}
