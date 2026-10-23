import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { geocodificarDestinoInverso } from '@/lib/geocoding'

import type { DestinoSeleccionado } from './types'

// MapLibre 6 resuelve su worker con `import.meta.url`, algo que Vite no puede seguir al
// prebundlear la librería: la URL queda apuntando a `.vite/deps` y el navegador bloquea el worker
// por MIME vacío. `?worker&url` deja que Vite emita el archivo (en dev y en build) y se lo
// registramos a MapLibre antes de crear el primer mapa.
maplibregl.setWorkerUrl(workerUrl)

/**
 * Mapa 3D de la zona de destino del planificador (MapLibre GL).
 *
 * Es imperativo, como Leaflet: el mapa se crea una sola vez en un `useEffect` y se destruye con
 * `map.remove()`. React solo lo alimenta con el destino elegido y escucha los clics/arrastres.
 *
 * El `destino` que llega por props es la fuente de verdad. El clic y el arrastre del marcador
 * hacen geocoding inverso y solo notifican al padre cuando Nominatim identifica una ciudad: la
 * API de viajes exige `ciudad`, así que un punto sin nombre no se puede guardar.
 */

const ESTILOS = [
  { id: 'bright', label: 'Bright' },
  { id: 'liberty', label: 'Liberty' },
  { id: 'positron', label: 'Positron' },
  { id: 'dark', label: 'Dark' },
  { id: 'fiord', label: 'Fiord' },
] as const

type EstiloMapa = (typeof ESTILOS)[number]['id']

const ESTILO_INICIAL: EstiloMapa = 'bright'
const STYLE_BASE = 'https://tiles.openfreemap.org/styles'
const CORDOBA_CENTER: [number, number] = [-64.1888, -31.4201]
const BUILDINGS_LAYER = '3d-buildings'
const RADIO_SOURCE = 'radio-source'
const RADIO_FILL_LAYER = 'radio-fill'
const RADIO_OUTLINE_LAYER = 'radio-outline'
const RADIO_COLOR = '#2e3033'
const RADIO_POINTS = 64
const RADIO_PADDING = 48
const RADIO_MAX_ZOOM = 13

function urlEstilo(estilo: EstiloMapa): string {
  return `${STYLE_BASE}/${estilo}`
}

/** Círculo aproximado alrededor de un punto, en grados, como pide el GeoJSON de un radio en km. */
function crearCirculo(
  centro: [number, number],
  radioKm: number,
  points = RADIO_POINTS,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [longitud, latitud] = centro
  const distanciaX = radioKm / (111.32 * Math.cos((latitud * Math.PI) / 180))
  const distanciaY = radioKm / 110.574

  const anillo: [number, number][] = []
  for (let i = 0; i < points; i += 1) {
    const theta = (i / points) * (2 * Math.PI)
    anillo.push([
      longitud + distanciaX * Math.cos(theta),
      latitud + distanciaY * Math.sin(theta),
    ])
  }
  anillo.push(anillo[0])

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [anillo] },
  }
}

