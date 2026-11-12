import { lazy, Suspense, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buscarLugar, geocodificarInverso, type LugarEncontrado } from '@/lib/geocoding'

/**
 * Buscador de ubicación con preview en el mapa, para el formulario de eventos.
 *
 * Ayuda a completar `lugarRecinto`, `localidad` y `direccion`, que son la entrada del geocoding
 * del **backend**. No manda coordenadas: el backend sigue siendo la fuente de verdad y geocodifica
 * esos tres campos al guardar. Si la dirección no se puede geocodificar allá, el evento no se
 * guarda (400).
 *
 * El mapa se monta recién cuando hay una ubicación elegida o cuando el evento ya viene con
 * coordenadas (edición). Así, las páginas y los tests que no eligen nada no pagan el costo de
 * Leaflet.
 */

// Carga diferida: `ubicacion-preview-mapa` importa `leaflet` y su CSS, y no queremos que ese peso
// entre en cualquier test o pantalla que renderice el formulario.
const UbicacionPreviewMapa = lazy(() =>
  import('./ubicacion-preview-mapa').then((module) => ({ default: module.UbicacionPreviewMapa })),
)

export interface UbicacionSelectorProps {
  onLugarRecintoChange: (value: string) => void
  onLocalidadChange: (value: string) => void
  onDireccionChange: (value: string) => void
  /** Coordenadas que ya trae el evento en edición; arrancan el mapa centrado ahí. */
  latitudInicial?: number | null
  longitudInicial?: number | null
  /** Debounce del geocoding inverso al arrastrar el pin. La política de Nominatim pide ≤1 req/s. */
  reverseDelayMs?: number
}

export function UbicacionSelector({
  onLugarRecintoChange,
  onLocalidadChange,
  onDireccionChange,
  latitudInicial = null,
  longitudInicial = null,
  reverseDelayMs = 1000,
}: UbicacionSelectorProps) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<LugarEncontrado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ lat: number; lng: number } | null>(() =>
    latitudInicial !== null && longitudInicial !== null
      ? { lat: latitudInicial, lng: longitudInicial }
      : null,
  )

  const reverseTimeout = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (reverseTimeout.current !== null) window.clearTimeout(reverseTimeout.current)
    }
  }, [])

  const pedirInverso = useCallback(
    (lat: number, lng: number) => {
      // Debounce: si el usuario suelta el pin varias veces seguidas, solo la última cuenta.
      if (reverseTimeout.current !== null) window.clearTimeout(reverseTimeout.current)
      reverseTimeout.current = window.setTimeout(async () => {
        const ubicacion = await geocodificarInverso(lat, lng)
        if (ubicacion === null) return
        onDireccionChange(ubicacion.direccion)
        if (ubicacion.localidad.length > 0) onLocalidadChange(ubicacion.localidad)
      }, reverseDelayMs)
    },
    [reverseDelayMs, onDireccionChange, onLocalidadChange],
  )

  const handleCoordsChange = useCallback(
    (lat: number, lng: number) => {
      setPreview({ lat, lng })
      pedirInverso(lat, lng)
    },
    [pedirInverso],
  )

  const buscar = useCallback(async () => {
    const texto = busqueda.trim()
    if (texto.length === 0) return

    setBuscando(true)
    setError(null)
    setResultados([])

    const encontrados = await buscarLugar(texto)

    setResultados(encontrados)
    setBuscando(false)
    if (encontrados.length === 0) {
      setError('No se encontraron resultados. Revisá el texto o probá de nuevo.')
    }
  }, [busqueda])

  const elegir = useCallback(
    (lugar: LugarEncontrado) => {
      onLugarRecintoChange(lugar.lugarRecinto)
      onLocalidadChange(lugar.localidad)
      onDireccionChange(lugar.direccion)
      setPreview({ lat: lugar.lat, lng: lugar.lng })
      setResultados([])
      setBusqueda('')
    },
    [onLugarRecintoChange, onLocalidadChange, onDireccionChange],
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // El selector vive dentro del `<form>` del evento: sin el preventDefault, Enter enviaría el
      // formulario entero en vez de disparar la búsqueda.
      event.preventDefault()
      void buscar()
    }
  }

  const puedeBuscar = !buscando && busqueda.trim().length > 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            type="search"
            aria-label="Buscar lugar en Córdoba"
            placeholder="Ej.: Anfiteatro José Hernández, Jesús María"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={() => void buscar()} disabled={!puedeBuscar}>
            {buscando ? 'Buscando…' : 'Buscar'}
          </Button>
        </div>

        {error === null ? null : <p className="text-sm text-destructive">{error}</p>}

        {resultados.length === 0 ? null : (
          <ul className="flex flex-col gap-1">
            {resultados.map((lugar) => (
              <li key={`${lugar.lat}-${lugar.lng}-${lugar.direccion}`}>
                <button
                  type="button"
                  onClick={() => elegir(lugar)}
                  className="w-full rounded-lg border bg-white p-2 text-left text-sm hover:bg-muted"
                >
                  <span className="block font-medium">{lugar.nombre}</span>
                  <span className="block text-xs text-muted-foreground">{lugar.direccion}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {preview === null ? null : (
        <Suspense fallback={<div className="h-64 w-full rounded-lg border bg-muted" />}>
          <UbicacionPreviewMapa
            lat={preview.lat}
            lng={preview.lng}
            onCoordsChange={handleCoordsChange}
          />
        </Suspense>
      )}
    </div>
  )
}
