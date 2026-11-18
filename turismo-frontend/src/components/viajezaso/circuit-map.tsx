import { useEffect, useRef, useState } from 'react'

import { ROUTE_EXAMPLES, ROUTE_GEOMETRY } from '@/lib/viajezaso/data'
import { routeMetrics, sampleRoute } from '@/lib/viajezaso/route-geometry'
import type { RoutePoint } from '@/lib/viajezaso/route-geometry'
import { useViajezaso } from './context'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'

interface RouteFeature {
  type: 'Feature'
  properties: Record<string, never>
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

function feature(path: RoutePoint[]): RouteFeature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: path.map((point) => [point[1], point[0]]),
    },
  }
}

/**
 * Recorrido de ejemplo sobre OpenStreetMap.
 *
 * Leaflet se usa directo en 2D y MapLibre solo como vista 3D opcional. Ambos SDK se
 * cargan con `import()` dinámico para no arrastrarlos al bundle inicial; si el 3D no
 * arranca (WebGL o estilo), vuelve a 2D sin romper la demo.
 */
export function CircuitMap({
  routeIndex,
  active = true,
}: {
  routeIndex: number
  active?: boolean
}) {
  const { asset, copy, language } = useViajezaso()
  const container = useRef<HTMLDivElement>(null)
  const api = useRef<{ setProgress: (progress: number) => void } | null>(null)
  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(0)
  const [paused, setPaused] = useState(false)
  const [replay, setReplay] = useState(0)
  const [complete, setComplete] = useState(false)
  const [visible, setVisible] = useState(true)
  const [reduced, setReduced] = useState(false)
  const geometry = ROUTE_GEOMETRY[routeIndex]
  const route = ROUTE_EXAMPLES[language][routeIndex]

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(media.matches)
    const change = (event: MediaQueryListEvent) => setReduced(event.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    if (!container.current || !window.IntersectionObserver) return
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries[0].isIntersecting),
      { threshold: 0.1 },
    )
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!active) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let removeMap: (() => void) | undefined
    const markerRemovers: Array<() => void> = []
    if (!container.current) return
    const node = container.current
    setLoading(true)
    setError('')
    api.current = null
    const fail = () => {
      if (!disposed) {
        setError(copy.mapTileFallback || copy.mapFallback)
        setLoading(false)
      }
    }
    async function setup() {
      try {
        if (mode === '2d') {
          const { default: L } = await import('leaflet')
          if (disposed) return
          const map = L.map(node, {
            scrollWheelZoom: false,
            dragging: !L.Browser.mobile,
            zoomControl: false,
            attributionControl: false,
            zoomAnimation: false,
            fadeAnimation: false,
          })
          removeMap = () => map.remove()
          L.control
            .zoom({
              position: 'topleft',
              zoomInTitle: copy.zoomIn,
              zoomOutTitle: copy.zoomOut,
            })
            .addTo(map)
          L.control.attribution({ prefix: false }).addTo(map)
          const tiles = L.tileLayer(
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
              maxZoom: 19,
              minZoom: 11,
              keepBuffer: 1,
              updateWhenIdle: true,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
            },
          ).addTo(map)
          let errors = 0
          tiles.on('tileerror', () => {
            if (++errors >= 3) fail()
          })
          tiles.on('load', () => {
            if (!disposed) {
              clearTimeout(timer)
              setLoading(false)
              if (!errors) setError('')
            }
          })
          L.polyline(geometry.path, {
            color: '#fff',
            weight: 8,
            interactive: false,
          }).addTo(map)
          L.polyline(geometry.path, {
            color: '#89cbdc',
            weight: 3,
            interactive: false,
          }).addTo(map)
          const line = L.polyline(geometry.path, {
            color: '#008fbb',
            weight: 4,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false,
          }).addTo(map)
          geometry.stops.forEach((point, i) =>
            L.marker(point, {
              title: route.stops[i],
              alt: route.stops[i],
              icon: L.divIcon({
                className: 'route-number-marker',
                html: `<span>${i + 1}</span>`,
                iconSize: [25, 25],
                iconAnchor: [12, 12],
              }),
            })
              .bindTooltip(route.stops[i])
              .addTo(map),
          )
          const picture = document.createElement('img')
          picture.src = asset('turista.png')
          picture.alt = ''
          picture.width = 44
          picture.height = 49
          const traveler = L.marker(geometry.path[0], {
            interactive: false,
            keyboard: false,
            zIndexOffset: 1000,
            icon: L.divIcon({
              className: 'route-traveler',
              html: picture,
              iconSize: [44, 49],
              iconAnchor: [22, 45],
            }),
          }).addTo(map)
          api.current = {
            setProgress(progress: number) {
              const sample = sampleRoute(routeMetrics(geometry.path), progress)
              line.setLatLngs(sample.path)
              traveler.setLatLng(sample.position)
            },
          }
          map.fitBounds(L.latLngBounds(geometry.path), {
            padding: [35, 32],
            maxZoom: 16.5,
            animate: false,
          })
          setReady((value) => value + 1)
          timer = setTimeout(fail, 14000)
        } else {
          const {
            GeoJSONSource,
            LngLatBounds,
            Map: MapLibreMap,
            Marker: MapLibreMarker,
            NavigationControl,
            Popup,
          } = await import('maplibre-gl')
          if (disposed) return
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('webgl2')
          if (!context) throw new Error('WebGL2 unavailable')
          context.getExtension('WEBGL_lose_context')?.loseContext()
          const fallback = () => {
            if (!disposed) {
              setMode('2d')
              setError(copy.map3DUnavailable)
            }
          }
          const map = new MapLibreMap({
            container: node,
            style: asset('maps/cordoba-style.json'),
            center: [-64.187, -31.423],
            zoom: 14,
            pitch: 55,
            bearing: -18,
            scrollZoom: false,
            cooperativeGestures: true,
            attributionControl: { compact: false },
          })
          removeMap = () => map.remove()
          map.addControl(
            new NavigationControl({ visualizePitch: true }),
            'top-left',
          )
          timer = setTimeout(fallback, 14000)
          let errors = 0
          map.on('error', () => {
            if (++errors >= 3) fallback()
          })
          map.on('webglcontextlost', fallback)
          map.once('load', () => {
            if (disposed) return
            clearTimeout(timer)
            setLoading(false)
            map.addSource('viajezaso-route', {
              type: 'geojson',
              data: feature(geometry.path),
            })
            map.addSource('viajezaso-progress', {
              type: 'geojson',
              data: feature(geometry.path),
            })
            map.addLayer({
              id: 'viajezaso-casing',
              type: 'line',
              source: 'viajezaso-route',
              paint: { 'line-color': '#fff', 'line-width': 8 },
            })
            map.addLayer({
              id: 'viajezaso-base',
              type: 'line',
              source: 'viajezaso-route',
              paint: { 'line-color': '#89cbdc', 'line-width': 3 },
            })
            map.addLayer({
              id: 'viajezaso-line',
              type: 'line',
              source: 'viajezaso-progress',
              paint: { 'line-color': '#008fbb', 'line-width': 4 },
              layout: { 'line-cap': 'round', 'line-join': 'round' },
            })
            if (map.getLayer('building-3d'))
              map.setLayoutProperty('building-3d', 'visibility', 'visible')
            geometry.stops.forEach((point, i) => {
              const element = document.createElement('button')
              element.type = 'button'
              element.className = 'vector-route-stop'
              element.textContent = String(i + 1)
              element.setAttribute('aria-label', route.stops[i])
              const marker = new MapLibreMarker({ element })
                .setLngLat([point[1], point[0]])
                .setPopup(
                  new Popup({ closeButton: false, offset: 16 }).setText(
                    route.stops[i],
                  ),
                )
                .addTo(map)
              markerRemovers.push(() => marker.remove())
            })
            const element = document.createElement('div')
            element.className = 'vector-route-traveler'
            const image = document.createElement('img')
            image.src = asset('turista.png')
            image.alt = ''
            element.append(image)
            const traveler = new MapLibreMarker({
              element,
              anchor: 'bottom',
            })
              .setLngLat([geometry.path[0][1], geometry.path[0][0]])
              .addTo(map)
            markerRemovers.push(() => traveler.remove())
            api.current = {
              setProgress(progress: number) {
                const sample = sampleRoute(routeMetrics(geometry.path), progress)
                const source = map.getSource('viajezaso-progress')
                if (source instanceof GeoJSONSource)
                  source.setData(feature(sample.path))
                traveler.setLngLat([sample.position[1], sample.position[0]])
              },
            }
            const coords: [number, number][] = geometry.path.map((point) => [
              point[1],
              point[0],
            ])
            const bounds = coords.reduce(
              (accumulator, point) => accumulator.extend(point),
              new LngLatBounds(coords[0], coords[0]),
            )
            map.fitBounds(bounds, {
              padding: 40,
              maxZoom: 16.5,
              pitch: 55,
              bearing: -18,
              duration: 0,
            })
            setReady((value) => value + 1)
          })
        }
      } catch {
        if (!disposed) {
          if (mode === '3d') setMode('2d')
          else fail()
        }
      }
    }
    void setup()
    return () => {
      disposed = true
      clearTimeout(timer)
      api.current = null
      markerRemovers.forEach((remove) => remove())
      removeMap?.()
    }
  }, [active, routeIndex, mode, language, asset, copy, geometry, route])

  useEffect(() => {
    const draw = api.current
    if (!draw || !active) return
    if (reduced) {
      draw.setProgress(1)
      setComplete(true)
      return
    }
    if (paused || !visible) return
    let frame = 0
    let started: number | null = null
    setComplete(false)
    const tick = (now: number) => {
      if (document.hidden) {
        started = null
        frame = requestAnimationFrame(tick)
        return
      }
      if (started === null) started = now
      const progress = Math.min((now - started) / 7500, 1)
      draw.setProgress(progress)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else setComplete(true)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [ready, paused, replay, reduced, visible, active, routeIndex])

  const modes: Array<'2d' | '3d'> = ['2d', '3d']

  return (
    <div className="map-preview">
      <div
        ref={container}
        id="circuit-map"
        className="osm-map"
        role="region"
        aria-label={copy.mapAlt}
      />
      {loading && (
        <div className="map-loading">
          <span>{copy.mapLoading}</span>
        </div>
      )}
      <div className="map-actions">
        <div
          className="map-view-switch"
          role="group"
          aria-label={copy.mapViewLabel}
        >
          {modes.map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        {!reduced && (
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => {
              if (complete) {
                setPaused(false)
                setReplay((value) => value + 1)
              } else setPaused((value) => !value)
            }}
          >
            {
              copy[
                complete ? 'replayRoute' : paused ? 'playRoute' : 'pauseRoute'
              ]
            }
          </button>
        )}
      </div>
      {error && (
        <p className="map-fallback" role="status">
          {error}
        </p>
      )}
    </div>
  )
}
