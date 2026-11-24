import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { useRutaDia } from '@/api/rutas'
import { geometriaLineaRecta, type ParadaCoord } from '@/lib/rutas'
import {
  animationDurationMs,
  routeMetrics,
  sampleRoute,
  stopDistancesAlongRoute,
} from '@/lib/viajezaso/route-geometry'

import { buildMapStops, firstDayWithStops } from './circuito-view-model'
import { crearImagenTurista } from './mapa-circuito'
import type { CircuitoRecomendado } from './types'

maplibregl.setWorkerUrl(workerUrl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const ROUTE_SOURCE = 'circuit-route-source'
const ROUTE_CASING_LAYER = 'circuit-route-casing'
const ROUTE_LAYER = 'circuit-route-layer'
const PROGRESS_SOURCE = 'circuit-progress-source'
const PROGRESS_LAYER = 'circuit-progress-layer'
const ROUTE_COLOR = '#07485B'
const ROUTE_TRAVEL_COLOR = '#9fd4e0'
const PROGRESS_COLOR = '#015569'
const PANEL_MIN = 320
const PANEL_MAX = 680
const PANEL_DEFAULT = 400
const PANEL_WIDTH_STORAGE = 'vz-mapa-panel-ancho'
const PANEL_COLLAPSED_STORAGE = 'vz-mapa-panel-colapsado'

type MapaStopItem = ReturnType<typeof buildMapStops>[number]
type TourState = 'idle' | 'playing' | 'done'

function leerAnchoPanel(): number {
  try {
    const raw = localStorage.getItem(PANEL_WIDTH_STORAGE)
    const value = raw === null ? Number.NaN : Number(raw)
    if (Number.isFinite(value) && value > 0) {
      return Math.min(Math.max(value, PANEL_MIN), PANEL_MAX)
    }
  } catch {
    /* localStorage no disponible */
  }
  return PANEL_DEFAULT
}

function guardarAnchoPanel(width: number): void {
  try {
    localStorage.setItem(PANEL_WIDTH_STORAGE, String(Math.round(width)))
  } catch {
    /* ignore */
  }
}

function leerPanelColapsado(): boolean {
  try {
    return localStorage.getItem(PANEL_COLLAPSED_STORAGE) === '1'
  } catch {
    return false
  }
}

function guardarPanelColapsado(collapsed: boolean): void {
  try {
    localStorage.setItem(PANEL_COLLAPSED_STORAGE, collapsed ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** La geometría llega como [lat, lng] (OSRM/Leaflet); MapLibre la quiere al revés. */
function crearGeoJsonRuta(
  geometria: [number, number][],
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: geometria.map(([lat, lng]) => [lng, lat]),
    },
  }
}

interface CircuitoMapaGeneralViewProps {
  circuito: CircuitoRecomendado
  viajeId: number
  onBack: () => void
}

export function CircuitoMapaGeneralView({
  circuito,
  viajeId,
  onBack,
}: CircuitoMapaGeneralViewProps) {
  const initialDay = firstDayWithStops(circuito)
  const [selectedDay, setSelectedDay] = useState<number>(initialDay)
  const [selectedStopId, setSelectedStopId] = useState<string>(
    () => buildMapStops(circuito, initialDay)[0]?.id ?? '',
  )
  const [modalStop, setModalStop] = useState<MapaStopItem | null>(null)
  const [showRoute, setShowRoute] = useState<boolean>(true)
  const [styleLoaded, setStyleLoaded] = useState<boolean>(false)
  const [tourState, setTourState] = useState<TourState>('idle')

  const [sheetExpanded, setSheetExpanded] = useState<boolean>(false)
  const [dragY, setDragY] = useState<number>(0)
  const [dragging, setDragging] = useState<boolean>(false)
  const [layoutHeight, setLayoutHeight] = useState<number | null>(null)
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null)
  const [panelWidth, setPanelWidth] = useState<number>(leerAnchoPanel)
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(leerPanelColapsado)
  const [panelDragging, setPanelDragging] = useState<boolean>(false)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const travelerRef = useRef<maplibregl.Marker | null>(null)
  const rafRef = useRef<number | null>(null)
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})
  const dragStartRef = useRef<number | null>(null)
  const dragMovedRef = useRef<boolean>(false)
  const panelDragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const initialStops = useMemo(
    () => buildMapStops(circuito, initialDay),
    [circuito, initialDay],
  )
  const stops = useMemo(
    () => buildMapStops(circuito, selectedDay),
    [circuito, selectedDay],
  )
  const dayData = circuito.days.find((day) => day.number === selectedDay)

  const paradasCoords = useMemo<ParadaCoord[]>(
    () => stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
    [stops],
  )
  const stopIds = useMemo(() => stops.map((stop) => stop.id), [stops])

  const rutaQuery = useRutaDia(
    viajeId,
    dayData?.fecha ?? '',
    paradasCoords,
    stopIds,
    true,
    circuito.estrategia,
  )
  const lineaRecta = useMemo(() => geometriaLineaRecta(paradasCoords), [paradasCoords])
  const rutaGeometria = rutaQuery.data?.geometria ?? lineaRecta
  const tieneRuta = rutaGeometria.length >= 2
  const calculandoRuta = paradasCoords.length >= 2 && rutaQuery.isPending

  const totalKm = useMemo(
    () =>
      stops.reduce(
        (total, stop) => total + (Number.isFinite(stop.trasladoKm) ? stop.trasladoKm : 0),
        0,
      ),
    [stops],
  )

  const activeIndex = stops.findIndex((stop) => stop.id === selectedStopId)
  const activeNumber = activeIndex >= 0 ? activeIndex + 1 : stops.length > 0 ? 1 : 0

  const maxPanelWidth = Math.max(
    PANEL_MIN,
    Math.min(PANEL_MAX, (layoutWidth ?? 1200) - 360),
  )
  const panelWidthClamped = Math.min(Math.max(panelWidth, PANEL_MIN), maxPanelWidth)
  const panelWidthApplied = panelCollapsed ? 0 : panelWidthClamped

  const encuadrarParadas = useCallback((paradas: MapaStopItem[], duration = 600) => {
    const map = mapRef.current
    if (map === null || paradas.length === 0) return

    const bounds = new maplibregl.LngLatBounds()
    for (const stop of paradas) {
      bounds.extend([stop.lng, stop.lat])
    }

    map.fitBounds(bounds, {
      padding: { top: 90, bottom: 120, left: 70, right: 70 },
      maxZoom: 15.5,
      pitch: 0,
      bearing: 0,
      duration,
    })
  }, [])

  // Alto disponible: mantiene la barra superior y la navegación inferior visibles.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (el === null) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const isDesktop =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(min-width: 768px)').matches
      const reserve = isDesktop ? 16 : 96
      setLayoutWidth(document.documentElement.clientWidth)
      setLayoutHeight(Math.max(420, window.innerHeight - rect.top - reserve))
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  // Acomodar el canvas cuando cambia el ancho del panel.
  useEffect(() => {
    const frame = requestAnimationFrame(() => mapRef.current?.resize())
    return () => cancelAnimationFrame(frame)
  }, [panelWidthApplied])

  const updateProgress = (
    path: [number, number][],
    position: [number, number] | null,
  ) => {
    const map = mapRef.current
    if (map === null) return

    const source = map.getSource(PROGRESS_SOURCE) as maplibregl.GeoJSONSource | undefined
    source?.setData(crearGeoJsonRuta(path))

    if (position === null) return

    if (travelerRef.current === null) {
      const element = document.createElement('div')
      element.style.pointerEvents = 'none'
      element.append(crearImagenTurista())
      travelerRef.current = new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([position[1], position[0]])
        .addTo(map)
    } else {
      travelerRef.current.setLngLat([position[1], position[0]])
    }
  }

  const stopTour = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    travelerRef.current?.remove()
    travelerRef.current = null
    setTourState('idle')
  }, [])

  const handleSelectDay = (day: number) => {
    stopTour()
    const nextStops = buildMapStops(circuito, day)
    setSelectedDay(day)
    setSelectedStopId(nextStops[0]?.id ?? '')
  }

  const selectStop = useCallback(
    (stop: MapaStopItem) => {
      stopTour()
      setSelectedStopId(stop.id)
      const map = mapRef.current
      if (map === null) return
      map.flyTo({
        center: [stop.lng, stop.lat],
        zoom: Math.max(map.getZoom(), 15),
        pitch: 0,
        bearing: 0,
        duration: 500,
        essential: true,
      })
    },
    [stopTour],
  )

  // Inicializar MapLibre GL una sola vez (Positron plano)
  useEffect(() => {
    const el = containerRef.current
    if (el === null) return

    const first = initialStops[0] ?? { lat: -31.4254, lng: -64.1873 }
    const map = new maplibregl.Map({
      container: el,
      style: STYLE_URL,
      center: [first.lng, first.lat],
      zoom: 14,
      pitch: 0,
      bearing: 0,
    })
    mapRef.current = map

    map.on('style.load', () => {
      setStyleLoaded(true)

      const initialCoords = initialStops.map(
        (stop) => [stop.lat, stop.lng] as [number, number],
      )

      if (!map.getSource(ROUTE_SOURCE)) {
        map.addSource(ROUTE_SOURCE, {
          type: 'geojson',
          data: crearGeoJsonRuta(initialCoords),
        })
      }

      if (!map.getSource(PROGRESS_SOURCE)) {
        map.addSource(PROGRESS_SOURCE, {
          type: 'geojson',
          data: crearGeoJsonRuta(initialCoords),
        })
      }

      if (!map.getLayer(ROUTE_CASING_LAYER)) {
        map.addLayer({
          id: ROUTE_CASING_LAYER,
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': 9,
            'line-opacity': 0.95,
          },
        })
      }

      if (!map.getLayer(ROUTE_LAYER)) {
        map.addLayer({
          id: ROUTE_LAYER,
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ROUTE_COLOR,
            'line-width': 4,
            'line-opacity': 0.95,
          },
        })
      }

      if (!map.getLayer(PROGRESS_LAYER)) {
        map.addLayer({
          id: PROGRESS_LAYER,
          type: 'line',
          source: PROGRESS_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': PROGRESS_COLOR,
            'line-width': 5,
            'line-opacity': 0.95,
          },
        })
      }

      encuadrarParadas(initialStops, 0)
    })

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      for (const marker of markersRef.current) marker.remove()
      markersRef.current = []
      travelerRef.current?.remove()
      travelerRef.current = null
      map.remove()
      mapRef.current = null
      setStyleLoaded(false)
    }
  }, [encuadrarParadas, initialStops])

  // Ruta real + progreso del recorrido
  useEffect(() => {
    const map = mapRef.current
    if (map === null || !styleLoaded) return

    const routeSource = map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined
    routeSource?.setData(crearGeoJsonRuta(rutaGeometria))

    if (tourState === 'playing') return

    const progressSource = map.getSource(
      PROGRESS_SOURCE,
    ) as maplibregl.GeoJSONSource | undefined
    progressSource?.setData(crearGeoJsonRuta(rutaGeometria))

    if (map.getLayer(ROUTE_LAYER)) {
      map.setPaintProperty(ROUTE_LAYER, 'line-color', ROUTE_COLOR)
    }
  }, [rutaGeometria, styleLoaded, tourState])

  // Mostrar/ocultar el trazado
  useEffect(() => {
    const map = mapRef.current
    if (map === null || !styleLoaded) return
    for (const layerId of [ROUTE_CASING_LAYER, ROUTE_LAYER, PROGRESS_LAYER]) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', showRoute ? 'visible' : 'none')
      }
    }
  }, [showRoute, styleLoaded])

  // Encuadrar al cambiar de día
  useEffect(() => {
    if (stops.length > 0) encuadrarParadas(stops, 650)
  }, [selectedDay, stops, encuadrarParadas])

  // Pines estilo referencia: la activa es un callout oscuro con título.
  useEffect(() => {
    const map = mapRef.current
    if (map === null) return

    for (const marker of markersRef.current) marker.remove()
    markersRef.current = []

    for (const stop of stops) {
      const isSelected = stop.id === selectedStopId
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `cursor-pointer transition-transform duration-200 ${
        isSelected ? 'z-30 scale-105' : 'z-20 hover:scale-105'
      }`

      if (isSelected) {
        btn.innerHTML = `
          <div class="flex flex-col items-center">
            <div class="flex items-center gap-1.5 rounded-full bg-[#07485B] px-3 py-1.5 text-white shadow-xl ring-2 ring-white/70">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[#07485B]">${stop.number}</span>
              <span class="max-w-[150px] truncate text-[11px] font-semibold"></span>
            </div>
            <div class="-mt-1.5 h-3 w-3 rotate-45 bg-[#07485B]"></div>
          </div>
        `
        const textSpan = btn.querySelector('span:last-child')
        if (textSpan) textSpan.textContent = stop.title
      } else {
        btn.innerHTML = `
          <div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#07485B] bg-white text-[11px] font-bold text-[#07485B] shadow-md">${stop.number}</div>
        `
      }

      btn.addEventListener('click', (event) => {
        event.stopPropagation()
        selectStop(stop)
      })

      const marker = new maplibregl.Marker({
        element: btn,
        anchor: isSelected ? 'bottom' : 'center',
      })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map)
      markersRef.current.push(marker)
    }
  }, [stops, selectedStopId, selectStop])

  // Mantener visible la tarjeta activa (clic en el mapa o recorrido de Rumbi)
  useEffect(() => {
    const node = cardRefs.current[selectedStopId]
    if (!node) return
    node.scrollIntoView({
      behavior: tourState === 'playing' ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [selectedStopId, tourState])

  const startTour = () => {
    if (!tieneRuta || calculandoRuta || stops.length === 0) return

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    travelerRef.current?.remove()
    travelerRef.current = null

    const map = mapRef.current
    if (map?.getLayer(ROUTE_LAYER)) {
      map.setPaintProperty(ROUTE_LAYER, 'line-color', ROUTE_TRAVEL_COLOR)
    }

    setSelectedStopId(stops[0]?.id ?? '')

    if (map !== null) {
      const bounds = new maplibregl.LngLatBounds()
      for (const [lat, lng] of rutaGeometria) bounds.extend([lng, lat])
      map.fitBounds(bounds, {
        padding: { top: 90, bottom: 120, left: 70, right: 70 },
        maxZoom: 15.5,
        pitch: 0,
        bearing: 0,
        duration: 600,
      })
    }

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      const last = stops[stops.length - 1]
      if (last) setSelectedStopId(last.id)
      const end = rutaGeometria[rutaGeometria.length - 1]
      if (end) updateProgress(rutaGeometria, end)
      setTourState('done')
      return
    }

    setTourState('playing')

    const metrics = routeMetrics(rutaGeometria)
    const duration = animationDurationMs(metrics.total)
    const along = stopDistancesAlongRoute(rutaGeometria, paradasCoords)
    const total = metrics.total || 1
    const start = performance.now()
    let lastSynced = -1

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const sample = sampleRoute(metrics, t)
      updateProgress(sample.path, sample.position)

      const traveled = t * total
      let mapped = along[0]?.index ?? 0
      for (const stop of along) {
        if (traveled >= stop.meters - 1) mapped = stop.index
      }
      if (mapped !== lastSynced) {
        lastSynced = mapped
        const id = stops[mapped]?.id
        if (id) setSelectedStopId(id)
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
        setTourState('done')
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  const handleTourClick = () => {
    if (tourState === 'playing') {
      stopTour()
      return
    }
    startTour()
  }

  const onSheetPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStartRef.current = event.clientY
    dragMovedRef.current = false
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onSheetPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartRef.current === null) return
    const delta = event.clientY - dragStartRef.current
    if (Math.abs(delta) > 6) dragMovedRef.current = true
    setDragY(delta)
  }

  const finishSheetDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartRef.current === null) return
    const delta = event.clientY - dragStartRef.current
    if (delta > 50) setSheetExpanded(false)
    else if (delta < -50) setSheetExpanded(true)
    dragStartRef.current = null
    setDragging(false)
    setDragY(0)
  }

  const toggleSheet = () => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }
    setSheetExpanded((value) => !value)
  }

  const togglePanel = () => {
    setPanelCollapsed((value) => {
      const next = !value
      guardarPanelColapsado(next)
      return next
    })
  }

  const onPanelResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (panelCollapsed) return
    panelDragRef.current = {
      startX: event.clientX,
      startWidth: panelWidthClamped,
    }
    setPanelDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPanelResizeMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = panelDragRef.current
    if (drag === null) return
    const next = Math.min(
      Math.max(drag.startWidth + (event.clientX - drag.startX), PANEL_MIN),
      maxPanelWidth,
    )
    setPanelWidth(next)
  }

  const onPanelResizeEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (panelDragRef.current === null) return
    panelDragRef.current = null
    setPanelDragging(false)
    guardarAnchoPanel(panelWidthClamped)
    mapRef.current?.resize()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const resetPanelWidth = () => {
    const next = Math.min(Math.max(PANEL_DEFAULT, PANEL_MIN), maxPanelWidth)
    setPanelWidth(next)
    guardarAnchoPanel(next)
  }

  const onPanelHandleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.key === 'ArrowRight' ? 24 : -24
    const next = Math.min(
      Math.max(panelWidthClamped + delta, PANEL_MIN),
      maxPanelWidth,
    )
    setPanelWidth(next)
    guardarAnchoPanel(next)
  }

  const sheetOffset = sheetExpanded ? '0px' : 'calc(100% - 9rem)'
  const sheetStyle = {
    '--sheet-y': `calc(${sheetOffset} + ${dragY}px)`,
    '--panel-w': `${panelWidthApplied}px`,
  } as CSSProperties

  const tourLabel = calculandoRuta
    ? 'Calculando ruta…'
    : tourState === 'playing'
      ? 'Detener'
      : tourState === 'done'
        ? 'Repetir recorrido'
        : 'Recorrer el día'

  return (
    <div
      ref={rootRef}
      style={{
        width: layoutWidth ?? undefined,
        height: layoutHeight ?? undefined,
        transform: 'translateX(-50%)',
      }}
      className="relative left-1/2 flex h-[calc(100dvh-16rem)] w-full flex-col overflow-hidden bg-white md:h-[calc(100dvh-12rem)] md:flex-row"
    >
      {/* MAPA */}
      <div className="relative order-1 min-h-0 flex-1 overflow-hidden bg-[#e9eef2] md:order-2">
        <div
          ref={containerRef}
          role="img"
          aria-label={`Mapa general del circuito ${circuito.title}`}
          className="absolute inset-0 h-full w-full"
        />

        {/* Colapsar / expandir panel (desktop) */}
        <button
          type="button"
          onClick={togglePanel}
          title={panelCollapsed ? 'Mostrar panel del itinerario' : 'Ocultar panel del itinerario'}
          aria-label={
            panelCollapsed ? 'Mostrar panel del itinerario' : 'Ocultar panel del itinerario'
          }
          className="absolute top-4 left-4 z-30 hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-700 shadow-md backdrop-blur-md transition-colors hover:text-[#015569] active:scale-95 md:flex"
        >
          <span className="material-symbols-outlined text-[20px]">
            {panelCollapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>

        {/* Manija para redimensionar el panel (desktop) */}
        {!panelCollapsed && (
          <button
            type="button"
            role="separator"
            aria-orientation="vertical"
            aria-label="Ajustar el ancho del panel del itinerario"
            aria-valuemin={PANEL_MIN}
            aria-valuemax={Math.round(maxPanelWidth)}
            aria-valuenow={Math.round(panelWidthClamped)}
            tabIndex={0}
            onPointerDown={onPanelResizeStart}
            onPointerMove={onPanelResizeMove}
            onPointerUp={onPanelResizeEnd}
            onPointerCancel={onPanelResizeEnd}
            onDoubleClick={resetPanelWidth}
            onKeyDown={onPanelHandleKeyDown}
            className="group absolute top-1/2 left-0 z-30 hidden h-24 w-4 -translate-x-1/2 -translate-y-1/2 cursor-col-resize touch-none items-center justify-center md:flex"
          >
            <span className="h-10 w-1 rounded-full bg-slate-300 transition-colors group-hover:bg-[#015569] group-active:bg-[#015569]" />
          </button>
        )}

        {/* Progreso del día */}
        <div className="pointer-events-none absolute top-4 left-4 z-20 hidden max-w-[calc(100%-7rem)] items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md sm:flex md:top-16">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
          <span className="truncate text-[11px] font-bold text-slate-700">
            {dayData?.label ?? `Día ${selectedDay}`}
            {stops.length > 0 ? ` · Parada ${activeNumber} de ${stops.length}` : ''}
          </span>
        </div>

        {/* Controles */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            title="Acercar mapa"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/95 text-slate-700 shadow-md backdrop-blur-md transition-colors hover:text-[#015569] active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            title="Alejar mapa"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/95 text-slate-700 shadow-md backdrop-blur-md transition-colors hover:text-[#015569] active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">remove</span>
          </button>
          <button
            type="button"
            onClick={() => encuadrarParadas(stops, 600)}
            title="Centrar vista"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/95 text-[#015569] shadow-md backdrop-blur-md transition-colors hover:bg-sky-50 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">my_location</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRoute((value) => !value)}
            title="Mostrar/ocultar trazado del traslado"
            className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 shadow-md backdrop-blur-md transition-colors active:scale-95 ${
              showRoute
                ? 'bg-sky-100 text-[#015569]'
                : 'bg-white/95 text-slate-500'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">directions_car</span>
          </button>
        </div>

        {/* Recorrido de Rumbi */}
        <button
          type="button"
          onClick={handleTourClick}
          disabled={!tieneRuta || calculandoRuta}
          className="absolute bottom-[10rem] left-4 z-20 flex min-h-11 items-center gap-2 rounded-full bg-[#015569] py-2 pr-4 pl-2 text-xs font-bold text-white shadow-xl transition-colors hover:bg-[#07485B] disabled:cursor-not-allowed disabled:opacity-50 md:bottom-6 md:left-6"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#015569]">
            <span className="material-symbols-outlined text-[20px]">
              {tourState === 'playing' ? 'stop' : 'play_arrow'}
            </span>
          </span>
          {tieneRuta ? tourLabel : 'Sin ruta'}
        </button>

        {/* Barra de estado (desktop) */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 md:flex md:max-w-[calc(100%-3rem)]">
          <div className="pointer-events-auto max-w-full overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-2.5 shadow-xl backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400">
              Estado del itinerario
            </p>
            <div className="flex items-center gap-3">
              {stops.map((stop) => (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => selectStop(stop)}
                  className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                    stop.id === selectedStopId
                      ? 'text-[#015569]'
                      : 'text-slate-600 hover:text-[#015569]'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                      stop.id === selectedStopId
                        ? 'bg-[#015569] text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {stop.number}
                  </span>
                  <span className="max-w-[90px] truncate">{stop.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PANEL / HOJA INFERIOR */}
      <aside
        style={sheetStyle}
        className={`absolute inset-x-0 bottom-0 z-30 flex h-[72%] translate-y-[var(--sheet-y)] flex-col overflow-hidden rounded-t-3xl border-t border-slate-200 bg-white shadow-[0_-10px_40px_rgba(15,23,42,0.14)] md:static md:order-1 md:h-full md:w-[var(--panel-w)] md:shrink-0 md:translate-y-0 md:rounded-none md:border-t-0 ${
          panelCollapsed ? 'md:border-r-0 md:shadow-none' : 'md:border-r md:shadow-[10px_0_30px_rgba(0,0,0,0.04)]'
        } ${dragging || panelDragging ? '' : 'transition-[transform,width] duration-300'}`}
      >
        <button
          type="button"
          onClick={toggleSheet}
          onPointerDown={onSheetPointerDown}
          onPointerMove={onSheetPointerMove}
          onPointerUp={finishSheetDrag}
          onPointerCancel={finishSheetDrag}
          aria-label={sheetExpanded ? 'Bajar itinerario' : 'Subir itinerario'}
          className="flex w-full shrink-0 touch-none items-center justify-center gap-3 py-2.5 md:hidden"
        >
          <span className="h-1.5 w-12 rounded-full bg-slate-300" />
          <span className="text-[11px] font-semibold text-slate-500">
            {stops.length} {stops.length === 1 ? 'parada' : 'paradas'}
          </span>
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-3 pb-6 md:pt-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Volver a circuitos recomendados"
              onClick={onBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400">
              <span>CIRCUITO</span>
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-600">
                {circuito.daysLabel}
              </span>
            </div>
          </div>

          <h1 className="mt-3 text-xl font-bold leading-tight tracking-tight text-slate-900">
            {circuito.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100/90 p-1.5 text-[11px] font-medium text-slate-500 shadow-inner">
            {circuito.days.map((day) => (
              <button
                key={day.number}
                type="button"
                onClick={() => handleSelectDay(day.number)}
                className={`shrink-0 rounded-full px-3 py-1.5 transition-colors ${
                  selectedDay === day.number
                    ? 'bg-[#015569] font-semibold text-white shadow-sm'
                    : 'hover:text-slate-800'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
            <span>
              {stops.length} {stops.length === 1 ? 'parada' : 'paradas'}
            </span>
            {totalKm > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span>{totalKm.toFixed(1).replace('.', ',')} km</span>
              </>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {stops.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-xs font-medium text-slate-500">
                No hay actividades para este día.
              </p>
            ) : (
              stops.map((stop) => {
                const isSelected = stop.id === selectedStopId
                return (
                  <article
                    key={stop.id}
                    ref={(node) => {
                      cardRefs.current[stop.id] = node
                    }}
                    onClick={() => selectStop(stop)}
                    className={`cursor-pointer rounded-2xl border bg-white p-3.5 transition-all ${
                      isSelected
                        ? 'border-2 border-[#015569] shadow-md'
                        : 'border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    <div className="flex gap-3.5">
                      {isSelected && (
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-inner">
                          <img
                            src={stop.img}
                            alt={stop.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <h3 className="line-clamp-1 text-sm font-bold leading-snug text-slate-900">
                            {stop.number}. {stop.title}
                          </h3>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                            <span className="material-symbols-outlined text-[14px] text-slate-400">
                              schedule
                            </span>
                            <span>{stop.time}</span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                            {stop.desc}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                            <span className="material-symbols-outlined text-[12px]">
                              directions_walk
                            </span>
                            <span className="max-w-[110px] truncate">
                              {stop.walkingDist}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setModalStop(stop)
                            }}
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                              isSelected
                                ? 'bg-sky-50 text-[#015569] hover:bg-sky-100'
                                : 'bg-slate-50 text-[#015569] hover:bg-slate-100'
                            }`}
                          >
                            <span>Detalles</span>
                            <span className="material-symbols-outlined text-[14px]">
                              arrow_forward
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>
      </aside>

      {/* Detalle de parada */}
      {modalStop !== null &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
              <div className="relative h-44 w-full bg-slate-200">
                <img
                  alt={modalStop.title}
                  src={modalStop.img}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setModalStop(null)}
                  aria-label="Cerrar detalles"
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xs hover:bg-black/70"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
                <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#015569] shadow-xs">
                  {modalStop.category}
                </span>
              </div>
              <div className="overflow-y-auto p-5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>
                      {modalStop.time} ({modalStop.duration})
                    </span>
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{modalStop.title}</h3>
                <p className="mb-4 text-xs leading-relaxed text-slate-600">{modalStop.desc}</p>
                <div className="mb-4 space-y-2 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">Ubicación exacta:</span>
                    <span className="max-w-[210px] truncate text-right font-semibold text-slate-800">
                      {modalStop.address}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">Recomendación:</span>
                    <span className="font-semibold text-emerald-700">
                      {modalStop.recomendacion}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalStop(null)}
                  className="flex w-full items-center justify-center rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
                >
                  Volver al mapa
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
