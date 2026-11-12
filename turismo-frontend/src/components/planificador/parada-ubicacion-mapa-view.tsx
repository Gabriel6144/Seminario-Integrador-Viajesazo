import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import type { ParadaCircuitoDetalle } from './types'

maplibregl.setWorkerUrl(workerUrl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright'
const BUILDINGS_LAYER = '3d-buildings-stop'

interface ParadaUbicacionMapaViewProps {
  circuitoTitle: string
  parada: ParadaCircuitoDetalle
  onBack: () => void
}

export function ParadaUbicacionMapaView({
  circuitoTitle,
  parada,
  onBack,
}: ParadaUbicacionMapaViewProps) {
  const [isGpsModalOpen, setIsGpsModalOpen] = useState<boolean>(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)

  const lat = parada.latitud ?? -31.4254
  const lng = parada.longitud ?? -64.1873

  const showFeedback = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2200)
  }

  useEffect(() => {
    const el = containerRef.current
    if (el === null) return

    const map = new maplibregl.Map({
      container: el,
      style: STYLE_URL,
      center: [lng, lat],
      zoom: 16,
      pitch: 45,
      bearing: -15,
    })
    mapRef.current = map

    const markerEl = document.createElement('div')
    markerEl.className = 'flex flex-col items-center pointer-events-auto'
    markerEl.innerHTML = `
      <div class="mb-1.5 flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/90 px-3 py-1 text-white shadow-lg backdrop-blur-md">
        <span class="flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[10px] font-black text-white">${parada.number}</span>
        <span class="text-xs font-bold tracking-tight whitespace-nowrap"></span>
      </div>
      <div class="relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-sky-600 bg-white p-1.5 shadow-xl">
        <div class="flex h-full w-full flex-col items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-sky-300 text-white shadow-inner">
          <span class="material-symbols-outlined fill text-2xl">location_on</span>
        </div>
      </div>
      <div class="-mt-2 h-3.5 w-3.5 rotate-45 border-r-2 border-b-2 border-sky-600 bg-white shadow-xs"></div>
    `
    const titleSpan = markerEl.querySelectorAll('span')[1]
    if (titleSpan) titleSpan.textContent = parada.title

    const marker = new maplibregl.Marker({ element: markerEl, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(map)
    markerRef.current = marker

    map.on('style.load', () => {
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
            'fill-extrusion-opacity': 0.78,
          },
        })
      }
    })

    return () => {
      marker.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [lat, lng, parada.title, parada.number])

  const encodedQuery = encodeURIComponent(`${parada.title} ${parada.location} Córdoba`)

  return (
    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-xl">
      {/* 1. HEADER SUPERIOR FLOTANTE & CONTEXTO (ZIP 2) */}
      <header className="relative z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver al itinerario"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-all hover:bg-slate-100 active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-600" />
              <span>Circuito: {circuitoTitle}</span>
            </span>
            <h1 className="font-heading text-base font-bold leading-tight text-slate-900">
              Ubicación en Mapa
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsGpsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-sky-200/90 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-xs transition-all hover:bg-sky-100 active:scale-95"
        >
          <span className="material-symbols-outlined text-base text-sky-600">near_me</span>
          <span>Abrir GPS</span>
          <span className="material-symbols-outlined text-sm text-sky-400">open_in_new</span>
        </button>
      </header>

      {/* 2. MAPA MAPLIBRE GL Y MARCADOR DESTACADO */}
      <div className="relative h-[560px] w-full overflow-hidden bg-slate-100 sm:h-[620px]">
        <div
          ref={containerRef}
          role="img"
          aria-label={`Mapa de ubicación de ${parada.title}`}
          className="absolute inset-0 h-full w-full"
        />

        {/* Controles flotantes de Mapa */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              mapRef.current?.flyTo({
                center: [lng, lat],
                zoom: 16,
                pitch: 45,
                bearing: -15,
                essential: true,
              })
              showFeedback(`Centrando mapa en ${parada.title}`)
            }}
            title="Centrar actividad"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition-all hover:bg-slate-50 active:scale-95"
          >
            <span className="material-symbols-outlined text-xl text-sky-600">my_location</span>
          </button>

          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              aria-label="Acercar mapa"
              className="flex h-10 w-10 items-center justify-center border-b border-slate-100 text-slate-700 transition-all hover:bg-slate-50 active:bg-slate-100"
            >
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              aria-label="Alejar mapa"
              className="flex h-10 w-10 items-center justify-center text-slate-700 transition-all hover:bg-slate-50 active:bg-slate-100"
            >
              <span className="material-symbols-outlined text-xl">remove</span>
            </button>
          </div>
        </div>

        {/* Chip informativo de proximidad & traslado */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md">
          <span className="material-symbols-outlined text-base text-sky-600">
            directions_car
          </span>
          <span className="text-xs font-bold text-slate-800">
            {parada.walkNext ?? 'Punto de partida del día'}
          </span>
        </div>

        {/* 3. FICHA / TARJETA INFERIOR DE ACTIVIDAD (BOTTOM SHEET) */}
        <section className="absolute right-3 bottom-3 left-3 z-30 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl sm:mx-auto sm:max-w-lg">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />

          <div className="mb-3.5 flex items-start gap-3.5">
            <div className="relative flex h-20 w-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-tr from-sky-600 via-sky-400 to-indigo-400 p-2 text-white shadow-xs">
              <span className="material-symbols-outlined fill text-3xl">location_city</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-sky-100">
                CÓRDOBA
              </span>
              <span className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-sky-700 shadow">
                {parada.number}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center justify-between gap-1">
                <span className="inline-flex items-center rounded-md border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  {parada.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                  <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                  <span>{parada.duration}</span>
                </span>
              </div>

              <h2 className="font-heading truncate text-base font-bold leading-snug text-slate-900">
                {parada.title}
              </h2>

              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                {parada.location}
              </p>

              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>En tu itinerario</span>
                </span>
                <span className="text-[11px] font-medium text-slate-400">{parada.price}</span>
              </div>
            </div>
          </div>

          <div className="mb-3.5 flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined shrink-0 text-base text-sky-600">
                location_on
              </span>
              <span className="truncate font-medium">
                <strong className="text-slate-800">Dirección:</strong> {parada.location}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined shrink-0 text-base text-sky-600">
                schedule
              </span>
              <span className="truncate font-medium">
                <strong className="text-slate-800">Horario hoy:</strong> {parada.hours}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 active:bg-slate-300"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Volver a Itinerario</span>
            </button>

            <button
              type="button"
              onClick={() => {
                showFeedback('Iniciando navegación GPS...')
                setIsGpsModalOpen(true)
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#65b7e8] px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/25 transition-all hover:bg-sky-600 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">directions</span>
              <span>Cómo llegar</span>
            </button>
          </div>
        </section>
      </div>

      {/* Modal Emergente / Selector de GPS Externo (Google Maps / Waze) */}
      {isGpsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl border-t border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-slate-900">
                Navegar con app externa
              </h3>
              <button
                type="button"
                onClick={() => setIsGpsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Elige tu aplicación preferida para iniciar la ruta guiada hacia{' '}
              <strong className="text-slate-800">{parada.title}</strong>:
            </p>

            <div className="mb-3 flex flex-col gap-2.5">
              <a
                href={`https://maps.google.com/?q=${encodedQuery}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => showFeedback('Iniciando Google Maps...')}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition-all hover:bg-slate-50 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-600">
                    <span className="material-symbols-outlined text-xl">map</span>
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Google Maps</p>
                    <p className="text-[10px] text-slate-500">
                      Rutas en auto, a pie y transporte público
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-sm text-slate-400">
                  chevron_right
                </span>
              </a>

              <a
                href={`https://waze.com/ul?q=${encodedQuery}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => showFeedback('Iniciando Waze...')}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition-all hover:bg-slate-50 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 font-bold text-sky-600">
                    <span className="material-symbols-outlined text-xl">near_me</span>
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Waze</p>
                    <p className="text-[10px] text-slate-500">
                      Tráfico en tiempo real y alertas en ruta
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-sm text-slate-400">
                  chevron_right
                </span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setIsGpsModalOpen(false)}
              className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Toast Flotante */}
      {toastMsg && (
        <div className="pointer-events-none fixed top-16 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md">
            <span className="material-symbols-outlined text-base text-sky-400">check_circle</span>
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
  )
}
