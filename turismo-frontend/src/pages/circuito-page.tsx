import { ArrowLeftIcon, ClockIcon, MapPinIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  useAlternativasReemplazo,
  useCircuito,
  useCircuitoSeleccionado,
  useEliminarParadaCircuito,
  useGenerarCircuito,
  useReemplazarParadaCircuito,
  useSeleccionarCircuito,
} from '@/api/circuitos'
import { useViaje } from '@/api/viajes'
import { CategoriaBadge } from '@/components/categoria-badge'
import { CircuitoDetalleView } from '@/components/planificador/circuito-detalle-view'
import { CircuitoMapaGeneralView } from '@/components/planificador/circuito-mapa-general-view'
import {
  firstDayWithStops,
  toCircuitoRecomendado,
} from '@/components/planificador/circuito-view-model'
import { Paso10Circuito } from '@/components/planificador/paso-10-circuito'
import type { ParadaCircuitoDetalle } from '@/components/planificador/types'
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
import { formatTimeRange } from '@/lib/dates'
import { toUserMessage } from '@/lib/http'
import { parseId } from '@/lib/parse-id'
import type { AlternativaItemResponse, CircuitStrategy, TipoRitmo } from '@/types/api'

const MOTIVO_LABELS: Record<string, string> = {
  FECHAS: 'fechas del viaje',
  PREFERENCIAS: 'intereses',
  ZONA: 'zona de destino',
  RITMO: 'ritmo',
}

const RHYTHM_LABELS: Record<TipoRitmo, string> = {
  TRANQUILO: 'Tranquilo',
  EQUILIBRADO: 'Equilibrado',
  INTENSIVO: 'Intensivo',
}

