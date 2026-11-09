import {
  ArrowLeftIcon,
  ArrowRightLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  useAlternativasReemplazo,
  useCircuitoSeleccionado,
  useEliminarParadaCircuito,
  useGenerarCircuito,
  useReemplazarParadaCircuito,
} from '@/api/circuitos'
import { CategoriaBadge } from '@/components/categoria-badge'
import { PlanificadorRegenerateModal } from '@/components/planificador/planificador-regenerate-modal'
import { ErrorState } from '@/components/query-state'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateRange, formatLocalDate, formatTimeRange } from '@/lib/dates'
import { toUserMessage } from '@/lib/http'
import { parseId } from '@/lib/parse-id'
import {
  CIRCUIT_STRATEGY_LABELS,
  type AlternativaItemResponse,
  type CircuitoSeleccionadoResponse,
} from '@/types/api'

const MOTIVO_LABELS: Record<string, string> = {
  FECHAS: 'fechas del viaje',
  PREFERENCIAS: 'intereses',
  ZONA: 'zona de destino',
  RITMO: 'ritmo',
}

function locationLabel(
  item: Pick<AlternativaItemResponse, 'direccion' | 'localidad' | 'ciudad'>,
): string {
  const parts = [item.direccion, item.localidad, item.ciudad]
    .filter((part): part is string => Boolean(part && part.trim()))
    .filter((part, index, all) => all.indexOf(part) === index)
  return parts.length > 0 ? parts.join(', ') : 'Ubicación a confirmar'
}

function durationLabel(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

function CircuitoSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Cargando circuito">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </div>
  )
}

function IdInvalido() {
  return (
    <div className="flex flex-col gap-4">
      <Link to="/borradores" className="flex items-center gap-2 text-sm font-semibold text-sky-700">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Volver a Mis viajes
      </Link>
      <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        El identificador del viaje no es válido.
      </p>
    </div>
  )
}

