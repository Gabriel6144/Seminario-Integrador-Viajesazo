import { useEffect, useMemo, useRef, useState } from 'react'

import { useRutaDia } from '@/api/rutas'
import { linksDiaCompleto, type PuntoGoogleMaps } from '@/lib/google-maps'
import { geometriaLineaRecta, type ParadaCoord } from '@/lib/rutas'
import { routeMetrics, sampleRoute } from '@/lib/viajezaso/route-geometry'
import type { CircuitStrategy } from '@/types/api'
import {
  guardarModoMapa,
  leerModoMapa,
  type MapaCircuito,
  type ModoMapaVista,
  type ParadaMapa,
} from './mapa-circuito'
import { crearMapaLeaflet } from './mapa-circuito-leaflet'
import {
  crearMapaMapLibre,
  MapLibreUnavailableError,
} from './mapa-circuito-maplibre'
import type { ParadaCircuitoDetalle } from './types'

const ROUTE_COLOR = '#008fbb'

interface CircuitoRutaMapaProps {
  viajeId: number
  dayLabel: string
  dayFecha: string
  stops: ParadaCircuitoDetalle[]
  activeStopIndex: number
  onSelectStop: (index: number) => void
  cancelAnimationKey: number
  /** Diferencia caché OSRM entre alternativas del mismo viaje. */
  estrategia?: CircuitStrategy | null
}

type TourState = 'idle' | 'playing' | 'done'

function animationDurationMs(totalMetros: number): number {
  const clamped = Math.min(Math.max(totalMetros, 500), 8000)
  const t = (clamped - 500) / (8000 - 500)
  return Math.round(6000 + t * (14000 - 6000))
}

/** Distancia acumulada sobre la geometría hasta el vértice más cercano a cada parada. */
function stopDistancesAlongRoute(
  geom: [number, number][],
  stops: ParadaCircuitoDetalle[],
): { index: number; meters: number }[] {
  if (geom.length === 0) return []
  const metrics = routeMetrics(geom)
  const cum: number[] = [0]
  for (const len of metrics.lengths) {
    cum.push(cum[cum.length - 1] + len)
  }

  return stops
    .map((stop, index) => {
      if (stop.latitud == null || stop.longitud == null) return null
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < geom.length; i++) {
        const dLat = geom[i][0] - stop.latitud
        const dLng = geom[i][1] - stop.longitud
        const d = dLat * dLat + dLng * dLng
        if (d < bestDist) {
          bestDist = d
          best = cum[i] ?? 0
        }
      }
      return { index, meters: best }
    })
    .filter((x): x is { index: number; meters: number } => x != null)
    .sort((a, b) => a.meters - b.meters)
}

function toPunto(stop: ParadaCircuitoDetalle): PuntoGoogleMaps {
  return {
    latitud: stop.latitud,
    longitud: stop.longitud,
    direccionTexto: stop.location,
  }
}

