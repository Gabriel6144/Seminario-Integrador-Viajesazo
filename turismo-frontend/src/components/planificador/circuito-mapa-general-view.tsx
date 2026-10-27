import { useCallback, useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import type { CircuitoRecomendado } from './types'

maplibregl.setWorkerUrl(workerUrl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright'
const BUILDINGS_LAYER = '3d-buildings-circuit'
const ROUTE_SOURCE = 'circuit-route-source'
const ROUTE_LAYER = 'circuit-route-layer'

interface MapaStopItem {
  id: string
  number: number
  title: string
  category: string
  categoryClass: string
  time: string
  duration: string
  walkingDist: string
  desc: string
  address: string
  recomendacion: string
  img: string
  lat: number
  lng: number
}

const CIRCUIT_MAP_DAYS: Record<number, { summary: string; stops: MapaStopItem[] }> = {
  1: {
    summary: '3 paradas • 1.5 km • ~4 horas',
    stops: [
      {
        id: 'd1_1',
        number: 1,
        title: 'Paseo del Buen Pastor',
        category: 'Patrimonio & Cultura',
        categoryClass: 'bg-rose-50 text-rose-700',
        time: '09:30 - 11:00',
        duration: '1h 30m',
        walkingDist: 'Punto de partida',
        desc: 'Comienza admirando la icónica Iglesia de los Capuchinos y recorre el centro cultural con su galería y fuentes danzantes.',
        address: 'Hipólito Yrigoyen 325, Nueva Córdoba',
        recomendacion: 'Entrada gratuita',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbS0TBPv1NarUnn0nDPjrpv558PEfK4XrzKSX1hmwnJFTo2wK_cWzrju1-UYG5oUsu1v3O8GLi723nkfQKSI94AIBn3Jw3qxRG1TekAiI88KNrSo2viJStTBZ6L2NHlBZaDU5qjdaBwc33SmVSOVuCFO31E6jjQQyPMHKot35p5j7C9lk0jdE9_Hfbkxs7sQ-2VNXUFMEouv9JPZ5SRLSJjNpYDdnMk1Vyvn_ZnW59iyGIGu_CiGqj0w',
        lat: -31.4254,
        lng: -64.1873,
      },
      {
        id: 'd1_2',
        number: 2,
        title: 'Museo Evita (Palacio Ferreyra)',
        category: 'Arte & Arquitectura',
        categoryClass: 'bg-amber-50 text-amber-700',
        time: '11:30 - 13:00',
        duration: '1h 30m',
        walkingDist: '850 m · 12 min',
        desc: 'Majestuoso palacio de estilo francés de principios del siglo XX con una valiosa colección de artes visuales y jardines.',
        address: 'Av. Hipólito Yrigoyen 511, Nueva Córdoba',
        recomendacion: '$800 / Estudiantes gratis',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAUYokz31jbHe2QNCrHTcMmblBfNhopXzkckHEGLNvdBPGljHflbm3yw4w_PCHbsYGg1jfA2_GiSWDa3N5LGZSlKWmINXpaEo3mNuSl4q9HHSJFK45uvx9tn5zpjpsZlo5DIqqixy3J7WTTE_H6bVO8HG5rKzkO456ZjdJNDfxK6XmokYNh7Wt3gwkkHK2CFH3NXm_BdjGEjwlKphUVDwZgEP__ueZ0aUpEOsZQewuN1gpsCHCXnNs7hw',
        lat: -31.4278,
        lng: -64.1865,
      },
      {
        id: 'd1_3',
        number: 3,
        title: 'Sabores Cordobeses en Güemes',
        category: 'Gastronomía Típica',
        categoryClass: 'bg-emerald-50 text-emerald-700',
        time: '13:30 - 15:30',
        duration: '2h 00m',
        walkingDist: '650 m · 10 min',
        desc: 'Almuerzo criollo tradicional: empanadas de lomo cortadas a cuchillo, tabla de quesos de las sierras y aperitivos locales.',
        address: 'Belgrano esq. Fructuoso Rivera, Güemes',
        recomendacion: 'Reserva sugerida',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuClN4QG2n99f48rlO8Z8NfbUhTR2sS-gwQbBsjncH7Uc_LFh4I5TABh0dP83jHKP00rSjTg4FbZEo12-8p6v3EvLZBn-w_sS3C9G9_FST3sxqDgahqQQrH4SE5yGhEpYgwTK9WzRWMaEwtEuZ1mROnxKrl7RF1Z2fIqRLNs6-oU9UhLLkvaGKWpQ7-HJDBv3_CJx2WIXKxYtT0-iAhsohVfDjCyfy82lxhWo3l55S0YP07rhhUXnIT-gQ',
        lat: -31.4234,
        lng: -64.1924,
      },
    ],
  },
  2: {
    summary: '3 paradas • 1.1 km • ~3.5 horas',
    stops: [
      {
        id: 'd2_1',
        number: 1,
        title: 'Plaza San Martín y Catedral',
        category: 'Centro Histórico',
        categoryClass: 'bg-rose-50 text-rose-700',
        time: '09:30 - 11:00',
        duration: '1h 30m',
        walkingDist: 'Punto de partida',
        desc: 'La plaza central fundada en 1577 y la imponente Catedral colonial con su cúpula barroca y pórticos neoclásicos.',
        address: 'Independencia 30, Centro',
        recomendacion: 'Acceso libre',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5GYiCcGRqyTVkS2Hc8v-9zq-XEnc8oc48oFyn2sie4dxBa3BXNTIFXGgmv5tH0OE9iPTrj8cBeeGzIwche0PyYhDvzuaF9C-bo5-rU3cS1CV2-rqwc5HwymZiD3Fq4p6VRaTk3kAfP8pnIqr13n7A2IZB2fserC2UAbpNm5tHcz4C9JAEZPzO7REta0cAa71Sl1EGah3PGkZaek26S8FxdLmNeNjVxJxh7lUnE5uLjwXTY0FDdLTH',
        lat: -31.4167,
        lng: -64.1836,
      },
      {
        id: 'd2_2',
        number: 2,
        title: 'Manzana Jesuítica',
        category: 'Patrimonio UNESCO',
        categoryClass: 'bg-amber-50 text-amber-700',
        time: '11:15 - 12:45',
        duration: '1h 30m',
        walkingDist: '300 m · 4 min',
        desc: 'Recorrido por el Colegio Nacional de Monserrat, la Iglesia de la Compañía de Jesús y el antiguo Rectorado.',
        address: 'Obispo Trejo 242, Córdoba',
        recomendacion: 'Visita guiada disponible',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCafsdo6h8bInCpaIq9Dvdf36I0aoSrVKuyF7cgqOiGrBAYvkGo5INNu5FA62cCIEGkbuRVvqmKyKMHtAlrW7NSyr6IbANA3gSxlHxZ0eGre_IYQ1Ql-mObSnkhcZQ_FQK-FcKtuHAYF4a4pYvPrIMl-bluZf4W5SFgPLiXGDgdPjspkLlXE8jWw02XlCaxTbb8b61enaUQr6dljfCSFEnJkQmC6I96OPL6Tr7QKvRpNjPh6TFuJznY7w',
        lat: -31.4184,
        lng: -64.1877,
      },
      {
        id: 'd2_3',
        number: 3,
        title: 'Parque Sarmiento & Mirador',
        category: 'Naturaleza & Aire Libre',
        categoryClass: 'bg-sky-50 text-sky-700',
        time: '16:30 - 18:30',
        duration: '2h 00m',
        walkingDist: '800 m · 11 min',
        desc: 'Caminata al atardecer por el parque diseñado por Carlos Thays, rosedal e isla encantada.',
        address: 'Av. Deodoro Roca s/n, Córdoba',
        recomendacion: 'Abierto todo el día',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYmvZucBobKuAULkOWcqDEMRRgmeP3iCCzL9c2qli-tvrh5UZ187IsI3LOqYvZ9baRja9KWYqdSIfVSTe0WkUSnkhaBKJgSQQXqHUYHgNfb5LKSu2z0cTtP92zC1z4UkRE6cqc2sffYquFVZu-mVxCET5IIkagOYI9iYV6NyGBxQh5QuCKpL0StoCN5-_v6hA8aYJfxwwKUG-VuliqNB1-A4OExnnt2OS9suAOVjxBzLR2-oaCtMYIqQ',
        lat: -31.4307,
        lng: -64.1782,
      },
    ],
  },
  3: {
    summary: '3 paradas • 0.9 km • ~3 horas',
    stops: [
      {
        id: 'd3_1',
        number: 1,
        title: 'Paseo de las Artes',
        category: 'Diseño & Artesanías',
        categoryClass: 'bg-emerald-50 text-emerald-700',
        time: '10:30 - 12:00',
        duration: '1h 30m',
        walkingDist: 'Punto de partida',
        desc: 'Recorrido por ferias artesanales, galerías independientes y cafés históricos de Barrio Güemes.',
        address: 'Belgrano 750, Barrio Güemes',
        recomendacion: 'Entrada libre',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAlz8RjM8Npp7fEskFQB-3xI3qfXAiwJophAnEgAATaXYQGUjq3MoU2Zil_yxF3CrOKjqw-KVsRwBH2eWN5hc4cd0WWa4Qmf21dP87WymcVSyUR_V8hWXIdvV9v8ITwC2v7CF09w_iHO70KkzO3VGDiCf1DUwEeEb9_0Gt3H3U56DSHK1XfPBqMtmXmAe8-xra3PC2h395chLb4BwGgyGKwY0-_E440HkalJc4fItaj5KSh4nJCt6q',
        lat: -31.4239,
        lng: -64.1932,
      },
      {
        id: 'd3_2',
        number: 2,
        title: 'Museo Emilio Caraffa',
        category: 'Arte Contemporáneo',
        categoryClass: 'bg-rose-50 text-rose-700',
        time: '12:00 - 13:30',
        duration: '1h 30m',
        walkingDist: '500 m · 7 min',
        desc: 'Edificio neoclásico ampliado con arquitectura vanguardista frente a Plaza España con exposiciones plásticas permanentes.',
        address: 'Av. Poeta Lugones 411',
        recomendacion: 'Entrada general $800',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6DhDURv4eQye_1HUBJepHA3axjCFUA-Ru_9a92ursqlN-yWZY7mm-2nhVZd_cY0pS1cPsndtKRQZ92NHpViO1e-gIrOUuOMCZV1uGzx3GfAC-dOB9hPmU9cYpMA4bZQEjz81dzSKneQ1l9WH1qiaYmwm0bY__zyAO0kHE2tudSDTUIZIkILwevSlRjv-XgDDIbvUFUhoh5N-2JV0cXyd7EhLvnECHUSbpAUfK7dh3NLU-fNOHbZHTGQ',
        lat: -31.4288,
        lng: -64.1846,
      },
      {
        id: 'd3_3',
        number: 3,
        title: 'Mercado Norte & Sabores Criollos',
        category: 'Gastronomía',
        categoryClass: 'bg-amber-50 text-amber-700',
        time: '13:45 - 15:30',
        duration: '1h 45m',
        walkingDist: '300 m · 4 min',
        desc: 'Degustación de platos tradicionales cordobeses, empanadas criollas y productos regionales en los puestos históricos.',
        address: 'Oncativo 50, Córdoba',
        recomendacion: 'Entrada libre',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBexIiUUcT0wFpHsLbatXxzzEBYgtgeds09-1kk7Z5-dBar-yNukb1sadmaMc0j9LCWcOy8b05fBLposnONBrIe9yGUJl9lw-A6dxlUOULhNnS17mFhAYtfg1xsYPlHpInDc9klHtYKIcqYW-hOzsRkFvjwmsuhYTxaW1Wg-Xb0qb0VVSaBbH8CgyIOab-62LNr_NgRlnB0h0AB3fB8p5sZyl2X-zqudIE3UzXM-7LPk4yTrRADMtsLQw',
        lat: -31.4112,
        lng: -64.1835,
      },
    ],
  },
}

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
  onVerCircuitoDetalle?: () => void
}

export function CircuitoMapaGeneralView({
  circuito,
  onBack,
}: CircuitoMapaGeneralViewProps) {
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [selectedStopId, setSelectedStopId] = useState<string>('d1_1')
  const [modalStop, setModalStop] = useState<MapaStopItem | null>(null)
  const [showRoute, setShowRoute] = useState<boolean>(true)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const loadedRef = useRef<boolean>(false)

  const dayData = CIRCUIT_MAP_DAYS[selectedDay] ?? CIRCUIT_MAP_DAYS[1]
  const stops = dayData.stops

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
    setSelectedDay(day)
    const firstStop = CIRCUIT_MAP_DAYS[day]?.stops[0]
    if (firstStop) setSelectedStopId(firstStop.id)
  }

  // Inicializar MapLibre GL una sola vez
  useEffect(() => {
    const el = containerRef.current
    if (el === null) return

    const initialStops = CIRCUIT_MAP_DAYS[1].stops
    const first = initialStops[0]

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
  }, [encuadrarParadas])

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
            {[1, 2, 3].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  selectedDay === day
                    ? 'bg-[#00658d] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#00658d]'
                }`}
              >
                Día {day}
              </button>
            ))}
          </div>
        </div>

        {/* FLOATING ITINERARY SUMMARY PILL */}
        <div className="absolute top-16 left-4 z-30 hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md sm:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold text-slate-700">{dayData.summary}</span>
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
            title="Mostrar/ocultar trazado a pie"
            className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 shadow-md backdrop-blur-md active:scale-95 ${
              showRoute ? 'bg-sky-100 text-[#00658d]' : 'bg-white/95 text-slate-500'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">directions_walk</span>
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
                            directions_walk
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
