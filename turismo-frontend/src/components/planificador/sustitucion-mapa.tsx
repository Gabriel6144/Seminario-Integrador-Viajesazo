import { useEffect, useMemo, useRef, useState } from 'react'
import type { LayerGroup, Map as LeafletMap } from 'leaflet'

/** Un punto del mapa de sustitución con nombre (se muestra como tooltip, nunca como HTML). */
export interface PuntoSustitucion {
  nombre: string
  lat: number
  lng: number
}

export interface OpcionEnMapa extends PuntoSustitucion {
  propuestaId: number
  letra: string
}

interface SustitucionMapaProps {
  anterior: PuntoSustitucion | null
  siguiente: PuntoSustitucion | null
  /** La parada que se va a reemplazar (se dibuja tachada). */
  actual: PuntoSustitucion | null
  opciones: OpcionEnMapa[]
  seleccionadaId: number | null
  onSelect: (propuestaId: number) => void
}

const AZUL = '#00658d'
const GRIS = '#94a3b8'

type Leaflet = typeof import('leaflet')

function pinVecina(numero: string): string {
  return `<span style="display:flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:999px;background:#0f172a;color:#fff;font:800 12px Nunito,sans-serif;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.3)">${numero}</span>`
}

function pinActual(): string {
  return `<span style="display:flex;width:26px;height:26px;align-items:center;justify-content:center;border-radius:999px;background:#fff;color:#64748b;font:800 12px Nunito,sans-serif;border:2px dashed ${GRIS}">×</span>`
}

function pinOpcion(letra: string, seleccionada: boolean): string {
  const size = seleccionada ? 38 : 30
  const fondo = seleccionada ? AZUL : '#fff'
  const color = seleccionada ? '#fff' : AZUL
  return `<span style="display:flex;width:${size}px;height:${size}px;align-items:center;justify-content:center;border-radius:999px 999px 999px 4px;transform:rotate(-45deg);background:${fondo};border:2px solid ${AZUL};box-shadow:0 3px 8px rgba(15,23,42,.25)"><span style="transform:rotate(45deg);color:${color};font:800 13px Nunito,sans-serif">${letra}</span></span>`
}

/** Tooltip con el nombre como texto plano: los nombres vienen de los publicadores. */
function tooltip(texto: string): HTMLElement {
  const el = document.createElement('span')
  el.textContent = texto
  return el
}

/**
 * Mapa del panel "Sustituir parada": las paradas vecinas, la que se reemplaza (tachada), una letra
 * por opción y la vista previa del recorrido con la opción elegida (anterior → opción → siguiente).
 * Las líneas son rectas: es una vista previa, no la ruta a pie.
 */
export function SustitucionMapa({
  anterior,
  siguiente,
  actual,
  opciones,
  seleccionadaId,
  onSelect,
}: SustitucionMapaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const leafletRef = useRef<Leaflet | null>(null)
  const capaRef = useRef<LayerGroup | null>(null)
  const onSelectRef = useRef(onSelect)
  const [listo, setListo] = useState(false)

  // Encuadre inicial con todos los puntos que haya al abrir el panel.
  const puntos = useMemo<[number, number][]>(
    () =>
      [anterior, siguiente, actual, ...opciones]
        .filter((p): p is PuntoSustitucion => p !== null)
        .map((p) => [p.lat, p.lng]),
    [anterior, siguiente, actual, opciones],
  )
  const puntosIniciales = useRef<[number, number][]>([])

  // Las refs se actualizan después de cada render (declarado antes que el efecto que crea el mapa).
  useEffect(() => {
    onSelectRef.current = onSelect
    puntosIniciales.current = puntos
  })

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    let cancelado = false
    let resizeObserver: ResizeObserver | null = null

    void (async () => {
      const { default: L } = await import('leaflet')
      await import('leaflet/dist/leaflet.css')
      if (cancelado) return
      const map = L.map(node, { scrollWheelZoom: false, attributionControl: true })
      const puntos = puntosIniciales.current
      // Leaflet necesita una vista antes de agregar capas.
      if (puntos.length > 1) {
        map.fitBounds(L.latLngBounds(puntos), { padding: [36, 36], maxZoom: 16, animate: false })
      } else {
        map.setView(puntos[0] ?? [-31.4167, -64.1833], 15)
      }
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => map.invalidateSize())
        resizeObserver.observe(node)
      }
      leafletRef.current = L
      mapRef.current = map
      capaRef.current = L.layerGroup().addTo(map)
      setListo(true)
    })()

    return () => {
      cancelado = true
      resizeObserver?.disconnect()
      try {
        mapRef.current?.remove()
      } catch {
        // El mapa pudo haber quedado a medio crear; no hay nada más que limpiar.
      }
      mapRef.current = null
      capaRef.current = null
      leafletRef.current = null
    }
  }, [])

  useEffect(() => {
    const L = leafletRef.current
    const capa = capaRef.current
    if (!listo || !L || !capa) return
    capa.clearLayers()

    const seleccionada = opciones.find((o) => o.propuestaId === seleccionadaId) ?? null
    const tramo = (medio: PuntoSustitucion | null): [number, number][] =>
      [anterior, medio, siguiente]
        .filter((p): p is PuntoSustitucion => p !== null)
        .map((p) => [p.lat, p.lng])

    const actualTramo = tramo(actual)
    if (actualTramo.length > 1) {
      L.polyline(actualTramo, { color: GRIS, weight: 3, dashArray: '6 8', interactive: false }).addTo(capa)
    }
    if (seleccionada) {
      const previa = tramo(seleccionada)
      if (previa.length > 1) {
        L.polyline(previa, { color: '#ffffff', weight: 8, interactive: false }).addTo(capa)
        L.polyline(previa, { color: AZUL, weight: 4, interactive: false }).addTo(capa)
      }
    }

    const vecina = (p: PuntoSustitucion | null, numero: string) => {
      if (!p) return
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: '', html: pinVecina(numero), iconSize: [28, 28], iconAnchor: [14, 14] }),
        keyboard: false,
        interactive: false,
      })
        .bindTooltip(tooltip(p.nombre), { direction: 'top', offset: [0, -14] })
        .addTo(capa)
    }
    vecina(anterior, '←')
    vecina(siguiente, '→')
    if (actual) {
      L.marker([actual.lat, actual.lng], {
        icon: L.divIcon({ className: '', html: pinActual(), iconSize: [26, 26], iconAnchor: [13, 13] }),
        keyboard: false,
        interactive: false,
      }).addTo(capa)
    }

    for (const opcion of opciones) {
      const esSeleccionada = opcion.propuestaId === seleccionadaId
      const size = esSeleccionada ? 38 : 30
      L.marker([opcion.lat, opcion.lng], {
        icon: L.divIcon({
          className: '',
          html: pinOpcion(opcion.letra, esSeleccionada),
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
        }),
        zIndexOffset: esSeleccionada ? 1000 : 0,
        title: `${opcion.letra} · ${opcion.nombre}`,
        alt: `Elegir ${opcion.nombre}`,
      })
        .on('click', () => onSelectRef.current(opcion.propuestaId))
        .addTo(capa)
    }
  }, [listo, anterior, siguiente, actual, opciones, seleccionadaId])

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa con las opciones para sustituir la parada"
      className="relative isolate z-0 h-full w-full"
    />
  )
}
