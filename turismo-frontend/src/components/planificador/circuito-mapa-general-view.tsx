import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { buildMapStops, firstDayWithStops } from './circuito-view-model'
import type { CircuitoRecomendado } from './types'

maplibregl.setWorkerUrl(workerUrl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright'
const BUILDINGS_LAYER = '3d-buildings-circuit'
const ROUTE_SOURCE = 'circuit-route-source'
const ROUTE_LAYER = 'circuit-route-layer'

type MapaStopItem = ReturnType<typeof buildMapStops>[number]

function crearGeoJsonRuta(stops: MapaStopItem[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: stops.map((s) => [s.lng, s.lat]),
    },
  }
}

interface CircuitoMapaGeneralViewProps {
  circuito: CircuitoRecomendado
  onBack: () => void
}

export function CircuitoMapaGeneralView({
  circuito,
  onBack,
}: CircuitoMapaGeneralViewProps) {
  const initialDay = firstDayWithStops(circuito)
  const [selectedDay, setSelectedDay] = useState<number>(initialDay)
  const [selectedStopId, setSelectedStopId] = useState<string>(
    () => buildMapStops(circuito, initialDay)[0]?.id ?? '',
  )
  const [modalStop, setModalStop] = useState<MapaStopItem | null>(null)
  const [showRoute, setShowRoute] = useState<boolean>(true)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const loadedRef = useRef<boolean>(false)

  const initialStops = useMemo(
    () => buildMapStops(circuito, initialDay),
    [circuito, initialDay],
  )
  const stops = useMemo(
    () => buildMapStops(circuito, selectedDay),
    [circuito, selectedDay],
  )
  const dayData = circuito.days.find((day) => day.number === selectedDay)

  const encuadrarParadas = useCallback((paradas: MapaStopItem[], duration = 600) => {
    const map = mapRef.current
    if (map === null || paradas.length === 0) return

    const bounds = new maplibregl.LngLatBounds()
    for (const s of paradas) {
      bounds.extend([s.lng, s.lat])
    }

    map.fitBounds(bounds, {
      padding: { top: 90, bottom: 200, left: 60, right: 80 },
      maxZoom: 15.5,
      pitch: 35,
      bearing: -10,
      duration,
    })
  }, [])

  const handleSelectDay = (day: number) => {
    const nextStops = buildMapStops(circuito, day)
    setSelectedDay(day)
    setSelectedStopId(nextStops[0]?.id ?? '')
  }

  // Inicializar MapLibre GL una sola vez
  useEffect(() => {
    const el = containerRef.current
    if (el === null) return

    const first = initialStops[0] ?? { lat: -31.4254, lng: -64.1873 }

    const map = new maplibregl.Map({
      container: el,
      style: STYLE_URL,
      center: [first.lng, first.lat],
      zoom: 14.5,
      pitch: 35,
      bearing: -10,
    })
    mapRef.current = map

    map.on('style.load', () => {
      loadedRef.current = true

      if (!map.getSource(ROUTE_SOURCE)) {
        map.addSource(ROUTE_SOURCE, {
          type: 'geojson',
          data: crearGeoJsonRuta(initialStops),
        })
      }

      if (!map.getLayer(ROUTE_LAYER)) {
        map.addLayer({
          id: ROUTE_LAYER,
          type: 'line',
          source: ROUTE_SOURCE,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: 'visible',
          },
          paint: {
            'line-color': '#00658d',
            'line-width': 4,
            'line-dasharray': [2, 2],
            'line-opacity': 0.9,
          },
        })
      }

      if (!map.getLayer(BUILDINGS_LAYER)) {
        map.addLayer({
          id: BUILDINGS_LAYER,
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#d1d5db',
            'fill-extrusion-height': [
              'coalesce',
              ['get', 'render_height'],
              ['get', 'height'],
              10,
            ],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.75,
          },
        })
      }

      encuadrarParadas(initialStops, 0)
    })

    return () => {
      for (const m of markersRef.current) m.remove()
      markersRef.current = []
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, [encuadrarParadas, initialStops])

  // Actualizar ruta y encuadre al cambiar de día
  useEffect(() => {
    const map = mapRef.current
    if (map === null || !loadedRef.current) return

    const source = map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (source) {
      source.setData(crearGeoJsonRuta(stops))
    }

    encuadrarParadas(stops, 650)
  }, [selectedDay, stops, encuadrarParadas])

  // Mostrar/ocultar la línea de ruta
  useEffect(() => {
    const map = mapRef.current
    if (map === null || !loadedRef.current) return
    if (map.getLayer(ROUTE_LAYER)) {
      map.setLayoutProperty(ROUTE_LAYER, 'visibility', showRoute ? 'visible' : 'none')
    }
  }, [showRoute])

  // Renderizar los pines numerados en MapLibre y resaltar el seleccionado
  useEffect(() => {
    const map = mapRef.current
    if (map === null) return

    for (const m of markersRef.current) m.remove()
    markersRef.current = []

    for (const stop of stops) {
      const isSelected = stop.id === selectedStopId
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `cursor-pointer transition-transform duration-200 ${
        isSelected ? 'z-30 scale-110' : 'z-20 hover:scale-105'
      }`

      const pillClasses = isSelected
        ? 'border-[#004f70] bg-[#00658d] text-white'
        : 'border-slate-200 bg-white text-slate-900'
      const badgeClasses = isSelected
        ? 'bg-white text-[#00658d]'
        : 'bg-[#00658d] text-white'
      const tipClasses = isSelected
        ? 'border-[#004f70] bg-[#00658d]'
        : 'border-slate-200 bg-white'

      btn.innerHTML = `
        <div class="flex flex-col items-center">
          <div class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-lg ${pillClasses}">
            <span class="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold ${badgeClasses}">
              ${stop.number}
            </span>
            <span class="max-w-[125px] truncate text-[11px] font-bold"></span>
          </div>
          <div class="-mt-1.5 h-3 w-3 rotate-45 border-r border-b ${tipClasses}"></div>
        </div>
      `
      const textSpan = btn.querySelectorAll('span')[1]
      if (textSpan) textSpan.textContent = stop.title

      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelectedStopId(stop.id)
        map.flyTo({
          center: [stop.lng, stop.lat],
          zoom: Math.max(map.getZoom(), 15),
          pitch: 40,
          bearing: -10,
          duration: 500,
          essential: true,
        })
      })

      const marker = new maplibregl.Marker({ element: btn, anchor: 'bottom' })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map)
      markersRef.current.push(marker)
    }
  }, [stops, selectedStopId])

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      {/* TOP HEADER (ZIP 3) */}
      <header className="relative z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Volver a circuitos recomendados"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-[11px] font-semibold uppercase tracking-wider text-[#00658d]">
                Circuito
              </span>
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-[#00658d]">
                {circuito.daysLabel}
              </span>
            </div>
            <h1 className="font-heading max-w-[220px] truncate text-base font-bold leading-tight text-slate-900 sm:max-w-none sm:text-lg">
              {circuito.title}
            </h1>
          </div>
        </div>
      </header>

      {/* MAP CONTAINER & OVERLAYS */}
      <div className="relative h-[560px] w-full overflow-hidden bg-[#e6edf4] sm:h-[620px]">
        <div
          ref={containerRef}
          role="img"
          aria-label={`Mapa general del circuito ${circuito.title}`}
          className="absolute inset-0 h-full w-full"
        />

        {/* FLOATING DAY FILTER TABS */}
        <div className="pointer-events-none absolute top-4 right-0 left-0 z-30 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 p-1.5 shadow-lg backdrop-blur-md">
            {circuito.days.map((day) => (
              <button
                key={day.number}
                type="button"
                onClick={() => handleSelectDay(day.number)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  selectedDay === day.number
                    ? 'bg-[#00658d] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#00658d]'
                }`}
              >
                Día {day.number}
              </button>
            ))}
          </div>
        </div>

        {/* FLOATING ITINERARY SUMMARY PILL */}
        <div className="absolute top-16 left-4 z-30 hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md sm:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold text-slate-700">
            {dayData?.summary ?? 'Sin paradas asignadas'}
          </span>
        </div>

        {/* FLOATING MAP UTILITY BUTTONS */}
        <div className="absolute top-16 right-4 z-30 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            title="Acercar mapa"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/95 text-slate-700 shadow-md backdrop-blur-md hover:text-[#00658d] active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            title="Alejar mapa"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/95 text-slate-700 shadow-md backdrop-blur-md hover:text-[#00658d] active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">remove</span>
          </button>
          <button
            type="button"
            onClick={() => encuadrarParadas(stops, 600)}
            title="Centrar vista"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/95 text-[#00658d] shadow-md backdrop-blur-md hover:bg-sky-50 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">my_location</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRoute((r) => !r)}
            title="Mostrar/ocultar trazado del traslado"
            className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 shadow-md backdrop-blur-md active:scale-95 ${
              showRoute ? 'bg-sky-100 text-[#00658d]' : 'bg-white/95 text-slate-500'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">directions_car</span>
          </button>
        </div>

        {/* BOTTOM HORIZONTAL CAROUSEL */}
        <div className="pointer-events-none absolute right-0 bottom-3 left-0 z-30">
          <div className="mb-1.5 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-slate-400/80" />
          </div>
          <div className="pointer-events-auto flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-1.5">
            {stops.map((stop) => {
              const isSelected = stop.id === selectedStopId
              return (
                <div
                  key={stop.id}
                  onClick={() => {
                    setSelectedStopId(stop.id)
                    mapRef.current?.flyTo({
                      center: [stop.lng, stop.lat],
                      zoom: 15.5,
                      pitch: 40,
                      bearing: -10,
                      duration: 500,
                      essential: true,
                    })
                  }}
                  className={`w-[290px] shrink-0 cursor-pointer snap-center rounded-2xl border bg-white/95 p-3.5 shadow-lg backdrop-blur-md transition-all sm:w-[320px] ${
                    isSelected
                      ? 'scale-[1.01] border-[#00658d] ring-2 ring-[#00658d]'
                      : 'border-slate-200/90 opacity-90 hover:border-sky-300'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <img
                        src={stop.img}
                        alt={stop.title}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#00658d] text-[10px] font-extrabold text-white shadow-md">
                        {stop.number}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <span
                          className={`max-w-[130px] truncate rounded-full px-2 py-0.5 text-[10px] font-bold ${stop.categoryClass}`}
                        >
                          {stop.category}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-500">
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          <span>{stop.time}</span>
                        </span>
                      </div>
                      <h4 className="truncate text-xs font-bold text-slate-900">{stop.title}</h4>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{stop.desc}</p>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5">
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-slate-400">
                          <span className="material-symbols-outlined text-[12px]">
                            directions_car
                          </span>
                          <span>{stop.walkingDist}</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setModalStop(stop)
                          }}
                          className="flex items-center gap-0.5 text-[11px] font-bold text-[#00658d] hover:underline"
                        >
                          <span>Detalles</span>
                          <span className="material-symbols-outlined text-[14px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ACTIVITY DETAILS MODAL (ZIP 3 Bottom Sheet) */}
      {modalStop !== null && (
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
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xs hover:bg-black/70"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
              <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#00658d] shadow-xs">
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
                <span className="flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600">
                  <span className="material-symbols-outlined fill text-xs">star</span>
                  <span>4.8</span>
                </span>
              </div>
              <h3 className="font-heading mb-2 text-lg font-bold text-slate-900">
                {modalStop.title}
              </h3>
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
                className="flex w-full items-center justify-center rounded-xl bg-slate-100 py-2.5 px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
              >
                Volver al mapa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
