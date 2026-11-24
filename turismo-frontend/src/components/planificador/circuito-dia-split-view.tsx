import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import type { CircuitStrategy, ResumenDiaCircuito, TipoRitmo } from '@/types/api'
import { AvisoDiaIncompleto } from './aviso-dia-incompleto'
import { CircuitoGuardadoModal } from './circuito-guardado-modal'
import { CircuitoParadaCard } from './circuito-parada-card'
import { CircuitoParadaDetalleModal } from './circuito-parada-detalle-modal'
import { CircuitoRutaMapa } from './circuito-ruta-mapa'
import { FichaViajeCircuito } from './ficha-viaje-circuito'
import { ParadaUbicacionMapaView } from './parada-ubicacion-mapa-view'
import type {
  CircuitoRecomendado,
  ParadaCircuitoDetalle,
  ViajeResumenCircuito,
} from './types'

export type CircuitoDiaModo = 'recomendado' | 'confirmado'

/** Referencia fija para los días sin paradas: un `[]` nuevo en cada render re-dispara efectos. */
const SIN_PARADAS: ParadaCircuitoDetalle[] = []

const RITMO_MIN_PARADAS: Record<TipoRitmo, number> = {
  TRANQUILO: 1,
  EQUILIBRADO: 3,
  INTENSIVO: 5,
  MANUAL: 0,
}

const RITMO_LABELS: Record<TipoRitmo, string> = {
  TRANQUILO: 'Tranquilo (1 a 2 paradas)',
  EQUILIBRADO: 'Equilibrado (3 a 4 paradas)',
  INTENSIVO: 'Intenso (5 o más actividades)',
  MANUAL: 'Manual (según tu plan diario)',
}

interface CircuitoDiaSplitViewProps {
  circuito: CircuitoRecomendado
  activeDay: number
  onChangeActiveDay: (day: number) => void
  onBackToList: () => void
  onExploreMap: () => void
  viajeId: number
  /** Default confirmado: Mis viajes. Recomendado: detalle de Paso10. */
  modo?: CircuitoDiaModo
  headerTitle?: string
  backAriaLabel?: string
  /** Sin los dos handlers la tarjeta no muestra Sustituir/Eliminar (por ejemplo, ya confirmado). */
  onReplaceStop?: (stop: ParadaCircuitoDetalle) => void
  onDeleteStop?: (stop: ParadaCircuitoDetalle) => void
  onVerSugerencias?: (fecha: string) => void
  onDejarloAsi?: (fecha: string) => void
  descartandoAviso?: boolean
  /** Solo modo recomendado. */
  selectedStrategy?: CircuitStrategy | null
  isSelecting?: boolean
  onConfirmCircuit?: () => void
  showSuccessModal?: boolean
  onCloseSuccess?: () => void
  onGoToTrips?: () => void
  onRestart?: () => void
  showHeroBadge?: boolean
  ritmo?: TipoRitmo | null
  /** Datos del viaje y preferencias del turista; la ficha se oculta si no vienen. */
  viaje?: ViajeResumenCircuito | null
}

