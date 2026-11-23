import type { Map as LeafletMap, Marker as LeafletMarker, Polyline } from 'leaflet'

import {
  crearImagenTurista,
  crearMarcadorNumero,
  TURISTA_ALTO,
  TURISTA_ANCHO,
  type MapaCircuito,
  type ParadaMapa,
} from './mapa-circuito'

const ROUTE_COLOR = '#008fbb'
const ROUTE_BASE_COLOR = '#89cbdc'

export async function crearMapaLeaflet(
  container: HTMLElement,
  onSelectStop: (index: number) => void,
): Promise<MapaCircuito> {
  const { default: L } = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  const map: LeafletMap = L.map(container, {
    scrollWheelZoom: false,
    // Arriba a la izquierda queda tapado por la tarjeta de resumen: va a la derecha,
    // debajo del selector 2D/3D (el contenedor lo corre hacia abajo).
    zoomControl: false,
    attributionControl: true,
  })
  L.control.zoom({ position: 'topright' }).addTo(map)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize()
  })
  resizeObserver.observe(container)

  let markers: LeafletMarker[] = []
  let routeCasing: Polyline | null = null
  let routeLine: Polyline | null = null
  let progressLine: Polyline | null = null
  let traveler: LeafletMarker | null = null
  let rutaActual: [number, number][] = []
  let paradasActuales: ParadaMapa[] = []
  let activaActual = 0
  // Leaflet necesita centro y zoom antes de agregar capas o moverse: sin vista inicial,
  // un panTo deja el zoom indefinido, la capa de tiles falla y los marcadores quedan a
  // medio crear (después rompen al destruir el mapa).
  let tieneVista = false
  // true mientras el muñequito recorre la ruta (la ruta completa pasa a ser la base celeste).
  let recorriendo = false

  const asegurarVista = (paradas: ParadaMapa[]) => {
    if (tieneVista || paradas.length === 0) return
    map.fitBounds(
      L.latLngBounds(paradas.map((s) => [s.latitud, s.longitud] as [number, number])),
      { padding: [40, 40], maxZoom: 16, animate: false },
    )
    tieneVista = true
  }

  const api: MapaCircuito = {
    setRuta(geom) {
      rutaActual = geom
      routeCasing?.remove()
      routeLine?.remove()
      routeCasing = null
      routeLine = null
      if (geom.length < 2) return
      routeCasing = L.polyline(geom, {
        color: '#fff',
        weight: 8,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)
      routeLine = L.polyline(geom, {
        color: recorriendo ? ROUTE_BASE_COLOR : ROUTE_COLOR,
        weight: recorriendo ? 3 : 4,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)
      // La línea de progreso tiene que quedar encima de la ruta recién dibujada.
      progressLine?.bringToFront()
    },

    setParadas(paradas, activa) {
      paradasActuales = paradas
      activaActual = activa
      asegurarVista(paradas)
      markers.forEach((m) => m.remove())
      markers = []
      for (const stop of paradas) {
        const isActive = stop.index === activa
        const el = crearMarcadorNumero(stop.number, isActive)
        el.setAttribute('aria-label', stop.title)
        const icon = L.divIcon({
          className: '',
          html: el,
          iconSize: [isActive ? 36 : 28, isActive ? 36 : 28],
          iconAnchor: [isActive ? 18 : 14, isActive ? 18 : 14],
        })
        const marker = L.marker([stop.latitud, stop.longitud], {
          icon,
          zIndexOffset: isActive ? 500 : 0,
        }).addTo(map)
        marker.on('click', () => onSelectStop(stop.index))
        if (isActive) {
          const popup = document.createElement('div')
          const title = document.createElement('strong')
          title.textContent = stop.title
          popup.appendChild(title)
          const hours = document.createElement('div')
          hours.textContent = stop.hours
          hours.style.fontSize = '12px'
          hours.style.marginTop = '4px'
          popup.appendChild(hours)
          // autoPan: false para que abrir el popup no mueva el mapa (y no frene la animación).
          marker.bindPopup(popup, { autoPan: false }).openPopup()
        }
        markers.push(marker)
      }
    },

    setActiva(i) {
      activaActual = i
      api.setParadas(paradasActuales, i)
      const active = paradasActuales.find((p) => p.index === i)
      if (!active) return
      if (tieneVista) {
        map.panTo([active.latitud, active.longitud], { animate: true })
      } else {
        map.setView([active.latitud, active.longitud], 15)
        tieneVista = true
      }
    },

    encuadrarRuta() {
      if (rutaActual.length >= 2 && routeLine) {
        map.fitBounds(routeLine.getBounds(), { padding: [40, 40] })
        tieneVista = true
        return
      }
      if (paradasActuales.length > 0) {
        map.fitBounds(
          L.latLngBounds(
            paradasActuales.map((s) => [s.latitud, s.longitud] as [number, number]),
          ),
          { padding: [40, 40], maxZoom: 16 },
        )
        tieneVista = true
      }
    },

    setProgreso(path, position) {
      // Sin recorrido: la ruta completa vuelve a su color y el muñequito desaparece.
      if (path.length === 0 && !position) {
        recorriendo = false
        routeLine?.setStyle({ color: ROUTE_COLOR, weight: 4 })
        progressLine?.setLatLngs([])
        traveler?.remove()
        traveler = null
        return
      }
      // Recorriendo: la ruta completa queda de base (celeste) y se pinta lo recorrido.
      if (!recorriendo) {
        recorriendo = true
        routeLine?.setStyle({ color: ROUTE_BASE_COLOR, weight: 3 })
      }
      if (!progressLine) {
        progressLine = L.polyline([], {
          color: ROUTE_COLOR,
          weight: 4,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(map)
      }
      progressLine.setLatLngs(path)

      if (!position) return
      if (!traveler) {
        traveler = L.marker(position, {
          icon: L.divIcon({
            className: 'route-traveler',
            html: crearImagenTurista(),
            iconSize: [TURISTA_ANCHO, TURISTA_ALTO],
            iconAnchor: [TURISTA_ANCHO / 2, TURISTA_ALTO - 4],
          }),
          zIndexOffset: 1000,
          interactive: false,
          keyboard: false,
        }).addTo(map)
      } else {
        traveler.setLatLng(position)
      }
    },

    destruir() {
      resizeObserver.disconnect()
      // map.remove() ya saca todas las capas (marcadores, rutas, muñequito).
      // La limpieza al desmontar nunca debe tirar la pantalla abajo: si Leaflet quedó en
      // un estado inconsistente, se descarta el error y el contenedor igual se libera.
      try {
        map.remove()
      } catch {
        /* mapa ya destruido o a medio inicializar */
      }
      markers = []
      routeCasing = null
      routeLine = null
      progressLine = null
      traveler = null
      void activaActual
    },
  }

  return api
}
