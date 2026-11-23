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
import { routeMetrics } from '@/lib/viajezaso/route-geometry'
import type { ParadaCircuitoDetalle } from './types'

/*
 * Diálogo "Eliminar parada". Lo usan el circuito confirmado (Mis viajes) y el detalle de un
 * circuito recomendado antes de confirmarlo. Además de pedir confirmación, cuenta qué pasa con el
 * día: cuántas paradas quedan, cómo se unen la anterior y la siguiente y, en un circuito ya
 * confirmado, que el turista deja de figurar como inscripto en esa propuesta.
 */

interface EliminarParadaDialogProps {
  /** Parada a eliminar; `null` cierra el diálogo. */
  parada: ParadaCircuitoDetalle | null
  /** Todas las paradas del día, en orden, incluida la que se elimina. */
  paradasDelDia: ParadaCircuitoDetalle[]
  /** true en un circuito confirmado: se avisa lo de la inscripción. */
  confirmado: boolean
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}

function kmEntre(a: ParadaCircuitoDetalle, b: ParadaCircuitoDetalle): number | null {
  if (a.latitud === undefined || a.longitud === undefined || b.latitud === undefined || b.longitud === undefined) {
    return null
  }
  return (
    routeMetrics([
      [a.latitud, a.longitud],
      [b.latitud, b.longitud],
    ]).total / 1000
  )
}

export function EliminarParadaDialog({
  parada,
  paradasDelDia,
  confirmado,
  isPending,
  onCancel,
  onConfirm,
}: EliminarParadaDialogProps) {
  const index = parada === null ? -1 : paradasDelDia.findIndex((stop) => stop.id === parada.id)
  const anterior = index > 0 ? paradasDelDia[index - 1] : null
  const siguiente = index >= 0 && index + 1 < paradasDelDia.length ? paradasDelDia[index + 1] : null
  const quedan = Math.max(paradasDelDia.length - (index >= 0 ? 1 : 0), 0)
  const union = anterior && siguiente ? kmEntre(anterior, siguiente) : null

  return (
    <AlertDialog
      open={parada !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <AlertDialogContent className="max-w-lg rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-lg font-bold">Eliminar parada</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Querés eliminar “{parada?.title}”{parada?.hours ? ` (${parada.hours})` : ''} del circuito?
            Se recalcularán los traslados y las métricas del recorrido.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {parada !== null && (
          <ul className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3.5 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-slate-500" aria-hidden>
                event_note
              </span>
              <span>
                {quedan === 0
                  ? 'El día va a quedar sin actividades.'
                  : `El día va a quedar con ${quedan} ${quedan === 1 ? 'parada' : 'paradas'}.`}
                {confirmado && quedan === 0 && ' Después podés completarlo con sugerencias.'}
              </span>
            </li>
            {anterior && siguiente && (
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-slate-500" aria-hidden>
                  route
                </span>
                <span>
                  Vas a ir de <strong>{anterior.title}</strong> directo a{' '}
                  <strong>{siguiente.title}</strong>
                  {union !== null && ` (≈ ${union.toFixed(1).replace('.', ',')} km en línea recta)`}.
                </span>
              </li>
            )}
            {confirmado && (
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-slate-500" aria-hidden>
                  person_remove
                </span>
                <span>Dejás de figurar como inscripto en esta propuesta.</span>
              </li>
            )}
          </ul>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
