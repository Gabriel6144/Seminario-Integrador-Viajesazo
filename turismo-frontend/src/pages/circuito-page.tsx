import { ArrowLeftIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  useAgregarParadaSugerida,
  useAlternativasReemplazo,
  useCircuito,
  useCircuitoSeleccionado,
  useDescartarAvisoDia,
  useEliminarParadaCircuito,
  useGenerarCircuito,
  useReemplazarParadaCircuito,
  useSeleccionarCircuito,
  useSugerenciasDia,
} from '@/api/circuitos'
import { useCancelarViaje, useViaje } from '@/api/viajes'
import { CircuitoDiaSplitView } from '@/components/planificador/circuito-dia-split-view'
import { CircuitoMapaGeneralView } from '@/components/planificador/circuito-mapa-general-view'
import { CircuitoPdfPreviewDialog } from '@/components/planificador/circuito-pdf-preview-dialog'
import { CompletarDiaDialog } from '@/components/planificador/completar-dia-dialog'
import {
  enrichCircuitoConSeleccionado,
  firstDayWithStops,
  toCircuitoRecomendado,
} from '@/components/planificador/circuito-view-model'
import { EliminarParadaDialog } from '@/components/planificador/parada-dialogs'
import { SustituirParadaPanel } from '@/components/planificador/sustituir-parada-panel'
import { PARAM_DIA, Paso10Circuito } from '@/components/planificador/paso-10-circuito'
import type {
  ParadaCircuitoDetalle,
  ViajeResumenCircuito,
} from '@/components/planificador/types'
import { PlanificadorRegenerateModal } from '@/components/planificador/planificador-regenerate-modal'
import { ErrorState } from '@/components/query-state'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toUserMessage } from '@/lib/http'
import { parseId } from '@/lib/parse-id'
import type {
  CircuitStrategy,
  TipoRitmo,
} from '@/types/api'

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
  MANUAL: 'Manual',
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
  const cancelarViaje = useCancelarViaje()
  const eliminar = useEliminarParadaCircuito()
  const reemplazar = useReemplazarParadaCircuito()
  const seleccionar = useSeleccionarCircuito()
  const agregarSugerida = useAgregarParadaSugerida()
  const descartarAviso = useDescartarAvisoDia()
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false)
  const [stopToDelete, setStopToDelete] = useState<ParadaCircuitoDetalle | null>(null)
  const [stopToReplace, setStopToReplace] = useState<ParadaCircuitoDetalle | null>(null)
  const [sugerenciasFecha, setSugerenciasFecha] = useState<string | null>(null)
  const [addingPropuestaId, setAddingPropuestaId] = useState<number | null>(null)
  const [sugerenciaError, setSugerenciaError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [selectionActiveDay, setSelectionActiveDay] = useState(1)
  const [selectionSuccess, setSelectionSuccess] = useState(false)
  const alternativas = useAlternativasReemplazo(
    viajeId,
    stopToReplace === null ? null : Number(stopToReplace.id),
  )
  const sugerencias = useSugerenciasDia(viajeId, sugerenciasFecha)

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
        toast.error(toUserMessage(error) || 'No pudimos regenerar el circuito')
      },
    )
  }

  const handleCancelarViaje = () => {
    if (viajeId === null) return
    cancelarViaje.mutate(viajeId, {
      onSuccess: () => {
        setIsCancelModalOpen(false)
        toast.success('Viaje cancelado correctamente')
        navigate('/borradores')
      },
      onError: (error: unknown) => {
        toast.error(toUserMessage(error) || 'No pudimos cancelar el viaje')
      },
    })
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
    const rhythmLabel = viajeQuery.data?.ritmo
      ? RHYTHM_LABELS[viajeQuery.data.ritmo]
      : 'Equilibrado'
    const base = toCircuitoRecomendado(
      alternativaSeleccionada,
      rhythmLabel,
      viajeQuery.data?.fechaInicio ?? undefined,
      viajeQuery.data?.fechaFin ?? undefined,
    )
    return enrichCircuitoConSeleccionado(base, circuito)
  }, [
    alternativaSeleccionada,
    circuito,
    viajeQuery.data?.ritmo,
    viajeQuery.data?.fechaInicio,
    viajeQuery.data?.fechaFin,
  ])

  const viajeResumen = useMemo<ViajeResumenCircuito | null>(() => {
    if (!viajeQuery.data) return null
    const viaje = viajeQuery.data
    return {
      nombre: viaje.nombre,
      zona: viaje.ubicacion?.nombre ?? viaje.ubicacion?.ciudad ?? null,
      fechaInicio: viaje.fechaInicio,
      fechaFin: viaje.fechaFin,
      rangoInteresKm: viaje.rangoInteresKm,
      intereses: viaje.interesesCategoria,
      ritmoLabel: viaje.ritmo ? RHYTHM_LABELS[viaje.ritmo] : null,
    }
  }, [viajeQuery.data])

  // El día que se está viendo vive en la URL (`?dia=2`): un F5 vuelve al mismo día y, después de
  // sustituir o eliminar una parada, la vista se queda donde estaba en lugar de saltar al primero.
  const [searchParams, setSearchParams] = useSearchParams()
  const diaEnUrl = Number(searchParams.get(PARAM_DIA))
  const activeDay =
    richCircuito === null
      ? 1
      : richCircuito.days.some((day) => day.number === diaEnUrl)
        ? diaEnUrl
        : firstDayWithStops(richCircuito)
  const setActiveDay = (day: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(PARAM_DIA, String(day))
        return next
      },
      { replace: true },
    )
  }

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
            viajeId={viajeId}
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
            viajeResumen={viajeResumen}
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

  const handleDelete = () => {
    const target = stopToDelete
    if (target === null) return
    eliminar.mutateAsync({ viajeId, itemId: Number(target.id) }).then(
      () => {
        setStopToDelete(null)
        toast.success('Parada eliminada correctamente')
      },
      (error: unknown) => {
        toast.error(toUserMessage(error) || 'No pudimos eliminar la parada')
      },
    )
  }

  const closeReplace = () => setStopToReplace(null)
  const openReplaceByStop = (stop: ParadaCircuitoDetalle) => setStopToReplace(stop)
  const openDeleteByStop = (stop: ParadaCircuitoDetalle) => setStopToDelete(stop)

  const handleReplace = (propuestaId: number) => {
    const target = stopToReplace
    if (target === null) return
    reemplazar.mutateAsync({ viajeId, itemId: Number(target.id), propuestaId }).then(
      () => {
        closeReplace()
        toast.success('Parada reemplazada correctamente')
      },
      (error: unknown) => {
        toast.error(toUserMessage(error) || 'No pudimos reemplazar la parada')
      },
    )
  }

  const closeSugerencias = () => {
    setSugerenciasFecha(null)
    setAddingPropuestaId(null)
    setSugerenciaError(null)
  }

  const handleDejarloAsi = (fecha: string) => {
    descartarAviso.mutate(
      { viajeId, fecha },
      {
        onSuccess: () => {
          toast.success('Dejamos el día como está')
        },
        onError: (error) => {
          toast.error(toUserMessage(error) || 'No pudimos guardar la decisión')
        },
      },
    )
  }

  const handleAgregarSugerencia = (propuestaId: number) => {
    if (sugerenciasFecha === null) return
    setAddingPropuestaId(propuestaId)
    setSugerenciaError(null)
    agregarSugerida.mutate(
      { viajeId, fecha: sugerenciasFecha, propuestaId },
      {
        onSuccess: () => {
          toast.success('Parada agregada al día')
          setAddingPropuestaId(null)
        },
        onError: (error) => {
          const message = toUserMessage(error) || 'No pudimos agregar la sugerencia'
          setSugerenciaError(message)
          toast.error(message)
          setAddingPropuestaId(null)
        },
      },
    )
  }

  if (showMap && richCircuito) {
    return (
      <div className="flex flex-col gap-4">
        <CircuitoMapaGeneralView
          circuito={richCircuito}
          viajeId={viajeId}
          onBack={() => setShowMap(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/borradores"
          className="flex w-fit items-center gap-2 text-sm font-semibold text-sky-700 transition-colors hover:text-sky-900"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Volver a Mis viajes
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPdfPreviewOpen(true)}
            className="rounded-xl"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            Exportar PDF
          </Button>
          {viajeQuery.data?.estado === 'PLANIFICADO' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCancelModalOpen(true)}
              className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              Cancelar viaje
            </Button>
          ) : null}
        </div>
      </div>

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
        <CircuitoDiaSplitView
          circuito={richCircuito}
          activeDay={activeDay}
          onChangeActiveDay={setActiveDay}
          onBackToList={() => window.history.back()}
          onExploreMap={() => setShowMap(true)}
          onReplaceStop={openReplaceByStop}
          onDeleteStop={openDeleteByStop}
          viajeId={viajeId}
          headerTitle="Circuito confirmado"
          backAriaLabel="Volver a Mis viajes"
          onVerSugerencias={setSugerenciasFecha}
          onDejarloAsi={handleDejarloAsi}
          descartandoAviso={descartarAviso.isPending}
          viaje={viajeResumen}
        />
      ) : circuitoGenerado.isPending ? (
        <CircuitoSkeleton />
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          El circuito todavía no tiene días para mostrar.
        </p>
      )}

      <EliminarParadaDialog
        parada={stopToDelete}
        paradasDelDia={richCircuito?.stopsByDay[activeDay] ?? []}
        confirmado
        isPending={eliminar.isPending}
        onCancel={() => setStopToDelete(null)}
        onConfirm={handleDelete}
      />

      <SustituirParadaPanel
        parada={stopToReplace}
        diaLabel={richCircuito?.days.find((day) => day.number === activeDay)?.label ?? ''}
        opciones={alternativas}
        isPending={reemplazar.isPending}
        onCancel={closeReplace}
        onConfirm={handleReplace}
      />

      <CompletarDiaDialog
        abierto={sugerenciasFecha !== null}
        sugerencias={sugerencias}
        agregandoId={addingPropuestaId}
        isPending={agregarSugerida.isPending}
        error={sugerenciaError}
        onClose={closeSugerencias}
        onAgregar={handleAgregarSugerencia}
      />

      <PlanificadorRegenerateModal
        isOpen={isRegenerateModalOpen}
        isRegenerating={regenerar.isPending}
        onClose={() => setIsRegenerateModalOpen(false)}
        onConfirm={handleRegenerate}
      />

      {richCircuito ? (
        <CircuitoPdfPreviewDialog
          abierto={isPdfPreviewOpen}
          circuito={richCircuito}
          viaje={viajeQuery.data ?? null}
          onClose={() => setIsPdfPreviewOpen(false)}
        />
      ) : null}

      <AlertDialog
        open={isCancelModalOpen}
        onOpenChange={(open) => {
          if (!open && !cancelarViaje.isPending) setIsCancelModalOpen(false)
        }}
      >
        <AlertDialogContent className="max-w-[380px] gap-5 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ffdad6]">
              <span className="material-symbols-outlined text-[28px] text-[#bb0413]">
                warning
              </span>
            </div>
            <div className="flex flex-col text-left">
              <AlertDialogTitle className="font-heading text-[22px] font-bold leading-tight text-[#191c1e]">
                ¿Cancelar este viaje?
              </AlertDialogTitle>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[#bb0413]">
                ACCIÓN IRREVERSIBLE
              </span>
            </div>
          </div>

          <AlertDialogDescription className="text-left text-[15px] leading-relaxed text-[#3f484e]">
            Vas a dejar de figurar como inscripto en las propuestas de este circuito. El viaje
            deja de aparecer en Mis viajes y no se puede recuperar.
          </AlertDialogDescription>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={cancelarViaje.isPending}
              className="h-14 rounded-2xl"
            >
              Mantener viaje
            </Button>
            <Button
              type="button"
              onClick={handleCancelarViaje}
              disabled={cancelarViaje.isPending}
              className="h-14 rounded-2xl bg-[#bb0413] text-white hover:bg-[#93000b]"
            >
              {cancelarViaje.isPending ? 'Cancelando...' : 'Sí, cancelar'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function describeReasons(motivos: string[]): string {
  const labels = motivos.map((motivo) => MOTIVO_LABELS[motivo] ?? motivo.toLowerCase())
  if (labels.length === 0) return 'los datos del viaje'
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`
}
