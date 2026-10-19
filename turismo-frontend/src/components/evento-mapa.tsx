import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Mapa de OpenStreetMap (Leaflet) con la ubicación de un evento.
 *
 * Pensado para los tests: nunca se monta de verdad en jsdom. En el detalle se mockea, y acá se
 * testea con `leaflet` mockeado, igual que se hace con los componentes de Radix que jsdom no
 * soporta. El que sí se ejecuta es el contrato: los props se muestran y el marcador va en las
 * coordenadas que pasó el backend.
 *
 * El ícono del marcador se pinta con `divIcon` (HTML/CSS) a propósito: el `Icon.Default` de
 * Leaflet busca imágenes en un path que el build no copia, y un asset roto en un mapa de un
 * evento no es un detalle menor.
 */

export interface EventoMapaProps {
  nombre: string
  lugar: string
  localidad: string | null
  latitud: number
  longitud: number
}

export function EventoMapa({ nombre, lugar, localidad, latitud, longitud }: EventoMapaProps) {
  const container = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = container.current
    if (el === null) return

    // `scrollWheelZoom: false`: si no, el scroll de la página se queda "atrapado" en el mapa.
    const map = L.map(el, { scrollWheelZoom: false }).setView([latitud, longitud], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    L.circleMarker([latitud, longitud], {
      radius: 12,
      color: '#bb0413',
      weight: 2,
      fillColor: '#bb0413',
      fillOpacity: 1,
    })
      .bindPopup(popupContent(nombre, lugar))
      .addTo(map)
      .openPopup()

    return () => {
      map.remove()
    }
  }, [latitud, longitud, nombre, lugar])

  const referencia = [lugar, localidad].filter(Boolean).join(' · ')

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div
        ref={container}
        role="img"
        aria-label={`Mapa de la ubicación de ${nombre}`}
        className="h-72 w-full"
      />
      <p className="border-t px-3 py-2 text-xs text-[#3f484e]">{referencia}</p>
    </div>
  )
}

/**
 * El contenido del popup se arma con el DOM y no con un string de HTML: `bindPopup` acepta un
 * elemento y así el nombre del evento no puede inyectar markup.
 */
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