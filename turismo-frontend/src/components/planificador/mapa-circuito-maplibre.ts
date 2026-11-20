import {
  crearImagenTurista,
  crearMarcadorNumero,
  pathToGeoJson,
  type MapaCircuito,
  type ParadaMapa,
} from './mapa-circuito'

const STYLE_URL = '/viajezaso/assets/maps/cordoba-style.json'
const LOAD_TIMEOUT_MS = 14000

export class MapLibreUnavailableError extends Error {
  constructor(message = 'La vista 3D no está disponible en este dispositivo') {
    super(message)
    this.name = 'MapLibreUnavailableError'
  }
}

export function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

export async function crearMapaMapLibre(
  container: HTMLElement,
  onSelectStop: (index: number) => void,
  onFallback2d: (message: string) => void,
): Promise<MapaCircuito> {
  if (!hasWebGL2()) {
    throw new MapLibreUnavailableError()
  }

  const {
    GeoJSONSource,
    LngLatBounds,
    Map: MapLibreMap,
    Marker: MapLibreMarker,
    NavigationControl,
    Popup,
  } = await import('maplibre-gl')
  await import('maplibre-gl/dist/maplibre-gl.css')

  let disposed = false
  let errorCount = 0
  const stopMarkers: Array<InstanceType<typeof MapLibreMarker>> = []
  let traveler: InstanceType<typeof MapLibreMarker> | null = null
  let rutaActual: [number, number][] = []
  let paradasActuales: ParadaMapa[] = []
  let activaActual = 0
  let mapLoaded = false

  const fallbackMsg = 'La vista 3D no está disponible en este dispositivo'
  const fallback = () => {
    if (disposed) return
    disposed = true
    onFallback2d(fallbackMsg)
  }

  const map = new MapLibreMap({
    container,
    style: STYLE_URL,
    center: [-64.187, -31.423],
    zoom: 14,
    pitch: 55,
    bearing: -18,
    scrollZoom: false,
    cooperativeGestures: true,
    attributionControl: { compact: false },
  })

  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')

  const loadTimer = setTimeout(fallback, LOAD_TIMEOUT_MS)

  map.on('error', () => {
    errorCount += 1
    if (errorCount >= 3) fallback()
  })
  map.on('webglcontextlost', fallback)

  await new Promise<void>((resolve, reject) => {
    map.once('load', () => {
      if (disposed) {
        reject(new MapLibreUnavailableError())
        return
      }
      clearTimeout(loadTimer)
      mapLoaded = true
      if (map.getLayer('building-3d')) {
        map.setLayoutProperty('building-3d', 'visibility', 'visible')
      }
      map.addSource('circuito-route', {
        type: 'geojson',
        data: pathToGeoJson([]),
      })
      map.addSource('circuito-progress', {
        type: 'geojson',
        data: pathToGeoJson([]),
      })
      map.addLayer({
        id: 'circuito-casing',
        type: 'line',
        source: 'circuito-route',
        paint: { 'line-color': '#fff', 'line-width': 8 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.addLayer({
        id: 'circuito-base',
        type: 'line',
        source: 'circuito-route',
        paint: { 'line-color': '#89cbdc', 'line-width': 3 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.addLayer({
        id: 'circuito-line',
        type: 'line',
        source: 'circuito-progress',
        paint: { 'line-color': '#008fbb', 'line-width': 4 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      resolve()
    })
  })

  const reducedMotion = () =>
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const clearStopMarkers = () => {
    stopMarkers.forEach((m) => m.remove())
    stopMarkers.length = 0
  }

  const paintParadas = () => {
    clearStopMarkers()
    for (const stop of paradasActuales) {
      const isActive = stop.index === activaActual
      const element = crearMarcadorNumero(stop.number, isActive)
      element.setAttribute('aria-label', stop.title)
      element.addEventListener('click', () => onSelectStop(stop.index))
      const marker = new MapLibreMarker({ element })
        .setLngLat([stop.longitud, stop.latitud])
        .setPopup(
          new Popup({ closeButton: false, offset: 16 }).setText(
            `${stop.title}\n${stop.hours}`,
          ),
        )
        .addTo(map)
      if (isActive) marker.togglePopup()
      stopMarkers.push(marker)
    }
  }

  const api: MapaCircuito = {
    setRuta(geom) {
      rutaActual = geom
      if (!mapLoaded) return
      const source = map.getSource('circuito-route')
      if (source instanceof GeoJSONSource) {
        source.setData(pathToGeoJson(geom))
      }
      // En reposo la ruta completa se ve en el azul fuerte (la capa de progreso la cubre toda).
      const progress = map.getSource('circuito-progress')
      if (progress instanceof GeoJSONSource) {
        progress.setData(pathToGeoJson(geom))
      }
    },

    setParadas(paradas, activa) {
      paradasActuales = paradas
      activaActual = activa
      if (!mapLoaded) return
      paintParadas()
    },

    setActiva(i) {
      activaActual = i
      paintParadas()
      const active = paradasActuales.find((p) => p.index === i)
      if (!active) return
      const center: [number, number] = [active.longitud, active.latitud]
      if (reducedMotion()) {
        map.jumpTo({ center, zoom: Math.max(map.getZoom(), 15), pitch: 55 })
      } else {
        map.flyTo({ center, zoom: Math.max(map.getZoom(), 15), pitch: 55 })
      }
    },

    encuadrarRuta() {
      const coords =
        rutaActual.length >= 2
          ? rutaActual.map(([lat, lng]) => [lng, lat] as [number, number])
          : paradasActuales.map(
              (s) => [s.longitud, s.latitud] as [number, number],
            )
      if (coords.length === 0) return
      const bounds = coords.reduce(
        (acc, point) => acc.extend(point),
        new LngLatBounds(coords[0], coords[0]),
      )
      map.fitBounds(bounds, {
        padding: 40,
        maxZoom: 16.5,
        pitch: 55,
        bearing: -18,
        duration: reducedMotion() ? 0 : 500,
      })
    },

    setProgreso(path, position) {
      if (!mapLoaded) return
      const source = map.getSource('circuito-progress')
      // Sin recorrido: vuelve a reposo (ruta completa en azul) y el muñequito desaparece.
      if (path.length === 0 && !position) {
        if (source instanceof GeoJSONSource) source.setData(pathToGeoJson(rutaActual))
        traveler?.remove()
        traveler = null
        return
      }
      if (source instanceof GeoJSONSource) {
        source.setData(pathToGeoJson(path))
      }
      if (!position) return
      if (!traveler) {
        const element = document.createElement('div')
        element.className = 'vector-route-traveler'
        element.append(crearImagenTurista())
        traveler = new MapLibreMarker({ element, anchor: 'bottom' })
          .setLngLat([position[1], position[0]])
          .addTo(map)
      } else {
        traveler.setLngLat([position[1], position[0]])
      }
    },

    destruir() {
      disposed = true
      clearTimeout(loadTimer)
      clearStopMarkers()
      traveler?.remove()
      traveler = null
      try {
        map.remove()
      } catch {
        /* already removed */
      }
    },
  }

  return api
}
