import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { UbicacionSelector } from './ubicacion-selector'
import { server } from '@/test/server'
import { user } from '@/test/utils'

/**
 * El mapa usa MapLibre directo (imperativo), que en jsdom no tiene WebGL. Se mockea con fábricas
 * encadenables y se guarda el callback de `dragend` para simular el arrastre del pin.
 */
const maplibre = vi.hoisted(() => {
  const handlers: Record<string, () => void> = {}
  const mapCalls: unknown[] = []

  const marker = {
    setLngLat: vi.fn(),
    addTo: vi.fn(),
    on: vi.fn(),
    getLngLat: vi.fn(() => ({ lat: -31.42, lng: -64.19 })),
    remove: vi.fn(),
  }
  marker.setLngLat.mockReturnValue(marker)
  marker.addTo.mockReturnValue(marker)
  marker.on.mockImplementation((event: string, callback: () => void) => {
    handlers[event] = callback
    return marker
  })

  const map = {
    jumpTo: vi.fn(),
    remove: vi.fn(),
    on: vi.fn((event: string, callback: () => void) => {
      handlers[event] = callback
      return map
    }),
    setStyle: vi.fn(),
    easeTo: vi.fn(),
  }

  return { handlers, marker, map, mapCalls }
})

vi.mock('maplibre-gl', () => ({
  Map: class {
    constructor(...args: unknown[]) {
      maplibre.mapCalls.push(args[0])
      return maplibre.map
    }
  },
  Marker: class {
    constructor() {
      return maplibre.marker
    }
  },
  setWorkerUrl: vi.fn(),
}))

/**
 * Arnes con estado: el selector no guarda los campos, los comunica por callbacks. El arnes
 * replica lo que hace `EventoForm` con `setValue` para poder verificar que elegir un resultado
 * completa los tres campos.
 *
 * `reverseDelayMs={0}` saca el debounce (que en producción respeta el 1 req/s de Nominatim) para
 * que el test del arrastre no espere un segundo real.
 */
function Harness({
  latitudInicial = null,
  longitudInicial = null,
}: {
  latitudInicial?: number | null
  longitudInicial?: number | null
} = {}) {
  const [lugarRecinto, setLugarRecinto] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [direccion, setDireccion] = useState('')

  return (
    <div>
      <UbicacionSelector
        onLugarRecintoChange={setLugarRecinto}
        onLocalidadChange={setLocalidad}
        onDireccionChange={setDireccion}
        latitudInicial={latitudInicial}
        longitudInicial={longitudInicial}
        reverseDelayMs={0}
      />
      <output data-testid="lugarRecinto">{lugarRecinto}</output>
      <output data-testid="localidad">{localidad}</output>
      <output data-testid="direccion">{direccion}</output>
    </div>
  )
}

async function buscar(texto: string) {
  await user().type(screen.getByLabelText('Buscar lugar en Córdoba'), texto)
  await user().click(screen.getByRole('button', { name: 'Buscar' }))
}

describe('UbicacionSelector', () => {
  it('no monta el mapa hasta que hay una ubicación elegida', () => {
    render(<Harness />)

    expect(
      screen.queryByRole('img', { name: 'Mapa de la ubicación elegida' }),
    ).not.toBeInTheDocument()
  })

  it('monta el mapa centrado cuando el evento ya trae coordenadas (edición)', async () => {
    render(<Harness latitudInicial={-30.9816} longitudInicial={-64.0959} />)

    expect(
      await screen.findByRole('img', { name: 'Mapa de la ubicación elegida' }),
    ).toBeInTheDocument()
    expect(maplibre.mapCalls[0]).toEqual(
      expect.objectContaining({ center: [-64.0959, -30.9816], zoom: 15 }),
    )
  })

  it('busca en Nominatim y lista los resultados', async () => {
    render(<Harness />)

    await buscar('anfiteatro')

    expect(await screen.findByText('Anfiteatro José Hernández')).toBeInTheDocument()
    expect(screen.getByText('Manzana Jesuítica')).toBeInTheDocument()
  })

  it('completa lugar, localidad y dirección al elegir un resultado', async () => {
    render(<Harness />)
    await buscar('anfiteatro')

    await user().click(await screen.findByText('Anfiteatro José Hernández'))

    expect(screen.getByTestId('lugarRecinto')).toHaveTextContent('Anfiteatro José Hernández')
    expect(screen.getByTestId('localidad')).toHaveTextContent('Jesús María')
    // La dirección es la calle, no el display_name completo: es lo que el backend puede geocodificar.
    expect(screen.getByTestId('direccion')).toHaveTextContent('Cleto Peña')
  })

  it('monta el mapa al elegir un resultado', async () => {
    render(<Harness />)
    await buscar('anfiteatro')
    await user().click(await screen.findByText('Anfiteatro José Hernández'))

    expect(
      await screen.findByRole('img', { name: 'Mapa de la ubicación elegida' }),
    ).toBeInTheDocument()
  })

  it('avisa cuando la búsqueda no devuelve resultados', async () => {
    server.use(http.get('/nominatim/search', () => HttpResponse.json([])))
    render(<Harness />)

    await buscar('zzzz')

    expect(
      await screen.findByText('No se encontraron resultados. Revisá el texto o probá de nuevo.'),
    ).toBeInTheDocument()
  })

  it('no rompe si Nominatim falla', async () => {
    server.use(http.get('/nominatim/search', () => HttpResponse.error()))
    render(<Harness />)

    await buscar('anfiteatro')

    expect(
      await screen.findByText('No se encontraron resultados. Revisá el texto o probá de nuevo.'),
    ).toBeInTheDocument()
  })

  it('permite cambiar el estilo y alternar entre 2D y 3D', async () => {
    render(<Harness />)
    await buscar('anfiteatro')
    await user().click(await screen.findByText('Anfiteatro José Hernández'))
    await screen.findByRole('img', { name: 'Mapa de la ubicación elegida' })

    await user().click(screen.getByRole('combobox', { name: 'Estilo del mapa' }))
    await user().click(await screen.findByRole('option', { name: 'Dark' }))
    expect(maplibre.map.setStyle).toHaveBeenCalledWith(
      'https://tiles.openfreemap.org/styles/dark',
    )

    await user().click(screen.getByRole('button', { name: /Ver en 2D/i }))
    expect(maplibre.map.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ pitch: 0, bearing: 0 }),
    )
  })

  it('al mover el pin hace geocoding inverso y actualiza la dirección', async () => {
    render(<Harness />)
    await buscar('anfiteatro')
    await user().click(await screen.findByText('Anfiteatro José Hernández'))
    await screen.findByRole('img', { name: 'Mapa de la ubicación elegida' })

    // El callback de `dragend` lo registra el componente al montar el mapa; se dispara a mano.
    maplibre.handlers.dragend()

    await waitFor(() =>
      expect(screen.getByTestId('direccion')).toHaveTextContent('Cleto Peña'),
    )
    expect(screen.getByTestId('localidad')).toHaveTextContent('Jesús María')
  })
})