export function CircuitoRutaMapa({
  viajeId,
  dayLabel,
  dayFecha,
  stops,
  activeStopIndex,
  onSelectStop,
  cancelAnimationKey,
  estrategia = null,
}: CircuitoRutaMapaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<MapaCircuito | null>(null)
  const rafRef = useRef<number | null>(null)
  const onSelectStopRef = useRef(onSelectStop)
  onSelectStopRef.current = onSelectStop
  const activeStopIndexRef = useRef(activeStopIndex)
  activeStopIndexRef.current = activeStopIndex

  const [modoVista, setModoVista] = useState<ModoMapaVista>(() => leerModoMapa())
  const [mapReady, setMapReady] = useState(false)
  const [tourState, setTourState] = useState<TourState>('idle')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [mapEpoch, setMapEpoch] = useState(0)

  const stopsWithCoords = useMemo(
    () =>
      stops.filter(
        (s): s is ParadaCircuitoDetalle & { latitud: number; longitud: number } =>
          s.latitud != null && s.longitud != null,
      ),
    [stops],
  )

  const paradasCoords: ParadaCoord[] = useMemo(
    () => stopsWithCoords.map((s) => ({ lat: s.latitud, lng: s.longitud })),
    [stopsWithCoords],
  )

  const stopIds = useMemo(() => stops.map((s) => s.id), [stops])

  const footQuery = useRutaDia(viajeId, dayFecha, paradasCoords, stopIds, true, estrategia)
  const footFailed = footQuery.isError
  // Memorizada: si se recalculara en cada render, el mapa volvería a dibujar (y encuadrar) la
  // ruta de respaldo cada vez que cambia la parada activa, y el recorrido se vería a los saltos.
  const lineaRecta = useMemo(() => geometriaLineaRecta(paradasCoords), [paradasCoords])
  const activeRuta =
    footQuery.data?.geometria ??
    (footFailed || (footQuery.isFetched && !footQuery.data) ? lineaRecta : undefined)
  const rutasLoading =
    paradasCoords.length >= 2 && footQuery.isPending && !footQuery.isFetched

  const dayLinks = useMemo(
    () => linksDiaCompleto(stops.map(toPunto)),
    [stops],
  )

  const stopTour = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const changeModo = (next: ModoMapaVista) => {
    if (next === modoVista) return
    stopTour()
    setTourState('idle')
    setStatusMsg(null)
    setModoVista(next)
    guardarModoMapa(next)
    setMapEpoch((e) => e + 1)
  }

  useEffect(() => {
    stopTour()
    setTourState('idle')
    mapaRef.current?.setProgreso([], null)
  }, [cancelAnimationKey, dayFecha])

  // Crear / recrear mapa
  useEffect(() => {
    const node = containerRef.current
    if (!node || stopsWithCoords.length === 0) return

    let disposed = false
    setMapReady(false)

    async function setup() {
      try {
        const onSelect = (index: number) => onSelectStopRef.current(index)
        let mapa: MapaCircuito
        if (modoVista === '3d') {
          try {
            mapa = await crearMapaMapLibre(node!, onSelect, (message) => {
              if (disposed) return
              setStatusMsg(message)
              setModoVista('2d')
              guardarModoMapa('2d')
              setMapEpoch((e) => e + 1)
            })
          } catch (err) {
            if (disposed) return
            const message =
              err instanceof MapLibreUnavailableError
                ? err.message
                : 'La vista 3D no está disponible en este dispositivo'
            setStatusMsg(message)
            setModoVista('2d')
            guardarModoMapa('2d')
            setMapEpoch((e) => e + 1)
            return
          }
        } else {
          mapa = await crearMapaLeaflet(node!, onSelect)
        }
        if (disposed) {
          mapa.destruir()
          return
        }
        mapaRef.current = mapa
        setMapReady(true)
      } catch {
        if (!disposed) setStatusMsg('No se pudo cargar el mapa')
      }
    }

    void setup()

    return () => {
      disposed = true
      stopTour()
      mapaRef.current?.destruir()
      mapaRef.current = null
      setMapReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoVista, dayFecha, stopsWithCoords.length === 0, mapEpoch])

  // Paradas + activa
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || !mapReady) return
    const paradas: ParadaMapa[] = stops
      .map((stop, index) =>
        stop.latitud != null && stop.longitud != null
          ? {
              index,
              number: stop.number,
              title: stop.title,
              hours: stop.hours,
              latitud: stop.latitud,
              longitud: stop.longitud,
            }
          : null,
      )
      .filter((p): p is ParadaMapa => p != null)
    mapa.setParadas(paradas, activeStopIndex)
    if (tourState !== 'playing') {
      mapa.setActiva(activeStopIndex)
    }
  }, [stops, activeStopIndex, mapReady, tourState])

  // Ruta
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || !mapReady) return
    const path = activeRuta
    if (path && path.length >= 2) {
      mapa.setRuta(path)
      if (tourState === 'idle') mapa.encuadrarRuta()
    } else {
      mapa.setRuta([])
      mapa.encuadrarRuta()
    }
  }, [activeRuta, mapReady, tourState])

  const startTour = () => {
    const mapa = mapaRef.current
    const path = activeRuta
    if (!mapa || !path || path.length < 2) return

    stopTour()
    onSelectStop(0)
    mapa.encuadrarRuta()

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const last = stops.length - 1
      onSelectStop(last)
      setTourState('done')
      const lastStop = stops[last]
      if (lastStop?.latitud != null && lastStop.longitud != null) {
        mapa.setProgreso(path, [lastStop.latitud, lastStop.longitud])
      }
      return
    }

    mapa.setProgreso([], null)
    const metrics = routeMetrics(path)
    const duration = animationDurationMs(metrics.total)
    const start = performance.now()
    const along = stopDistancesAlongRoute(path, stops)
    const total = metrics.total || 1
    let lastSynced = -1

    setTourState('playing')

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const sample = sampleRoute(metrics, t)
      mapa.setProgreso(sample.path, sample.position)

      const traveled = t * total
      let mapped = along[0]?.index ?? 0
      for (const stop of along) {
        if (traveled >= stop.meters - 1) mapped = stop.index
      }
      if (mapped !== lastSynced) {
        lastSynced = mapped
        onSelectStop(mapped)
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
        setTourState('done')
        onSelectStop(stops.length - 1)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  const handleTourClick = () => {
    if (tourState === 'playing') {
      stopTour()
      setTourState('idle')
      mapaRef.current?.setProgreso([], null)
      return
    }
    startTour()
  }

  if (stops.length > 0 && stopsWithCoords.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500"
        role="img"
        aria-label={`Mapa del recorrido del ${dayLabel}`}
      >
        Ninguna parada de este día tiene ubicación en el mapa.
      </div>
    )
  }

  if (stops.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500"
        role="img"
        aria-label={`Mapa del recorrido del ${dayLabel}`}
      >
        Sin actividades programadas.
      </div>
    )
  }

  const tourLabel =
    rutasLoading && !activeRuta
      ? 'Calculando ruta…'
      : tourState === 'playing'
        ? 'Detener'
        : tourState === 'done'
          ? 'Repetir recorrido'
          : 'Recorrer el día'

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full [&_.leaflet-top.leaflet-right]:!top-14 [&_.maplibregl-ctrl-top-right]:!top-14"
        role="img"
        aria-label={`Mapa del recorrido del ${dayLabel}`}
      />

      <div className="pointer-events-none absolute top-3 left-3 z-[1000] max-w-[min(100%-1.5rem,260px)] space-y-2">
        <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-md">
          <p className="text-xs font-bold text-slate-800">
            {dayLabel} · Parada {Math.min(activeStopIndex + 1, stops.length)} de{' '}
            {stops.length}
          </p>
          {dayLinks.length > 0 && (
            <div className="pointer-events-auto mt-2 space-y-1.5">
              {dayLinks.map((href, i) => {
                const partLabel =
                  dayLinks.length > 1
                    ? `Ver el día en Google Maps (parte ${i + 1} de ${dayLinks.length})`
                    : 'Ver el día en Google Maps'
                return (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${partLabel}, se abre en otra pestaña`}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#bae6fd] bg-[#f0f9ff] px-2.5 py-1.5 text-[11px] font-semibold text-[#00658d] transition-colors hover:bg-sky-100"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      directions
                    </span>
                    <span>{partLabel}</span>
                  </a>
                )
              })}
              <p className="text-[10px] text-slate-500">
                Distancias y tiempos en Google Maps
              </p>
            </div>
          )}
        </div>
        {statusMsg && (
          <p
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900 shadow-sm"
          >
            {statusMsg}
          </p>
        )}
      </div>

      <div
        role="group"
        aria-label="Vista del mapa"
        className="absolute top-3 right-3 z-[1000] flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md"
      >
        <button
          type="button"
          aria-pressed={modoVista === '2d'}
          onClick={() => changeModo('2d')}
          className={`min-h-11 min-w-11 px-3 text-xs font-semibold transition-colors ${
            modoVista === '2d'
              ? 'bg-[#00658d] text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          2D
        </button>
        <button
          type="button"
          aria-pressed={modoVista === '3d'}
          onClick={() => changeModo('3d')}
          className={`min-h-11 min-w-11 px-3 text-xs font-semibold transition-colors ${
            modoVista === '3d'
              ? 'bg-[#00658d] text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          3D
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-[#00658d]" /> Actual
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-[#008fbb] bg-white" />{' '}
            Paradas
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-1 w-4 rounded-full"
              style={{ background: ROUTE_COLOR }}
            />{' '}
            Ruta
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleTourClick}
        disabled={rutasLoading && !activeRuta}
        className="absolute right-3 bottom-3 z-[1000] flex min-h-11 items-center gap-2 rounded-full bg-[#00658d] py-2 pr-4 pl-2 text-xs font-bold text-white shadow-lg transition-colors hover:bg-[#004f70] disabled:opacity-60"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#00658d]">
          <span className="material-symbols-outlined text-[20px]">
            {tourState === 'playing' ? 'stop' : 'play_arrow'}
          </span>
        </span>
        {tourLabel}
      </button>
    </div>
  )
}
