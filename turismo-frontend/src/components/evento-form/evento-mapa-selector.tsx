import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

maplibregl.setWorkerUrl(workerUrl)

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

interface EventoMapaSelectorProps {
  lat: number
  lng: number
  onCoordsChange: (lat: number, lng: number) => void
}

/**
 * Selector de ubicación con el comportamiento de VZ-30: MapLibre, estilos, 2D/3D, clic y
 * marcador arrastrable. El geocoding inverso lo hace el formulario al recibir las coordenadas.
 */
export function EventoMapaSelector({ lat, lng, onCoordsChange }: EventoMapaSelectorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const onCoordsChangeRef = useRef(onCoordsChange)
  onCoordsChangeRef.current = onCoordsChange

  const [estilo, setEstilo] = useState<EstiloMapa>(ESTILO_INICIAL)
  const [is3D, setIs3D] = useState(true)

  useEffect(() => {
    const el = containerRef.current
    if (el === null) return

    const map = new maplibregl.Map({
      container: el,
      style: `${STYLE_BASE}/${ESTILO_INICIAL}`,
      center: [lng, lat],
      zoom: 15,
      pitch: 45,
      bearing: -15,
      attributionControl: false,
    })

    const marker = new maplibregl.Marker({ draggable: true })
      .setLngLat([lng, lat])
      .addTo(map)

    marker.on('dragend', () => {
      const position = marker.getLngLat()
      onCoordsChangeRef.current(position.lat, position.lng)
    })

    map.on('click', (event) => {
      const { lat: nextLat, lng: nextLng } = event.lngLat
      marker.setLngLat([nextLng, nextLat])
      onCoordsChangeRef.current(nextLat, nextLng)
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      marker.remove()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Solo al montar; los cambios de coordenadas se sincronizan en el efecto siguiente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (map === null || marker === null) return
    marker.setLngLat([lng, lat])
    map.jumpTo({ center: [lng, lat], zoom: 15 })
  }, [lat, lng])

  const cambiarEstilo = (next: EstiloMapa) => {
    setEstilo(next)
    mapRef.current?.setStyle(`${STYLE_BASE}/${next}`)
  }

  const alternar3D = () => {
    const next = !is3D
    setIs3D(next)
    mapRef.current?.easeTo({ pitch: next ? 45 : 0, bearing: next ? -15 : 0 })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={estilo} onValueChange={(value) => cambiarEstilo(value as EstiloMapa)}>
          <SelectTrigger aria-label="Estilo del mapa" className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTILOS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" variant="outline" onClick={alternar3D}>
          {is3D ? 'Ver en 2D' : 'Ver en 3D'}
        </Button>
      </div>
      <div
        ref={containerRef}
        role="img"
        aria-label="Mapa de la ubicación elegida"
        className="relative z-0 isolate h-64 w-full overflow-hidden rounded-lg border"
      />
    </div>
  )
}
