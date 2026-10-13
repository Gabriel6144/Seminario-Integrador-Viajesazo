import { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'

// Arreglar el ícono por defecto de Leaflet con Vite
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface UbicacionEventoProps {
  lugar: string
  localidad: string
  direccion: string
  referencia: string
  lat: number | null
  lng: number | null
  onLugarChange: (value: string) => void
  onLocalidadChange: (value: string) => void
  onDireccionChange: (value: string) => void
  onReferenciaChange: (value: string) => void
  onLatChange: (value: number | null) => void
  onLngChange: (value: number | null) => void
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  name?: string
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    municipality?: string
    county?: string
  }
  osm_type?: string
  osm_id?: number
  amenity?: string
  tourism?: string
  road?: string
}

const CORDOBA_CENTER: [number, number] = [-31.4201, -64.1888]

export function UbicacionEvento({
  lugar,
  localidad,
  direccion,
  referencia,
  lat,
  lng,
  onLugarChange,
  onLocalidadChange,
  onDireccionChange,
  onReferenciaChange,
  onLatChange,
  onLngChange,
}: UbicacionEventoProps) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<NominatimResult[]>([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    if (!busqueda.trim()) return

    setBuscando(true)
    setError(null)
    setResultados([])

    try {
      const params = new URLSearchParams({
        q: busqueda,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'ar',
        'accept-language': 'es',
        viewbox: '-65.8,-29.5,-61.8,-35.1',
        bounded: '1',
      })

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
      if (!response.ok) throw new Error('Error en la búsqueda')

      const data = (await response.json()) as NominatimResult[]
      setResultados(data)
      if (data.length === 0) {
        setError('No se encontraron resultados')
      }
    } catch {
      setError('No se pudo buscar la ubicación. Intentá de nuevo.')
    } finally {
      setBuscando(false)
    }
  }, [busqueda])

  const elegirResultado = useCallback(
    (resultado: NominatimResult) => {
      const addr = resultado.address
      const lugarElegido =
        resultado.name || resultado.amenity || resultado.tourism || resultado.road || ''
      const localidadElegido =
        addr?.city || addr?.town || addr?.village || addr?.hamlet || addr?.municipality || addr?.county || ''

      onLugarChange(lugarElegido)
      onLocalidadChange(localidadElegido)
      onDireccionChange(resultado.display_name)
      onLatChange(parseFloat(resultado.lat))
      onLngChange(parseFloat(resultado.lon))
      setResultados([])
      setBusqueda('')
    },
    [onLugarChange, onLocalidadChange, onDireccionChange, onLatChange, onLngChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        buscar()
      }
    },
    [buscar],
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Buscador */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar lugar en Córdoba..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button type="button" onClick={buscar} disabled={buscando || !busqueda.trim()}>
          {buscando ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Resultados */}
      {resultados.length > 0 && (
        <ul className="flex flex-col gap-1">
          {resultados.map((resultado, index) => (
            <li key={`${resultado.osm_type}-${resultado.osm_id}-${index}`}>
              <button
                type="button"
                onClick={() => elegirResultado(resultado)}
                className="w-full rounded-lg border border-gray-200 bg-white p-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="font-medium">{resultado.name || resultado.display_name.split(',')[0]}</span>
                <span className="block text-xs text-gray-500">{resultado.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Mapa */}
      <div className="h-64 w-full overflow-hidden rounded-lg border border-gray-200">
        <MapContainer
          center={lat && lng ? [lat, lng] : CORDOBA_CENTER}
          zoom={lat && lng ? 16 : 9}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {lat && lng && (
            <DraggableMarker
              position={[lat, lng]}
              onDragEnd={(newLat, newLng) => {
                onLatChange(newLat)
                onLngChange(newLng)
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Inputs editables */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="lugar">Lugar o recinto</FieldLabel>
          <Input
            id="lugar"
            value={lugar}
            onChange={(e) => onLugarChange(e.target.value)}
            placeholder="Ej: Anfiteatro José Hernández"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="localidad">Localidad</FieldLabel>
          <Input
            id="localidad"
            value={localidad}
            onChange={(e) => onLocalidadChange(e.target.value)}
            placeholder="Ej: Jesús María"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="direccion">Dirección</FieldLabel>
          <Input
            id="direccion"
            value={direccion}
            onChange={(e) => onDireccionChange(e.target.value)}
            placeholder="Ej: Cleto Peña 82, esquina Abel Figueroa"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="referencia">Referencia</FieldLabel>
          <Input
            id="referencia"
            value={referencia}
            onChange={(e) => onReferenciaChange(e.target.value)}
            placeholder="Ej: A 2 cuadras de la plaza principal"
          />
        </Field>
      </FieldGroup>
    </div>
  )
}

function DraggableMarker({
  position,
  onDragEnd,
}: {
  position: [number, number]
  onDragEnd: (lat: number, lng: number) => void
}) {
  const [markerPosition, setMarkerPosition] = useState(position)

  const map = useMapEvents({
    dragend() {
      const center = map.getCenter()
      setMarkerPosition([center.lat, center.lng])
      onDragEnd(center.lat, center.lng)
    },
  })

  return <Marker position={markerPosition} draggable />
}