export function CircuitoDiaSplitView({
  circuito,
  activeDay,
  onChangeActiveDay,
  onBackToList,
  onExploreMap,
  viajeId,
  modo = 'confirmado',
  headerTitle,
  backAriaLabel,
  onReplaceStop,
  onDeleteStop,
  onVerSugerencias,
  onDejarloAsi,
  descartandoAviso = false,
  selectedStrategy = null,
  isSelecting = false,
  onConfirmCircuit,
  showSuccessModal = false,
  onCloseSuccess,
  onGoToTrips,
  onRestart,
  showHeroBadge = true,
  ritmo = null,
  viaje = null,
}: CircuitoDiaSplitViewProps) {
  const esRecomendado = modo === 'recomendado'
  const resolvedHeader =
    headerTitle ?? (esRecomendado ? 'Circuito recomendado' : 'Circuito confirmado')
  const resolvedBackAria =
    backAriaLabel ??
    (esRecomendado ? 'Volver a circuitos recomendados' : 'Volver a Mis viajes')

  const [rawActiveStopIndex, setActiveStopIndex] = useState(0)
  const [detailStop, setDetailStop] = useState<ParadaCircuitoDetalle | null>(null)
  const [mapStop, setMapStop] = useState<ParadaCircuitoDetalle | null>(null)
  const [cancelAnimationKey, setCancelAnimationKey] = useState(0)

  const listRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)

  const stopsOfDay = circuito.stopsByDay[activeDay] ?? SIN_PARADAS
  // Si se elimina la última parada estando en ella, el índice no puede quedar fuera de la lista.
  const activeStopIndex = Math.min(rawActiveStopIndex, Math.max(stopsOfDay.length - 1, 0))
  const activeDayMeta = circuito.days.find((day) => day.number === activeDay)
  const isSelected = selectedStrategy === circuito.estrategia
  const otherSelected = selectedStrategy !== null && !isSelected

  const minExpected = ritmo ? RITMO_MIN_PARADAS[ritmo] : null
  const hasInsufficientStops =
    minExpected !== null && stopsOfDay.length < minExpected
  const resumenDia: ResumenDiaCircuito | null | undefined =
    activeDayMeta?.resumen ??
    (hasInsufficientStops && ritmo
      ? {
          asignadas: stopsOfDay.length,
          minimo: minExpected ?? 0,
          agregadasPorUsuario: 0,
          avisoDescartado: false,
          mensaje: `No se agregaron más actividades para este día según el ritmo elegido (${RITMO_LABELS[ritmo]}) porque no se encontraron más opciones disponibles.`,
          pendiente: true,
          puedeCompletar: false,
        }
      : null)

  const scrollToStop = useCallback((index: number) => {
    const node = cardRefs.current[index]
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const resetToFirstStop = useCallback(() => {
    setActiveStopIndex(0)
    setCancelAnimationKey((key) => key + 1)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [])

  useEffect(() => {
    resetToFirstStop()
  }, [activeDay, resetToFirstStop])

  useLayoutEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, stopsOfDay.length)
  }, [stopsOfDay.length])

  useEffect(() => {
    observerRef.current?.disconnect()
    const root = listRef.current
    if (!root || stopsOfDay.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]
        if (!top) return
        const indexAttr = (top.target as HTMLElement).dataset.paradaIndex
        if (indexAttr == null) return
        const nextIndex = Number(indexAttr)
        if (!Number.isNaN(nextIndex)) {
          setActiveStopIndex(nextIndex)
        }
      },
      { root, threshold: 0.6 },
    )
    observerRef.current = observer
    cardRefs.current.forEach((node) => {
      if (node) observer.observe(node)
    })
    return () => observer.disconnect()
  }, [stopsOfDay, activeDay])

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (stopsOfDay.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault()
      const next = Math.min(activeStopIndex + 1, stopsOfDay.length - 1)
      setActiveStopIndex(next)
      scrollToStop(next)
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault()
      const next = Math.max(activeStopIndex - 1, 0)
      setActiveStopIndex(next)
      scrollToStop(next)
    }
  }

  if (mapStop !== null) {
    return (
      <ParadaUbicacionMapaView
        circuitoTitle={circuito.title}
        parada={mapStop}
        onBack={() => setMapStop(null)}
      />
    )
  }

  const progressTotal = Math.max(stopsOfDay.length, 1)
  const progressActive = stopsOfDay.length === 0 ? 0 : activeStopIndex + 1

  const confirmLabel = isSelecting
    ? 'Guardando circuito...'
    : isSelected
      ? 'Alternativa elegida'
      : otherSelected
        ? 'Ya elegiste otra alternativa'
        : 'Confirmar y guardar circuito'

  const mapButton = (
    <button
      type="button"
      aria-label="Abrir mapa del circuito"
      title="Ver mapa del circuito"
      onClick={onExploreMap}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#00658d] text-white shadow-lg transition-all hover:scale-105 hover:bg-[#004f70] active:scale-95"
    >
      <span className="material-symbols-outlined text-[26px]">map</span>
    </button>
  )

  return (
    <div className="relative w-full pb-8">
      <header className="mb-4 flex items-center justify-between border-b border-slate-200/80 pb-3">
        <button
          type="button"
          onClick={onBackToList}
          aria-label={resolvedBackAria}
          className="flex h-10 w-10 items-center justify-center rounded-full text-sky-700 transition-colors hover:bg-slate-100 active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-heading flex-1 truncate px-2 text-center text-lg font-bold text-sky-800 sm:text-xl">
          {resolvedHeader}
        </h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      <section className="relative h-40 w-full overflow-hidden rounded-3xl shadow-md sm:h-44">
        <div
          className="absolute inset-0 h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url('${circuito.image}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute bottom-0 left-0 z-10 w-full p-4 text-white sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-amber-200/40 bg-amber-900/40 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <span className="material-symbols-outlined text-[16px]">
                {circuito.categoryIcon}
              </span>
              <span>{circuito.categoryTag}</span>
            </span>
            {esRecomendado && showHeroBadge && isSelected && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-200/40 bg-emerald-900/50 px-3 py-1 text-xs font-medium backdrop-blur-md">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Alternativa elegida</span>
              </span>
            )}
          </div>
          <h2 className="font-heading mb-1.5 line-clamp-1 text-xl font-bold text-white sm:text-2xl">
            {circuito.title}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-white/90 sm:text-sm">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              <span>{circuito.daysLabel}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">map</span>
              <span>{circuito.paceLabel}</span>
            </span>
            <span className="flex items-center gap-1 text-sky-200">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>{circuito.affinity}</span>
            </span>
          </div>
        </div>
      </section>

      <FichaViajeCircuito viaje={viaje} />

      <nav className="mt-5 border-b border-slate-200/70 pb-3">
        <ul className="flex gap-2.5 overflow-x-auto">
          {circuito.days.map((day) => {
            const active = activeDay === day.number
            return (
              <li key={day.number} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeActiveDay(day.number)}
                  className={`flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-bold transition-all active:scale-95 sm:text-sm ${
                    active
                      ? 'bg-[#00658d] text-white shadow-md'
                      : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300/70'
                  }`}
                >
                  <span>{day.label}</span>
                  {active && <span className="h-2 w-2 rounded-full bg-sky-200" />}
                </button>
              </li>
            )
          })}
        </ul>
        {activeDayMeta && (
          <p className="mt-2 text-xs font-medium text-slate-500">{activeDayMeta.summary}</p>
        )}
      </nav>

      {/* Con los handlers el aviso ofrece completar el día: en el circuito confirmado y también en
          una alternativa todavía sin elegir. Sin ellos (alternativa ya elegida) solo informa. */}
      <AvisoDiaIncompleto
        resumen={resumenDia}
        interactivo={onVerSugerencias !== undefined}
        onVerSugerencias={() => {
          if (activeDayMeta?.fecha) onVerSugerencias?.(activeDayMeta.fecha)
        }}
        onDejarloAsi={() => {
          if (activeDayMeta?.fecha) onDejarloAsi?.(activeDayMeta.fecha)
        }}
        descartando={descartandoAviso}
      />

      {/* Desde md (768px) lista a la izquierda y mapa a la derecha, del mismo alto y
          ocupando casi toda la pantalla. En celular, el mapa arriba y la lista abajo. */}
      <div className="mt-4 flex flex-col gap-4 md:h-[clamp(540px,calc(100dvh_-_180px),720px)] md:flex-row md:gap-5">
        <div className="relative isolate z-0 order-1 h-[260px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 md:order-2 md:h-full md:w-1/2">
          <CircuitoRutaMapa
            viajeId={viajeId}
            dayLabel={activeDayMeta?.label ?? `Día ${activeDay}`}
            dayFecha={activeDayMeta?.fecha ?? ''}
            stops={stopsOfDay}
            activeStopIndex={activeStopIndex}
            onSelectStop={scrollToStop}
            cancelAnimationKey={cancelAnimationKey}
            estrategia={circuito.estrategia}
          />
        </div>

        <div
          className={`order-2 flex min-h-0 flex-col md:order-1 md:h-full md:w-1/2 ${
            stopsOfDay.length > 0 ? 'h-[min(620px,80dvh)]' : ''
          }`}
        >
          {stopsOfDay.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Sin actividades programadas.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">
                  Parada {progressActive} de {progressTotal}
                </p>
                <div className="flex flex-1 gap-1" aria-hidden="true">
                  {Array.from({ length: progressTotal }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < progressActive ? 'bg-[#00658d]' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div
                ref={listRef}
                tabIndex={0}
                aria-label="Paradas del día"
                onKeyDown={handleListKeyDown}
                className="min-h-0 flex-1 overflow-y-auto overscroll-auto rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#00658d]/40 md:overscroll-contain"
                style={{ scrollSnapType: 'y mandatory' }}
              >
                {stopsOfDay.map((stop, index) => (
                  <div
                    key={stop.id}
                    ref={(node) => {
                      cardRefs.current[index] = node
                    }}
                    data-parada-index={index}
                    className="h-full pb-3"
                    style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
                  >
                    <CircuitoParadaCard
                      stop={stop}
                      index={index}
                      total={stopsOfDay.length}
                      isLast={index === stopsOfDay.length - 1}
                      onDetails={setDetailStop}
                      onReplace={onReplaceStop}
                      onDelete={onDeleteStop}
                      previousStop={index > 0 ? stopsOfDay[index - 1] : null}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {esRecomendado ? (
        <div className="sticky bottom-0 z-20 -mx-1 mt-4 border-t border-slate-200/80 bg-white/95 px-1 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSelecting || selectedStrategy !== null}
              onClick={onConfirmCircuit}
              className="font-heading flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#00658d] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-[#004f70] active:scale-[0.98] disabled:opacity-60 sm:px-6 sm:py-4"
            >
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
              <span className="text-left leading-snug">{confirmLabel}</span>
            </button>
            {mapButton}
          </div>
        </div>
      ) : (
        <div className="mt-8 flex justify-end">{mapButton}</div>
      )}

      {detailStop !== null && (
        <CircuitoParadaDetalleModal
          stop={detailStop}
          onClose={() => setDetailStop(null)}
          onOpenMap={(stop) => {
            setDetailStop(null)
            setMapStop(stop)
          }}
        />
      )}

      {esRecomendado && showSuccessModal && onCloseSuccess && onGoToTrips && (
        <CircuitoGuardadoModal
          circuitoTitle={circuito.title}
          onClose={onCloseSuccess}
          onGoToTrips={onGoToTrips}
          onRestart={onRestart}
        />
      )}
    </div>
  )
}
