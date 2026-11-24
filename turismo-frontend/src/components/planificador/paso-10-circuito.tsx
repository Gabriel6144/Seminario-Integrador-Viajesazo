import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  useAgregarParadaSugeridaAlternativa,
  useDiasAlternativa,
  useEliminarParadaAlternativa,
  useReemplazarParadaAlternativa,
  useReemplazosAlternativa,
  useSugerenciasDiaAlternativa,
} from '@/api/circuitos'
import { toUserMessage } from '@/lib/http'

import type {
  CircuitStrategy,
  GeneracionCircuitoResponse,
  ResumenDiaAlternativaResponse,
} from '@/types/api'
import { RHYTHM_MAP } from './constants'
import { CircuitoDiaSplitView } from './circuito-dia-split-view'
import { CircuitoMapaGeneralView } from './circuito-mapa-general-view'
import { firstDayWithStops, toCircuitoRecomendado } from './circuito-view-model'
import { CompletarDiaDialog } from './completar-dia-dialog'
import { EliminarParadaDialog } from './parada-dialogs'
import { SustituirParadaPanel } from './sustituir-parada-panel'
import type {
  CircuitoRecomendado,
  ParadaCircuitoDetalle,
  ViajeResumenCircuito,
} from './types'

/**
 * El detalle abierto vive en la URL (`?alternativa=CERCANIA&dia=2`) y no en un estado de React:
 * así un F5 vuelve al mismo circuito y al mismo día en lugar de caer en la lista de recomendados.
 */
export const PARAM_ALTERNATIVA = 'alternativa'
export const PARAM_DIA = 'dia'

/** Marca de `location.state` que indica que el detalle se abrió desde la lista de esta pantalla. */
const ABIERTO_DESDE_LISTA = 'circuitoAbiertoDesdeLista'

/**
 * Pone en cada día el estado que calcula el backend (cuántas paradas tiene contra las pedidas). Los
 * días que el turista decidió dejar así en esta pantalla dejan de mostrar el aviso.
 */
function conResumenDeDias(
  circuito: CircuitoRecomendado,
  dias: ResumenDiaAlternativaResponse[] | undefined,
  descartados: ReadonlySet<string>,
): CircuitoRecomendado {
  if (!dias) return circuito
  const porFecha = new Map(dias.map((dia) => [dia.fecha, dia.resumen] as const))
  return {
    ...circuito,
    days: circuito.days.map((day) => {
      const resumen = day.fecha ? porFecha.get(day.fecha) : undefined
      if (!resumen) return day
      if (day.fecha && descartados.has(`${circuito.estrategia}|${day.fecha}`)) {
        return {
          ...day,
          resumen: { ...resumen, avisoDescartado: true, pendiente: false, puedeCompletar: false },
        }
      }
      return { ...day, resumen }
    }),
  }
}

function diaValido(circuito: CircuitoRecomendado, dia: number): boolean {
  return Number.isInteger(dia) && circuito.days.some((day) => day.number === dia)
}

interface Paso10CircuitoProps {
  circuito: GeneracionCircuitoResponse
  /** Id del viaje/borrador: lo necesita el mapa OSRM del detalle. */
  viajeId: number
  rhythm: string
  dateFrom: string
  dateTo: string
  activeDay: number
  selectedStrategy: CircuitStrategy | null
  isSelecting: boolean
  showSuccessModal: boolean
  onChangeActiveDay: (day: number) => void
  onConfirmCircuit: (strategy: CircuitStrategy) => void
  onCloseSuccess: () => void
  onGoToTrips: () => void
  onRestart: () => void
  onBackToResumen?: () => void
  onRegenerate?: () => void
  /**
   * Se llama con el circuito actualizado después de sustituir o eliminar una parada. La caché de
   * TanStack ya queda al día; el planificador guarda el circuito en su propio estado y lo necesita.
   */
  onCircuitoChange?: (circuito: GeneracionCircuitoResponse) => void
  /** Datos del viaje para la ficha bajo el hero del detalle. */
  viajeResumen?: ViajeResumenCircuito | null
}

