import type { UseQueryResult } from '@tanstack/react-query'
import { ClockIcon, MapPinIcon } from 'lucide-react'
import { useMemo } from 'react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatTimeRange } from '@/lib/dates'
import { toUserMessage } from '@/lib/http'
import type {
  MotivoSugerencia,
  SugerenciaDiaResponse,
  SugerenciasDiaResponse,
} from '@/types/api'

const SUGERENCIA_GROUP_LABELS: Record<MotivoSugerencia, string> = {
  DE_TUS_INTERESES: 'De tus intereses',
  OTRO_TIPO: 'De tus preferencias, otro tipo',
  OTRA_CATEGORIA: 'Fuera de tus preferencias',
}

const SUGERENCIA_GROUP_ORDER: MotivoSugerencia[] = [
  'DE_TUS_INTERESES',
  'OTRO_TIPO',
  'OTRA_CATEGORIA',
]

function locationLabel(
  item: Pick<SugerenciaDiaResponse, 'direccion' | 'localidad' | 'ciudad'>,
): string {
  const parts = [item.direccion, item.localidad, item.ciudad]
    .filter((part): part is string => Boolean(part && part.trim()))
    .filter((part, index, all) => all.indexOf(part) === index)
  return parts.length > 0 ? parts.join(', ') : 'Ubicación a confirmar'
}

interface CompletarDiaDialogProps {
  abierto: boolean
  sugerencias: UseQueryResult<SugerenciasDiaResponse>
  /** Propuesta que se está agregando, para mostrar "Agregando…" en su botón. */
  agregandoId: number | null
  isPending: boolean
  error: string | null
  onClose: () => void
  onAgregar: (propuestaId: number) => void
}

/**
 * Sugerencias para completar un día que quedó con menos paradas de las pedidas. Se usa igual en el
 * circuito confirmado y en el detalle de una alternativa antes de confirmar: quien la abre decide a
 * qué endpoint se le piden las sugerencias y a cuál se agrega.
 */
export function CompletarDiaDialog({
  abierto,
  sugerencias,
  agregandoId,
  isPending,
  error,
  onClose,
  onAgregar,
}: CompletarDiaDialogProps) {
  const agrupadas = useMemo(() => {
    const items = sugerencias.data?.sugerencias ?? []
    return SUGERENCIA_GROUP_ORDER.map((motivo) => ({
      motivo,
      label: SUGERENCIA_GROUP_LABELS[motivo],
      items: items.filter((item) => item.motivoSugerencia === motivo),
    })).filter((group) => group.items.length > 0)
  }, [sugerencias.data?.sugerencias])
  const noEntran = sugerencias.data?.noEntran ?? []

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <AlertDialogContent className="max-w-lg rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-lg font-bold">
            Completar el día
          </AlertDialogTitle>
          <AlertDialogDescription>
            Elegí propuestas para sumar a este día. Podés agregar varias, de a una. La generación
            no rellena sola: la decisión es tuya.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex max-h-80 flex-col gap-4 overflow-y-auto py-2">
          {sugerencias.isPending && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Buscando sugerencias...
            </p>
          )}
          {sugerencias.isError && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {toUserMessage(sugerencias.error)}
            </p>
          )}
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}
          {sugerencias.isSuccess && agrupadas.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              {sugerencias.data.mensaje ?? 'No encontramos propuestas para completar este día'}
            </p>
          )}
          {agrupadas.map((group) => (
            <div key={group.motivo} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {group.label}
              </p>
              {group.items.map((item) => (
                <div
                  key={item.propuestaId}
                  className="flex gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <img
                    src={item.imagenes[0] ?? 'https://placehold.co/80x80/e2e8f0/64748b?text=+'}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-sm font-bold text-slate-900">
                        {item.nombre}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {item.textoMotivo}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="size-3.5" aria-hidden />
                        {formatTimeRange(item.horaInicio, item.horaFin) ?? 'A confirmar'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="size-3.5" aria-hidden />
                        {locationLabel(item)}
                      </span>
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2"
                      disabled={isPending}
                      onClick={() => onAgregar(item.propuestaId)}
                    >
                      {agregandoId === item.propuestaId ? 'Agregando…' : 'Agregar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {noEntran.length > 0 && (
            <details className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-amber-900">
                No entran ese día ({noEntran.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-1.5">
                {noEntran.map((item) => (
                  <li key={item.propuestaId} className="text-xs text-amber-900">
                    <span className="font-semibold">{item.propuestaNombre}</span>
                    {item.meGusta ? ' (te gustó)' : ''}: {item.motivo}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onClose}>
            Cerrar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