export function CircuitoPage() {
  const { id: rawId } = useParams()
  const viajeId = parseId(rawId)
  const query = useCircuitoSeleccionado(viajeId)
  const regenerar = useGenerarCircuito()
  const eliminar = useEliminarParadaCircuito()
  const reemplazar = useReemplazarParadaCircuito()
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<AlternativaItemResponse | null>(null)
  const [itemToReplace, setItemToReplace] = useState<AlternativaItemResponse | null>(null)
  const [selectedPropuestaId, setSelectedPropuestaId] = useState<number | null>(null)
  const alternativas = useAlternativasReemplazo(viajeId, itemToReplace?.itemId ?? null)

  if (viajeId === null) return <IdInvalido />

  if (query.isPending) return <CircuitoSkeleton />

  if (query.isError) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/borradores" className="flex items-center gap-2 text-sm font-semibold text-sky-700">
          <ArrowLeftIcon className="size-4" aria-hidden />
          Volver a Mis viajes
        </Link>
        <ErrorState error={query.error} />
      </div>
    )
  }

  const circuito = query.data
  const firstDay = circuito.dias[0]?.fecha
  const lastDay = circuito.dias[circuito.dias.length - 1]?.fecha

  const handleRegenerate = () => {
    regenerar.mutateAsync({ viajeId, reemplazar: true }).then(
      () => {
        setIsRegenerateModalOpen(false)
        toast.success('Circuito regenerado correctamente')
      },
      (error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : 'No pudimos regenerar el circuito',
        )
      },
    )
  }

  const handleDelete = () => {
    const target = itemToDelete
    if (target === null) return
    eliminar.mutateAsync({ viajeId, itemId: target.itemId }).then(
      () => {
        setItemToDelete(null)
        toast.success('Parada eliminada correctamente')
      },
      (error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : 'No pudimos eliminar la parada',
        )
      },
    )
  }

  const closeReplace = () => {
    setItemToReplace(null)
    setSelectedPropuestaId(null)
  }

  const openReplace = (item: AlternativaItemResponse) => {
    setSelectedPropuestaId(null)
    setItemToReplace(item)
  }

  const handleReplace = () => {
    const target = itemToReplace
    if (target === null || selectedPropuestaId === null) return
    reemplazar.mutateAsync({ viajeId, itemId: target.itemId, propuestaId: selectedPropuestaId }).then(
      () => {
        closeReplace()
        toast.success('Parada reemplazada correctamente')
      },
      (error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : 'No pudimos reemplazar la parada',
        )
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/borradores"
        className="flex w-fit items-center gap-2 text-sm font-semibold text-sky-700 transition-colors hover:text-sky-900"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Volver a Mis viajes
      </Link>

      <CircuitoHeader circuito={circuito} firstDay={firstDay} lastDay={lastDay} />

      {circuito.advertencia && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <span className="material-symbols-outlined mt-0.5">info</span>
          <p className="text-xs font-medium sm:text-sm">{circuito.advertencia}</p>
        </div>
      )}

      {circuito.desactualizado && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-amber-700">update</span>
            <div>
              <h2 className="font-heading text-sm font-bold text-amber-900 sm:text-base">
                Este circuito quedó desactualizado
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-800 sm:text-sm">
                Cambiaron {describeReasons(circuito.motivosDesactualizacion)} después de generarlo.
                Regeneralo para volver a ajustar las paradas.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setIsRegenerateModalOpen(true)}
            className="shrink-0 rounded-xl bg-amber-700 text-white hover:bg-amber-800"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Regenerar circuito
          </Button>
        </div>
      )}

      {circuito.dias.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          El circuito todavía no tiene días para mostrar.
        </p>
      ) : (
        <section aria-label="Itinerario día por día" className="flex flex-col gap-4">
          {circuito.dias.map((dia, index) => (
            <article
              key={dia.fecha}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                    Día {index + 1}
                  </p>
                  <h2 className="font-heading text-base font-bold text-slate-900">
                    {formatLocalDate(dia.fecha)}
                  </h2>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  <CalendarDaysIcon className="size-3.5" aria-hidden />
                  {dia.items.length} {dia.items.length === 1 ? 'parada' : 'paradas'}
                </span>
              </header>

              {dia.items.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">Sin actividades programadas.</p>
              ) : (
                <ol className="divide-y divide-slate-100">
                  {dia.items.map((item) => (
                    <li key={item.itemId} className="flex gap-4 px-5 py-4">
                      <div className="flex w-20 shrink-0 flex-col gap-1 text-xs font-semibold text-sky-800">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="size-3.5" aria-hidden />
                          {formatTimeRange(item.horaInicio, item.horaFin) ?? 'A confirmar'}
                        </span>
                        {durationLabel(item.duracionMinutos) && (
                          <span className="font-normal text-slate-500">
                            {durationLabel(item.duracionMinutos)}
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-heading text-sm font-bold text-slate-900 sm:text-base">
                            {item.propuestaNombre}
                          </h3>
                          <CategoriaBadge categoria={item.categoria} />
                        </div>
                        <p className="flex items-start gap-1.5 text-xs text-slate-600">
                          <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          {locationLabel(item)}
                        </p>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openReplace(item)}
                          aria-label={`Sustituir ${item.propuestaNombre}`}
                          className="text-slate-400 hover:bg-sky-50 hover:text-sky-700"
                        >
                          <ArrowRightLeftIcon aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setItemToDelete(item)}
                          aria-label={`Eliminar ${item.propuestaNombre}`}
                          className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2Icon aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          ))}
        </section>
      )}

      <AlertDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null)
        }}
      >
        <AlertDialogContent className="max-w-lg rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-lg font-bold">
              Eliminar parada
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Querés eliminar “{itemToDelete?.propuestaNombre}” del circuito? Se
              recalcularán los traslados y las métricas del recorrido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminar.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={eliminar.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={itemToReplace !== null}
        onOpenChange={(open) => {
          if (!open) closeReplace()
        }}
      >
        <AlertDialogContent className="max-w-lg rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-lg font-bold">
              Sustituir parada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Elegí una propuesta para reemplazar “{itemToReplace?.propuestaNombre}”. Solo se
              muestran opciones que entran en el mismo bloque horario y respetan los traslados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto py-2">
            {alternativas.isPending && (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Buscando alternativas...
              </p>
            )}
            {alternativas.isError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {toUserMessage(alternativas.error)}
              </p>
            )}
            {alternativas.isSuccess && alternativas.data.alternativas.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                {alternativas.data.mensaje ??
                  'No hay propuestas disponibles para reemplazar esta parada.'}
              </p>
            )}
            {alternativas.isSuccess &&
              alternativas.data.alternativas.map((alternativa) => (
                <button
                  key={alternativa.propuestaId}
                  type="button"
                  onClick={() => setSelectedPropuestaId(alternativa.propuestaId)}
                  aria-pressed={selectedPropuestaId === alternativa.propuestaId}
                  className={`flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${
                    selectedPropuestaId === alternativa.propuestaId
                      ? 'border-sky-600 bg-sky-50'
                      : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-bold text-slate-900">
                      {alternativa.propuestaNombre}
                    </span>
                    <CategoriaBadge categoria={alternativa.categoria} />
                  </span>
                  <span className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3.5" aria-hidden />
                      {formatTimeRange(alternativa.horaInicio, alternativa.horaFin) ??
                        'A confirmar'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="size-3.5" aria-hidden />
                      {locationLabel(alternativa)}
                    </span>
                  </span>
                </button>
              ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={reemplazar.isPending} onClick={closeReplace}>
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={handleReplace}
              disabled={selectedPropuestaId === null || reemplazar.isPending}
            >
              {reemplazar.isPending ? 'Reemplazando...' : 'Reemplazar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlanificadorRegenerateModal
        isOpen={isRegenerateModalOpen}
        isRegenerating={regenerar.isPending}
        onClose={() => setIsRegenerateModalOpen(false)}
        onConfirm={handleRegenerate}
      />
    </div>
  )
}

function CircuitoHeader({
  circuito,
  firstDay,
  lastDay,
}: {
  circuito: CircuitoSeleccionadoResponse
  firstDay: string | undefined
  lastDay: string | undefined
}) {
  const paradas = circuito.dias.reduce((total, dia) => total + dia.items.length, 0)
  return (
    <header className="rounded-3xl bg-gradient-to-br from-[#00658d] via-sky-800 to-slate-900 p-6 text-white shadow-lg sm:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200">
        Circuito confirmado
      </p>
      <h1 className="font-heading mt-2 text-2xl font-bold sm:text-3xl">
        {CIRCUIT_STRATEGY_LABELS[circuito.estrategia]}
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-sky-100 sm:text-sm">
        {firstDay && lastDay && (
          <span className="flex items-center gap-1.5">
            <CalendarDaysIcon className="size-4" aria-hidden />
            {formatDateRange(firstDay, lastDay)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <MapPinIcon className="size-4" aria-hidden />
          {paradas} {paradas === 1 ? 'parada' : 'paradas'}
        </span>
        {circuito.distanciasEstimadas && (
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px]">
            Distancias estimadas
          </span>
        )}
      </div>
    </header>
  )
}

function describeReasons(motivos: string[]): string {
  const labels = motivos.map((motivo) => MOTIVO_LABELS[motivo] ?? motivo.toLowerCase())
  if (labels.length === 0) return 'los datos del viaje'
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`
}