export function Paso10Circuito({
  circuito,
  viajeId,
  rhythm,
  dateFrom,
  dateTo,
  activeDay,
  selectedStrategy,
  isSelecting,
  showSuccessModal,
  onChangeActiveDay,
  onConfirmCircuit,
  onCloseSuccess,
  onGoToTrips,
  onRestart,
  onBackToResumen,
  onRegenerate,
  onCircuitoChange,
  viajeResumen = null,
}: Paso10CircuitoProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [mapCircuit, setMapCircuit] =
    useState<CircuitoRecomendado | null>(null)

  const circuitos = useMemo(
    () =>
      circuito.alternativas.map((alternativa) =>
        toCircuitoRecomendado(alternativa, rhythm, dateFrom, dateTo),
      ),
    [circuito.alternativas, rhythm, dateFrom, dateTo],
  )

  // Se busca por estrategia en la lista ya armada: si el circuito cambia (por ejemplo después de
  // sustituir o eliminar una parada) el detalle muestra la versión nueva sin cerrarse.
  const estrategiaAbierta = searchParams.get(PARAM_ALTERNATIVA)
  const circuitoAbierto = useMemo(
    () =>
      estrategiaAbierta === null
        ? null
        : (circuitos.find((item) => item.estrategia === estrategiaAbierta) ?? null),
    [circuitos, estrategiaAbierta],
  )

  // Completar días antes de confirmar: solo mientras no se eligió ninguna alternativa.
  const puedeEditar = selectedStrategy === null
  const diasAlternativa = useDiasAlternativa(
    viajeId,
    puedeEditar && circuitoAbierto !== null ? circuitoAbierto.estrategia : null,
  )
  const [diasDescartados, setDiasDescartados] = useState<ReadonlySet<string>>(() => new Set())
  const selectedCircuit = useMemo(
    () =>
      circuitoAbierto === null || !puedeEditar
        ? circuitoAbierto
        : conResumenDeDias(circuitoAbierto, diasAlternativa.data, diasDescartados),
    [circuitoAbierto, puedeEditar, diasAlternativa.data, diasDescartados],
  )

  const diaEnUrl = Number(searchParams.get(PARAM_DIA))
  const diaActivo =
    selectedCircuit === null
      ? activeDay
      : diaValido(selectedCircuit, diaEnUrl)
        ? diaEnUrl
        : firstDayWithStops(selectedCircuit)

  // Mantiene al padre al tanto del día que se ve (después de un F5 arranca en 1).
  useEffect(() => {
    if (selectedCircuit !== null && diaActivo !== activeDay) {
      onChangeActiveDay(diaActivo)
    }
  }, [selectedCircuit, diaActivo, activeDay, onChangeActiveDay])

  const openCircuit = (item: CircuitoRecomendado) => {
    const primerDia = firstDayWithStops(item)
    onChangeActiveDay(primerDia)
    // Entrada nueva en el historial: el botón "atrás" del navegador vuelve a la lista.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(PARAM_ALTERNATIVA, item.estrategia)
        next.set(PARAM_DIA, String(primerDia))
        return next
      },
      { state: { [ABIERTO_DESDE_LISTA]: true } },
    )
  }

  const changeDay = (day: number) => {
    onChangeActiveDay(day)
    // Cambiar de día reemplaza la entrada: "atrás" no recorre los días uno por uno.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(PARAM_DIA, String(day))
        return next
      },
      { replace: true, state: location.state },
    )
  }

  // Sustituir / eliminar paradas antes de confirmar. Una vez elegida una alternativa, las paradas
  // se editan desde el circuito confirmado (Mis viajes), así que acá los botones desaparecen.
  const [paradaAEliminar, setParadaAEliminar] = useState<ParadaCircuitoDetalle | null>(null)
  const [paradaASustituir, setParadaASustituir] = useState<ParadaCircuitoDetalle | null>(null)
  const eliminarParada = useEliminarParadaAlternativa()
  const reemplazarParada = useReemplazarParadaAlternativa()
  const reemplazos = useReemplazosAlternativa(
    viajeId,
    paradaASustituir === null ? null : (selectedCircuit?.estrategia ?? null),
    paradaASustituir === null ? null : Number(paradaASustituir.id),
  )

  const cerrarSustituir = () => setParadaASustituir(null)

  const [fechaACompletar, setFechaACompletar] = useState<string | null>(null)
  const [agregandoId, setAgregandoId] = useState<number | null>(null)
  const [errorSugerencia, setErrorSugerencia] = useState<string | null>(null)
  const sugerencias = useSugerenciasDiaAlternativa(
    viajeId,
    fechaACompletar === null ? null : (selectedCircuit?.estrategia ?? null),
    fechaACompletar,
  )
  const agregarSugerida = useAgregarParadaSugeridaAlternativa()

  const cerrarCompletar = () => {
    setFechaACompletar(null)
    setAgregandoId(null)
    setErrorSugerencia(null)
  }

  const agregarSugerencia = (propuestaId: number) => {
    if (fechaACompletar === null || selectedCircuit === null) return
    setAgregandoId(propuestaId)
    setErrorSugerencia(null)
    agregarSugerida
      .mutateAsync({
        viajeId,
        estrategia: selectedCircuit.estrategia,
        fecha: fechaACompletar,
        propuestaId,
      })
      .then(
        (actualizado) => {
          setAgregandoId(null)
          onCircuitoChange?.(actualizado)
          toast.success('Parada agregada al día')
        },
        (error: unknown) => {
          const message = toUserMessage(error) || 'No pudimos agregar la sugerencia'
          setAgregandoId(null)
          setErrorSugerencia(message)
          toast.error(message)
        },
      )
  }

  const dejarDiaAsi = (fecha: string) => {
    if (selectedCircuit === null) return
    const clave = `${selectedCircuit.estrategia}|${fecha}`
    setDiasDescartados((prev) => new Set(prev).add(clave))
  }

  const confirmarEliminar = () => {
    if (paradaAEliminar === null || selectedCircuit === null) return
    eliminarParada
      .mutateAsync({
        viajeId,
        estrategia: selectedCircuit.estrategia,
        itemId: Number(paradaAEliminar.id),
      })
      .then(
        (actualizado) => {
          setParadaAEliminar(null)
          onCircuitoChange?.(actualizado)
          toast.success('Parada eliminada correctamente')
        },
        (error: unknown) => {
          toast.error(toUserMessage(error) || 'No pudimos eliminar la parada')
        },
      )
  }

  const confirmarSustituir = (propuestaId: number) => {
    if (paradaASustituir === null || selectedCircuit === null) return
    reemplazarParada
      .mutateAsync({
        viajeId,
        estrategia: selectedCircuit.estrategia,
        itemId: Number(paradaASustituir.id),
        propuestaId,
      })
      .then(
        (actualizado) => {
          cerrarSustituir()
          onCircuitoChange?.(actualizado)
          toast.success('Parada reemplazada correctamente')
        },
        (error: unknown) => {
          toast.error(toUserMessage(error) || 'No pudimos reemplazar la parada')
        },
      )
  }

  const closeCircuit = () => {
    const state = location.state as Record<string, unknown> | null
    if (state?.[ABIERTO_DESDE_LISTA] === true) {
      // Se abrió desde la lista: volver es lo mismo que el "atrás" del navegador.
      void navigate(-1)
      return
    }
    // Se entró directo (link o F5 sin historial): se quita el detalle de la URL.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(PARAM_ALTERNATIVA)
        next.delete(PARAM_DIA)
        return next
      },
      { replace: true },
    )
  }

  if (mapCircuit !== null) {
    return (
      <CircuitoMapaGeneralView
        circuito={mapCircuit}
        viajeId={viajeId}
        onBack={() => setMapCircuit(null)}
      />
    )
  }

  if (selectedCircuit !== null) {
    return (
      <>
        <CircuitoDiaSplitView
          modo="recomendado"
          circuito={selectedCircuit}
          activeDay={diaActivo}
          onChangeActiveDay={changeDay}
          onBackToList={closeCircuit}
          onExploreMap={() => setMapCircuit(selectedCircuit)}
          viajeId={viajeId}
          selectedStrategy={selectedStrategy}
          isSelecting={isSelecting}
          showSuccessModal={showSuccessModal}
          onConfirmCircuit={() => onConfirmCircuit(selectedCircuit.estrategia)}
          onCloseSuccess={onCloseSuccess}
          onGoToTrips={onGoToTrips}
          onRestart={onRestart}
          ritmo={RHYTHM_MAP[rhythm] ?? null}
          onReplaceStop={puedeEditar ? setParadaASustituir : undefined}
          onDeleteStop={puedeEditar ? setParadaAEliminar : undefined}
          onVerSugerencias={puedeEditar ? setFechaACompletar : undefined}
          onDejarloAsi={puedeEditar ? dejarDiaAsi : undefined}
          viaje={viajeResumen}
        />

        <CompletarDiaDialog
          abierto={fechaACompletar !== null}
          sugerencias={sugerencias}
          agregandoId={agregandoId}
          isPending={agregarSugerida.isPending}
          error={errorSugerencia}
          onClose={cerrarCompletar}
          onAgregar={agregarSugerencia}
        />

        <EliminarParadaDialog
          parada={paradaAEliminar}
          paradasDelDia={selectedCircuit.stopsByDay[diaActivo] ?? []}
          confirmado={false}
          isPending={eliminarParada.isPending}
          onCancel={() => setParadaAEliminar(null)}
          onConfirm={confirmarEliminar}
        />

        <SustituirParadaPanel
          parada={paradaASustituir}
          diaLabel={selectedCircuit.days.find((day) => day.number === diaActivo)?.label ?? ''}
          opciones={reemplazos}
          isPending={reemplazarParada.isPending}
          onCancel={cerrarSustituir}
          onConfirm={confirmarSustituir}
        />
      </>
    )
  }

  return (
    <div className="w-full pb-8">
      <header className="mb-4 flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-3">
          {onBackToResumen && (
            <button
              type="button"
              onClick={onBackToResumen}
              aria-label="Volver al resumen"
              className="flex h-9 w-9 items-center justify-center rounded-full text-sky-600 transition-colors hover:bg-slate-100 active:scale-95"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Circuitos Recomendados
          </h1>
        </div>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Regenerar</span>
          </button>
        )}
      </header>

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
        Armamos estas alternativas con las propuestas disponibles para tus fechas. Explorá y elegí
        la ruta que mejor se adapte a tu viaje.
      </p>

      {circuito.advertencia && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <span className="material-symbols-outlined mt-0.5">info</span>
          <p className="text-xs font-medium sm:text-sm">{circuito.advertencia}</p>
        </div>
      )}

      {circuitos.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No encontramos propuestas disponibles para estas fechas y preferencias.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {circuitos.map((item) => {
            const isSelected = selectedStrategy === item.estrategia
            return (
              <article
                key={item.id}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                  isSelected
                    ? 'border-[#00658d] ring-2 ring-[#00658d]/30'
                    : 'border-slate-200/80'
                }`}
              >
                <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1 rounded-full border border-amber-300/60 bg-[#F7EBCB] px-3 py-1 text-xs font-bold text-[#7A5900] shadow-sm">
                  <span className="material-symbols-outlined fill text-[16px]">star</span>
                  <span>{item.affinity}</span>
                </div>

                {isSelected && (
                  <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Elegida</span>
                  </div>
                )}

                <div className="relative h-52 w-full overflow-hidden sm:h-56">
                  <div
                    className="h-full w-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{ backgroundImage: `url('${item.image}')` }}
                  />
                  <div className="absolute bottom-0 h-1/2 w-full bg-gradient-to-t from-white/80 to-transparent" />
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                  <h3 className="font-heading text-xl font-bold text-slate-900 transition-colors group-hover:text-[#00658d]">
                    {item.title}
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {item.chips.map((chip) => {
                      const chipStyle =
                        chip.variant === 'sky'
                          ? 'bg-[#EAF6FC] text-[#00658D]'
                          : chip.variant === 'amber'
                            ? 'bg-[#F7EBCB] text-[#7A5900]'
                            : 'bg-slate-100 text-slate-700'

                      return (
                        <span
                          key={chip.label}
                          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${chipStyle}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{chip.icon}</span>
                          <span>{chip.label}</span>
                        </span>
                      )
                    })}
                  </div>

                  <div className="mt-auto grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <h4 className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <span className="material-symbols-outlined text-[18px] text-rose-600">
                          check_circle
                        </span>
                        <span>Ventajas</span>
                      </h4>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 marker:text-rose-500/60">
                        {item.ventajas.map((ventaja) => (
                          <li key={ventaja}>{ventaja}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col gap-1">
                      <h4 className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <span className="material-symbols-outlined text-[18px] text-amber-700">
                          info
                        </span>
                        <span>Consideraciones</span>
                      </h4>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 marker:text-amber-600/60">
                        {item.consideraciones.map((consideracion) => (
                          <li key={consideracion}>{consideracion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-3 border-t border-slate-100 pt-3.5">
                    <button
                      type="button"
                      onClick={() => openCircuit(item)}
                      className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#65B7E8] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#52a6d8] active:scale-95"
                    >
                      Ver detalle
                    </button>
                    <button
                      type="button"
                      aria-label="Ver en mapa"
                      onClick={() => setMapCircuit(item)}
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-[#00658D] transition-colors hover:bg-slate-200 active:scale-95"
                    >
                      <span className="material-symbols-outlined">map</span>
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
