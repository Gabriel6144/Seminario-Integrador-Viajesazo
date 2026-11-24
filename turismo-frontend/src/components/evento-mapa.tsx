import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

maplibregl.setWorkerUrl(workerUrl)

// Positron 2D: base clara y neutra que deja el marcador como protagonista.
const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

export interface EventoMapaProps {
  nombre: string
  lugar: string
  localidad: string | null
  latitud: number
  longitud: number
}

/**
 * Mapa del detalle del evento con MapLibre, alineado al motor de VZ-30.
 * Solo muestra el marcador y su popup; no dibuja rutas ni selector de estilos.
 */
export function EventoMapa({ nombre, lugar, localidad, latitud, longitud }: EventoMapaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (el === null) return

    const map = new maplibregl.Map({
      container: el,
      style: STYLE_URL,
      center: [longitud, latitud],
      zoom: 15,
      attributionControl: false,
    })

    const popup = new maplibregl.Popup({ offset: 24 }).setDOMContent(
      popupContent(nombre, lugar),
    )
    const marker = new maplibregl.Marker()
      .setLngLat([longitud, latitud])
      .setPopup(popup)
      .addTo(map)

    return () => {
      marker.remove()
      map.remove()
    }
  }, [latitud, longitud, nombre, lugar])

  const referencia = [lugar, localidad].filter(Boolean).join(' · ')

  return (
    <div className="relative z-0 isolate overflow-hidden rounded-xl border bg-white shadow-sm">
      <div
        ref={containerRef}
        role="img"
        aria-label={`Mapa de la ubicación de ${nombre}`}
        className="relative z-0 h-72 w-full"
      />
      <p className="border-t px-3 py-2 text-xs text-[#3f484e]">{referencia}</p>
    </div>
  )
}

function popupContent(nombre: string, lugar: string): HTMLElement {
  const strong = document.createElement('strong')
  strong.textContent = nombre
  const br = document.createElement('br')
  const span = document.createElement('span')
  span.textContent = lugar

  const div = document.createElement('div')
  div.append(strong, br, span)
  return div
}