function locationLabel(
  item: Pick<AlternativaItemResponse, 'direccion' | 'localidad' | 'ciudad'>,
): string {
  const parts = [item.direccion, item.localidad, item.ciudad]
    .filter((part): part is string => Boolean(part && part.trim()))
    .filter((part, index, all) => all.indexOf(part) === index)
  return parts.length > 0 ? parts.join(', ') : 'Ubicación a confirmar'
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
  const navigate = useNavigate()
  const { id: rawId } = useParams()
  const viajeId = parseId(rawId)
  const query = useCircuitoSeleccionado(viajeId)
  const circuitoGenerado = useCircuito(viajeId)
  const viajeQuery = useViaje(viajeId)
  const regenerar = useGenerarCircuito()
  const eliminar = useEliminarParadaCircuito()
  const reemplazar = useReemplazarParadaCircuito()
  const seleccionar = useSeleccionarCircuito()
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<AlternativaItemResponse | null>(null)
  const [itemToReplace, setItemToReplace] = useState<AlternativaItemResponse | null>(null)
  const [selectedPropuestaId, setSelectedPropuestaId] = useState<number | null>(null)
  const [activeDay, setActiveDay] = useState(1)
  const [showMap, setShowMap] = useState(false)
  const [selectionActiveDay, setSelectionActiveDay] = useState(1)
  const [selectionSuccess, setSelectionSuccess] = useState(false)
  const alternativas = useAlternativasReemplazo(viajeId, itemToReplace?.itemId ?? null)

  const handleRegenerate = () => {
    if (viajeId === null) return
    regenerar.mutateAsync({ viajeId, reemplazar: true }).then(
      () => {
        setIsRegenerateModalOpen(false)
        toast.success('Circuito regenerado correctamente')
        setSelectionSuccess(false)
        void query.refetch()
      },
      (error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : 'No pudimos regenerar el circuito',
        )
      },
    )
  }

  const circuito = query.data
  const alternativaSeleccionada = useMemo(() => {
    if (!circuito || !circuitoGenerado.data) return null
    return (
      circuitoGenerado.data.alternativas.find(
        (alt) => alt.estrategia === circuito.estrategia,
      ) ?? null
    )
  }, [circuito, circuitoGenerado.data])

  const richCircuito = useMemo(() => {
    if (!alternativaSeleccionada) return null
    return toCircuitoRecomendado(alternativaSeleccionada, 'Equilibrado')
  }, [alternativaSeleccionada])

  useEffect(() => {
    if (richCircuito) {
      setActiveDay(firstDayWithStops(richCircuito))
    }
  }, [richCircuito])

  if (viajeId === null) return <IdInvalido />

  const selectionErrorMessage = query.isError
    ? toUserMessage(query.error).toLowerCase()
    : ''
  const needsSelection = selectionErrorMessage.includes('no tiene una alternativa seleccionada')
  const needsGeneration = selectionErrorMessage.includes('no tiene un circuito generado')

  if (query.isPending) return <CircuitoSkeleton />

  if (query.isError && (needsSelection || needsGeneration)) {
    if (circuitoGenerado.isPending || viajeQuery.isPending) {
      return <CircuitoSkeleton />
    }

    if (needsGeneration) {
      return (
        <div className="flex flex-col gap-4">
          <Link to="/borradores" className="flex items-center gap-2 text-sm font-semibold text-sky-700">
            <ArrowLeftIcon className="size-4" aria-hidden />
            Volver a Mis viajes
          </Link>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Este viaje todavía no tiene un circuito generado.</p>
            <p className="mt-2">Podés generarlo desde el planificador para luego elegir una alternativa.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => navigate(`/viajes/${viajeId}/planificar`)}>
                Ir al planificador
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/borradores')}>
                Volver a Mis viajes
              </Button>
            </div>
          </div>
        </div>
      )
    }

    if (
      circuitoGenerado.isSuccess &&
      circuitoGenerado.data.alternativas.length > 0
    ) {
      const rhythmLabel = viajeQuery.data?.ritmo
        ? RHYTHM_LABELS[viajeQuery.data.ritmo]
        : 'Equilibrado'
      const dateFrom = viajeQuery.data?.fechaInicio ?? ''
      const dateTo = viajeQuery.data?.fechaFin ?? ''

      const handleConfirmSelection = (estrategia: CircuitStrategy) => {
        seleccionar.mutate(
          { viajeId, estrategia },
          {
            onSuccess: () => {
              setSelectionSuccess(true)
              toast.success('Alternativa seleccionada')
              void query.refetch()
            },
            onError: (error) => {
              toast.error(toUserMessage(error))
            },
          },
        )
      }

      return (
        <div className="flex flex-col gap-4">
          <Link
            to="/borradores"
            className="flex w-fit items-center gap-2 text-sm font-semibold text-sky-700 transition-colors hover:text-sky-900"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            Volver a Mis viajes
          </Link>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            <p className="font-semibold">Este viaje tiene alternativas generadas, pero todavía no elegiste una.</p>
            <p className="mt-1 text-sky-800">Elegí una alternativa para ver el circuito día por día.</p>
          </div>
          <Paso10Circuito
            circuito={circuitoGenerado.data}
            rhythm={rhythmLabel}
            dateFrom={dateFrom}
            dateTo={dateTo}
            activeDay={selectionActiveDay}
            selectedStrategy={circuitoGenerado.data.estrategiaSeleccionada}
            isSelecting={seleccionar.isPending}
            showSuccessModal={selectionSuccess}
            onChangeActiveDay={setSelectionActiveDay}
            onConfirmCircuit={handleConfirmSelection}
            onCloseSuccess={() => setSelectionSuccess(false)}
            onGoToTrips={() => navigate('/borradores')}
            onRestart={() => navigate('/borradores')}
            onRegenerate={() => setIsRegenerateModalOpen(true)}
          />

          <PlanificadorRegenerateModal
            isOpen={isRegenerateModalOpen}
            isRegenerating={regenerar.isPending}
            onClose={() => setIsRegenerateModalOpen(false)}
            onConfirm={handleRegenerate}
          />
        </div>
      )
    }

    if (circuitoGenerado.isError) {
      return (
        <div className="flex flex-col gap-4">
          <Link to="/borradores" className="flex items-center gap-2 text-sm font-semibold text-sky-700">
            <ArrowLeftIcon className="size-4" aria-hidden />
            Volver a Mis viajes
          </Link>
          <ErrorState error={circuitoGenerado.error} />
        </div>
      )
    }
  }

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

  if (!circuito) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/borradores" className="flex items-center gap-2 text-sm font-semibold text-sky-700">
          <ArrowLeftIcon className="size-4" aria-hidden />
          Volver a Mis viajes
        </Link>
        <ErrorState error={new Error('No se pudo cargar la información')} />
      </div>
    )
  }

  const findSelectedItem = (itemId: number): AlternativaItemResponse | null => {
    for (const dia of circuito.dias) {
      const item = dia.items.find((candidate) => candidate.itemId === itemId)
      if (item) return item
    }
    return null
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

  const openReplaceByStop = (stop: ParadaCircuitoDetalle) => {
    const item = findSelectedItem(Number(stop.id))
    if (item) openReplace(item)
  }

  const openDeleteByStop = (stop: ParadaCircuitoDetalle) => {
    const item = findSelectedItem(Number(stop.id))
    if (item) setItemToDelete(item)
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

  if (showMap && richCircuito) {
    return (
      <div className="flex flex-col gap-4">
        <CircuitoMapaGeneralView circuito={richCircuito} onBack={() => setShowMap(false)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/borradores"
        className="flex w-fit items-center gap-2 text-sm font-semibold text-sky-700 transition-colors hover:text-sky-900"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Volver a Mis viajes
      </Link>

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

      {richCircuito ? (
        <CircuitoDetalleView
          circuito={richCircuito}
          activeDay={activeDay}
          selectedStrategy={circuito.estrategia}
          onChangeActiveDay={setActiveDay}
          onBackToList={() => window.history.back()}
          onExploreMap={() => setShowMap(true)}
          editable
          onReplaceStop={openReplaceByStop}
          onDeleteStop={openDeleteByStop}
          headerTitle="Circuito confirmado"
          backAriaLabel="Volver a Mis viajes"
          showHeroBadge={false}
          ritmo={viajeQuery.data?.ritmo ?? null}
        />
      ) : circuitoGenerado.isPending ? (
        <CircuitoSkeleton />
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          El circuito todavía no tiene días para mostrar.
        </p>
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

// Header visual se renderiza con el mismo formato de alternativas (CircuitoDetalleView).

function describeReasons(motivos: string[]): string {
  const labels = motivos.map((motivo) => MOTIVO_LABELS[motivo] ?? motivo.toLowerCase())
  if (labels.length === 0) return 'los datos del viaje'
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`
}