/** Caja envolvente del anillo, para que `fitBounds` muestre el radio completo. */
function boundsDeCirculo(
  circulo: GeoJSON.Feature<GeoJSON.Polygon>,
): [[number, number], [number, number]] {
  let minLng = Number.POSITIVE_INFINITY
  let minLat = Number.POSITIVE_INFINITY
  let maxLng = Number.NEGATIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY

  for (const [lng, lat] of circulo.geometry.coordinates[0] ?? []) {
    if (lng < minLng) minLng = lng
    if (lat < minLat) minLat = lat
    if (lng > maxLng) maxLng = lng
    if (lat > maxLat) maxLat = lat
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

/**
 * Crea, actualiza o elimina el anillo del radio de exploración. Se llama tanto en cada `style.load`
 * (porque `setStyle` borra las capas personalizadas) como al mover el slider.
 */
function actualizarRadio(
  map: maplibregl.Map,
  destino: DestinoSeleccionado | null,
  radioKm: number,
): void {
  const existente = map.getSource(RADIO_SOURCE)

  if (destino === null || radioKm <= 0) {
    if (map.getLayer(RADIO_FILL_LAYER)) map.removeLayer(RADIO_FILL_LAYER)
    if (map.getLayer(RADIO_OUTLINE_LAYER)) map.removeLayer(RADIO_OUTLINE_LAYER)
    if (existente) map.removeSource(RADIO_SOURCE)
    return
  }

  const circulo = crearCirculo([destino.longitud, destino.latitud], radioKm)

  if (existente) {
    ;(existente as maplibregl.GeoJSONSource).setData(circulo)
    return
  }

  map.addSource(RADIO_SOURCE, { type: 'geojson', data: circulo })

  const beforeId = map.getLayer(BUILDINGS_LAYER) ? BUILDINGS_LAYER : undefined
  map.addLayer(
    {
      id: RADIO_FILL_LAYER,
      type: 'fill',
      source: RADIO_SOURCE,
      paint: { 'fill-color': RADIO_COLOR, 'fill-opacity': 0.16 },
    },
    beforeId,
  )
  map.addLayer(
    {
      id: RADIO_OUTLINE_LAYER,
      type: 'line',
      source: RADIO_SOURCE,
      paint: { 'line-color': RADIO_COLOR, 'line-width': 2 },
    },
    beforeId,
  )
}

/** Reencuadra la cámara para que el anillo entre completo, respetando el modo 2D/3D. */
function encuadrarRadio(
  map: maplibregl.Map,
  destino: DestinoSeleccionado,
  radioKm: number,
  es3D: boolean,
  duracion: number,
): void {
  const centro: [number, number] = [destino.longitud, destino.latitud]

  if (radioKm <= 0) {
    map.flyTo({
      center: centro,
      zoom: 15,
      pitch: es3D ? 55 : 0,
      bearing: es3D ? 20 : 0,
      duration: duracion,
      essential: true,
    })
    return
  }

  map.fitBounds(boundsDeCirculo(crearCirculo(centro, radioKm)), {
    padding: RADIO_PADDING,
    maxZoom: RADIO_MAX_ZOOM,
    duration: duracion,
    pitch: es3D ? 55 : 0,
    bearing: es3D ? 20 : 0,
  })
}

interface DestinoMapaProps {
  destino: DestinoSeleccionado | null
  /** Radio de exploración en km. En el paso 4 se omite (no hay radio). */
  radiusKm?: number
  /** Presente en el paso 4 (se elige el destino); ausente en el paso 5 (solo se muestra). */
  onSelectDestino?: (destino: DestinoSeleccionado) => void
}

export function DestinoMapa({ destino, radiusKm = 0, onSelectDestino }: DestinoMapaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const loadedRef = useRef(false)
  const is3DRef = useRef(true)
  const destinoRef = useRef(destino)
  const radioRef = useRef(radiusKm)
  const onSelectDestinoRef = useRef(onSelectDestino)
  const identificarRef = useRef<(latitud: number, longitud: number) => void>(() => {})

  const [is3D, setIs3D] = useState(true)
  const [estilo, setEstilo] = useState<EstiloMapa>(ESTILO_INICIAL)
  const [identificando, setIdentificando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    destinoRef.current = destino
  }, [destino])

  useEffect(() => {
    radioRef.current = radiusKm
  }, [radiusKm])

  useEffect(() => {
    onSelectDestinoRef.current = onSelectDestino
  }, [onSelectDestino])

  useEffect(() => {
    const el = containerRef.current
    if (el === null) return

    const map = new maplibregl.Map({
      container: el,
      style: urlEstilo(ESTILO_INICIAL),
      center: CORDOBA_CENTER,
      zoom: 13,
      pitch: is3DRef.current ? 45 : 0,
      bearing: is3DRef.current ? -17.6 : 0,
    })
    mapRef.current = map

    let abort: AbortController | null = null
    let identificandoAhora = false

    const identificar = async (latitud: number, longitud: number) => {
      if (identificandoAhora) return
      identificandoAhora = true
      setIdentificando(true)
      setError(null)

      const marcador = markerRef.current
      if (marcador !== null) marcador.setLngLat([longitud, latitud])

      abort?.abort()
      abort = new AbortController()
      const encontrado = await geocodificarDestinoInverso(latitud, longitud, abort.signal)

      if (abort.signal.aborted) return

      identificandoAhora = false
      setIdentificando(false)

      if (encontrado === null) {
        setError('No pudimos identificar ese punto. Probá con el buscador o elegí otra zona.')
        const actual = destinoRef.current
        if (actual !== null) {
          markerRef.current?.setLngLat([actual.longitud, actual.latitud])
        } else {
          markerRef.current?.remove()
          markerRef.current = null
        }
        return
      }

      const onSelect = onSelectDestinoRef.current
      if (onSelect === undefined) return

      onSelect({
        nombre: encontrado.nombre,
        ciudad: encontrado.ciudad,
        localidad: encontrado.localidad,
        latitud: encontrado.lat,
        longitud: encontrado.lng,
      })
    }

    identificarRef.current = (latitud, longitud) => {
      void identificar(latitud, longitud)
    }

    if (onSelectDestinoRef.current !== undefined) {
      map.on('click', (event) => {
        void identificar(event.lngLat.lat, event.lngLat.lng)
      })
    }

    map.on('style.load', () => {
      const primeraCarga = !loadedRef.current
      loadedRef.current = true

      const actual = destinoRef.current
      actualizarRadio(map, actual, radioRef.current)

      if (!map.getLayer(BUILDINGS_LAYER)) {
        map.addLayer({
          id: BUILDINGS_LAYER,
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#d1d5db',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.8,
          },
        })
      }

      if (map.getLayer(BUILDINGS_LAYER)) {
        map.setLayoutProperty(
          BUILDINGS_LAYER,
          'visibility',
          is3DRef.current ? 'visible' : 'none',
        )
      }

      if (primeraCarga && actual !== null) {
        if (radioRef.current > 0) {
          encuadrarRadio(map, actual, radioRef.current, is3DRef.current, 0)
        } else {
          map.jumpTo({
            center: [actual.longitud, actual.latitud],
            zoom: 15,
            pitch: is3DRef.current ? 55 : 0,
            bearing: is3DRef.current ? 20 : 0,
          })
        }
      }
    })

    return () => {
      abort?.abort()
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (map === null) return

    if (destino === null) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    const interactivo = onSelectDestinoRef.current !== undefined

    if (markerRef.current === null) {
      const marcador = new maplibregl.Marker({ color: '#1d1b1b', draggable: interactivo })
        .setLngLat([destino.longitud, destino.latitud])
        .addTo(map)

      if (interactivo) {
        marcador.on('dragend', () => {
          const punto = marcador.getLngLat()
          identificarRef.current(punto.lat, punto.lng)
        })
      }

      markerRef.current = marcador
    } else {
      markerRef.current.setLngLat([destino.longitud, destino.latitud])
    }

    if (loadedRef.current) {
      encuadrarRadio(map, destino, radioRef.current, is3DRef.current, 0)
    }
  }, [destino])

  useEffect(() => {
    const map = mapRef.current
    if (map === null || !loadedRef.current) return

    actualizarRadio(map, destino, radiusKm)

    if (destino !== null && radiusKm > 0) {
      encuadrarRadio(map, destino, radiusKm, is3DRef.current, 350)
    }
  }, [destino, radiusKm])

  useEffect(() => {
    is3DRef.current = is3D
    const map = mapRef.current
    if (map === null) return

    map.easeTo({
      pitch: is3D ? 55 : 0,
      bearing: is3D ? 20 : 0,
      duration: 1000,
    })

    if (map.getLayer(BUILDINGS_LAYER)) {
      map.setLayoutProperty(BUILDINGS_LAYER, 'visibility', is3D ? 'visible' : 'none')
    }
  }, [is3D])

  const cambiarEstilo = (nuevo: EstiloMapa) => {
    if (nuevo === estilo) return

    setEstilo(nuevo)
    mapRef.current?.setStyle(urlEstilo(nuevo))
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-xl">
      <div
        ref={containerRef}
        role="img"
        aria-label={
          onSelectDestino !== undefined
            ? 'Mapa para elegir tu zona de destino'
            : 'Mapa del radio de exploración'
        }
        className="h-72 w-full sm:h-80 md:h-[400px]"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <span className="hidden rounded-md bg-black/70 px-2.5 py-1 font-mono text-[10px] tracking-wider text-sky-300 sm:inline">
          {onSelectDestino !== undefined
            ? 'MAPA DE DESTINO · CÓRDOBA'
            : 'RADIO DE EXPLORACIÓN · CÓRDOBA'}
        </span>
        <div className="pointer-events-auto ml-auto flex items-center gap-2">
          <Select
            value={estilo}
            onValueChange={(valor) => cambiarEstilo(valor as EstiloMapa)}
          >
            <SelectTrigger
              size="sm"
              aria-label="Estilo del mapa"
              className="h-8 rounded-full border-0 bg-white/95 px-3 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-sm hover:bg-white focus-visible:ring-2"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {ESTILOS.map((opcion) => (
                <SelectItem key={opcion.id} value={opcion.id}>
                  {opcion.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setIs3D((valor) => !valor)}
            className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-sm transition-colors hover:bg-white"
          >
            {is3D ? 'Ver en 2D' : 'Ver en 3D'}
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/90 to-transparent p-3 pt-8">
        {error !== null ? (
          <p className="text-xs font-semibold text-amber-300">{error}</p>
        ) : identificando ? (
          <p className="text-xs font-semibold text-sky-300">Identificando el lugar…</p>
        ) : destino !== null ? (
          <p className="text-xs font-semibold text-white">
            {radiusKm > 0 ? 'Base' : 'Destino'}:{' '}
            <span className="text-sky-200">{destino.nombre}</span>
            {radiusKm > 0 ? ` · Radio: ${radiusKm} km` : null}
          </p>
        ) : (
          <p className="text-xs font-semibold text-slate-200">
            Buscá un lugar, tocá el mapa o arrastrá el pin para elegir tu base.
          </p>
        )}
      </div>
    </div>
  )
}
