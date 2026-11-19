import { useEffect, useRef, useState } from 'react'

import { useMarcarNotificacionLeida, useNotificaciones } from '@/api/notificaciones'
import { Button } from '@/components/ui/button'
import { formatLocalDate } from '@/lib/dates'
import type { NotificacionResponse } from '@/types/api'

/**
 * Campana in-app solo para TURISTA: contador de no leídas + lista corta.
 */
export function NotificacionesBell() {
  const { data = [], isLoading } = useNotificaciones(true)
  const marcarLeida = useMarcarNotificacionLeida()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const noLeidas = data.filter((n) => !n.leida).length

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function onSelect(n: NotificacionResponse) {
    if (!n.leida) {
      marcarLeida.mutate(n.id)
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="relative h-8 w-8 rounded-full px-0"
        aria-label={
          noLeidas > 0
            ? `Notificaciones, ${noLeidas} sin leer`
            : 'Notificaciones'
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="material-symbols-outlined text-xl text-[#3f484e]" aria-hidden>
          notifications
        </span>
        {noLeidas > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#bb0413] px-1 text-[10px] font-bold text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background p-2 shadow-lg"
          role="dialog"
          aria-label="Notificaciones"
        >
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notificaciones
          </p>
          {isLoading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Cargando…</p>
          ) : data.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No tenés notificaciones.</p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {data.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60 ${
                      n.leida ? 'opacity-70' : 'bg-sky-50/80'
                    }`}
                    onClick={() => onSelect(n)}
                  >
                    <p className="text-sm font-medium text-foreground">{n.titulo}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.cuerpo}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatCreadaEn(n.creadaEn)}
                      {!n.leida ? ' · sin leer' : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

function formatCreadaEn(iso: string): string {
  const d = iso.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return formatLocalDate(d)
  }
  return iso
}
