import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Mapa de preview del selector de ubicación, con un marcador **arrastrable**.
 *
 * Leaflet directo y no `react-leaflet`, por la misma razón que `evento-mapa.tsx`: `react-leaflet`
 * no soporta React 19. Y se monta a mano en un `useEffect` porque Leaflet es imperativo: no se
 * maneja con estado de React.
 *
 * Este archivo importa `leaflet` y su CSS. El selector lo carga con `React.lazy` para que el peso
 * de Leaflet no entre en las páginas que no muestran el mapa (el listado, los tests del alta/edición
 * que no eligen una ubicación). Si se importara estático, cualquier test que renderice `EventoForm`
 * cargaría Leaflet en jsdom sin necesidad.
 */

export interface UbicacionPreviewMapaProps {
  lat: number
  lng: number
  /** Se llama al soltar el marcador con las coordenadas nuevas. */
  onCoordsChange: (lat: number, lng: number) => void
}

export function UbicacionPreviewMapa({ lat, lng, onCoordsChange }: UbicacionPreviewMapaProps) {
  const container = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // El handler puede cambiar de identidad en cada render; el callback del marcador se registra una
  // sola vez al montar, así que se lee la versión actual desde una ref.
  const onCoordsChangeRef = useRef(onCoordsChange)
  onCoordsChangeRef.current = onCoordsChange

  useEffect(() => {
    const el = container.current
    if (el === null) return

    // `scrollWheelZoom: false`: si no, la rueda del mouse sobre el mapa se come el scroll de la
    // página, que en un formulario largo es insufrible.
    const map = L.map(el, { scrollWheelZoom: false }).setView([lat, lng], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
    marker.on('dragend', () => {
      const position = marker.getLatLng()
      onCoordsChangeRef.current(position.lat, position.lng)
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Solo al montar: los cambios de coordenadas se sincronizan en el efecto de abajo para no
    // reconstruir el mapa (y perder el zoom) cada vez que se elige un resultado nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (map === null || marker === null) return

    marker.setLatLng([lat, lng])
    map.setView([lat, lng])
  }, [lat, lng])

  return (
    <div
      ref={container}
      role="img"
      aria-label="Mapa de la ubicación elegida"
      className="relative z-0 isolate h-64 w-full rounded-lg border"
    />
  )
}
