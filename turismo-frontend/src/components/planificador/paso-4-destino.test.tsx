import { act, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DestinoMapa } from './destino-mapa'
import { Paso4Destino } from './paso-4-destino'
import type { DestinoSeleccionado } from './types'

/**
 * MapLibre es imperativo y en jsdom no hay WebGL, así que se mockea igual que Leaflet en
 * `ubicacion-selector.test.tsx`. Las fábricas guardan los callbacks de `load`/`click`/`dragend`
 * para poder simular las interacciones del mapa.
 */
const maplibre = vi.hoisted(() => {
  const handlers: Record<string, (event?: unknown) => void> = {}
  const markerHandlers: Record<string, () => void> = {}
  const layers = new Set<string>()
  const sources: Record<string, { setData: ReturnType<typeof vi.fn> }> = {}

  const map = {
    on: vi.fn((event: string, callback: (event?: unknown) => void) => {
      handlers[event] = callback
      return map
    }),
    getLayer: vi.fn((id: string) => (layers.has(id) ? { id } : undefined)),
    addLayer: vi.fn((layer: { id: string }) => {
      layers.add(layer.id)
      return map
    }),
    removeLayer: vi.fn((id: string) => {
      layers.delete(id)
      return map
    }),
    getSource: vi.fn((id: string) => sources[id]),
    addSource: vi.fn((id: string) => {
      sources[id] = { setData: vi.fn() }
      return map
    }),
    removeSource: vi.fn((id: string) => {
      delete sources[id]
      return map
    }),
    setLayoutProperty: vi.fn(),
    setStyle: vi.fn(() => {
      layers.clear()
      for (const key of Object.keys(sources)) delete sources[key]
      return map
    }),
    jumpTo: vi.fn(),
    flyTo: vi.fn(),
    easeTo: vi.fn(),
    fitBounds: vi.fn(),
    remove: vi.fn(),
  }

  const marker = {
    setLngLat: vi.fn(() => marker),
    addTo: vi.fn(() => marker),
    on: vi.fn((event: string, callback: () => void) => {
      markerHandlers[event] = callback
      return marker
    }),
    getLngLat: vi.fn(() => ({ lat: -31.42, lng: -64.19 })),
    remove: vi.fn(),
  }

  return { handlers, markerHandlers, layers, sources, map, marker }
})

vi.mock('maplibre-gl', () => ({
  Map: class {
    constructor() {
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

function renderPaso4(destino: DestinoSeleccionado | null = null) {
  const onSelectDestino = vi.fn()

  render(
    <Paso4Destino
      destino={destino}
      isValid={destino !== null}
      onSelectDestino={onSelectDestino}
      onNext={vi.fn()}
    />,
  )

  return { onSelectDestino }
}

describe('Paso4Destino', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    maplibre.layers.clear()
    for (const key of Object.keys(maplibre.sources)) delete maplibre.sources[key]
    for (const key of Object.keys(maplibre.handlers)) delete maplibre.handlers[key]
    for (const key of Object.keys(maplibre.markerHandlers)) delete maplibre.markerHandlers[key]
  })

  it('muestra el mapa con la vista 3D y permite alternar a 2D', async () => {
    const user = userEvent.setup()
    renderPaso4()

    const toggle = await screen.findByRole('button', { name: /ver en 2d/i })
    await user.click(toggle)

    expect(screen.getByRole('button', { name: /ver en 3d/i })).toBeInTheDocument()
    expect(maplibre.map.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ pitch: 0, bearing: 0 }),
    )
  })

  it('cambia el estilo del mapa desde el desplegable', async () => {
    const user = userEvent.setup()
    renderPaso4()

    const selector = await screen.findByRole('combobox', { name: /estilo del mapa/i })
    expect(selector).toHaveTextContent('Bright')

    await user.click(selector)
    await user.click(await screen.findByRole('option', { name: 'Dark' }))

    expect(maplibre.map.setStyle).toHaveBeenCalledWith(
      'https://tiles.openfreemap.org/styles/dark',
    )
    expect(selector).toHaveTextContent('Dark')
  })

  it('vuelve a agregar la capa 3D al cambiar de estilo y respeta el 2D', async () => {
    const user = userEvent.setup()
    renderPaso4()

    await waitFor(() => expect(maplibre.handlers['style.load']).toBeTypeOf('function'))
    act(() => maplibre.handlers['style.load']?.())
    expect(maplibre.map.addLayer).toHaveBeenCalledTimes(1)

    await user.click(await screen.findByRole('button', { name: /ver en 2d/i }))

    const selector = screen.getByRole('combobox', { name: /estilo del mapa/i })
    await user.click(selector)
    await user.click(await screen.findByRole('option', { name: 'Fiord' }))
    act(() => maplibre.handlers['style.load']?.())

    expect(maplibre.map.addLayer).toHaveBeenCalledTimes(2)
    expect(maplibre.map.setLayoutProperty).toHaveBeenLastCalledWith(
      '3d-buildings',
      'visibility',
      'none',
    )
  })

  it('elige una zona sugerida y envía sus coordenadas', async () => {
    const user = userEvent.setup()
    const { onSelectDestino } = renderPaso4()

    await user.click(
      screen.getByRole('button', { name: /Villa Carlos Paz \(Valle de Punilla\)/i }),
    )

    expect(onSelectDestino).toHaveBeenCalledWith({
      nombre: 'Villa Carlos Paz (Valle de Punilla)',
      ciudad: 'Villa Carlos Paz',
      localidad: 'Valle de Punilla',
      latitud: -31.4241,
      longitud: -64.4978,
    })
  })

  it('busca un destino con Nominatim y permite elegir un resultado', async () => {
    const user = userEvent.setup()
    const { onSelectDestino } = renderPaso4()

    await user.type(screen.getByLabelText(/buscar destino/i), 'Anfiteatro')
    await user.click(screen.getByRole('button', { name: /^buscar$/i }))

    const resultado = await screen.findByRole('button', {
      name: /Anfiteatro José Hernández/i,
    })
    await user.click(resultado)

    expect(onSelectDestino).toHaveBeenCalledWith({
      nombre: 'Anfiteatro José Hernández',
      ciudad: 'Jesús María',
      localidad: null,
      latitud: -30.9816,
      longitud: -64.0959,
    })
  })

  it('hace geocoding inverso al tocar el mapa', async () => {
    const { onSelectDestino } = renderPaso4()

    await waitFor(() => expect(maplibre.handlers.click).toBeTypeOf('function'))

    act(() => {
      maplibre.handlers.click?.({ lngLat: { lat: -31.42, lng: -64.19 } })
    })

    await waitFor(() => {
      expect(onSelectDestino).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Anfiteatro José Hernández',
          ciudad: 'Jesús María',
          latitud: -31.42,
          longitud: -64.19,
        }),
      )
    })
  })

  it('hace geocoding inverso al arrastrar el marcador', async () => {
    const { onSelectDestino } = renderPaso4({
      nombre: 'Córdoba',
      ciudad: 'Córdoba',
      localidad: 'Centro',
      latitud: -31.42,
      longitud: -64.19,
    })

    await waitFor(() => expect(maplibre.markerHandlers.dragend).toBeTypeOf('function'))

    act(() => {
      maplibre.markerHandlers.dragend?.()
    })

    await waitFor(() => {
      expect(onSelectDestino).toHaveBeenCalledWith(
        expect.objectContaining({ ciudad: 'Jesús María' }),
      )
    })
  })
})

const CORDOBA: DestinoSeleccionado = {
  nombre: 'Córdoba',
  ciudad: 'Córdoba',
  localidad: 'Centro',
  latitud: -31.42,
  longitud: -64.19,
}

const VILLA_CARLOS_PAZ: DestinoSeleccionado = {
  nombre: 'Villa Carlos Paz (Valle de Punilla)',
  ciudad: 'Villa Carlos Paz',
  localidad: 'Valle de Punilla',
  latitud: -31.4241,
  longitud: -64.4978,
}

describe('DestinoMapa con radio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    maplibre.layers.clear()
    for (const key of Object.keys(maplibre.sources)) delete maplibre.sources[key]
    for (const key of Object.keys(maplibre.handlers)) delete maplibre.handlers[key]
  })

  it('vuela animado al cambiar de destino y deja que MapLibre calcule la duración', async () => {
    const { rerender } = render(<DestinoMapa destino={CORDOBA} onSelectDestino={vi.fn()} />)

    await waitFor(() => expect(maplibre.handlers['style.load']).toBeTypeOf('function'))
    act(() => maplibre.handlers['style.load']?.())

    rerender(<DestinoMapa destino={VILLA_CARLOS_PAZ} onSelectDestino={vi.fn()} />)

    await waitFor(() => expect(maplibre.map.flyTo).toHaveBeenCalled())
    expect(maplibre.map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-64.4978, -31.4241], zoom: 15 }),
    )
    expect(maplibre.map.flyTo.mock.calls.at(-1)?.[0].duration).toBeUndefined()
  })

  it('dibuja el círculo del radio y reencuadra el mapa en vez de saltar al zoom 15', async () => {
    render(<DestinoMapa destino={CORDOBA} radiusKm={50} />)

    await waitFor(() => expect(maplibre.handlers['style.load']).toBeTypeOf('function'))
    act(() => maplibre.handlers['style.load']?.())

    expect(maplibre.map.addSource).toHaveBeenCalledWith(
      'radio-source',
      expect.objectContaining({ type: 'geojson' }),
    )
    expect(maplibre.map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'radio-fill', type: 'fill' }),
      undefined,
    )
    expect(maplibre.map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'radio-outline', type: 'line' }),
      undefined,
    )
    expect(maplibre.map.fitBounds).toHaveBeenCalled()
    expect(maplibre.map.jumpTo).not.toHaveBeenCalled()
  })

  it('actualiza el círculo al mover el radio', async () => {
    const { rerender } = render(<DestinoMapa destino={CORDOBA} radiusKm={50} />)

    await waitFor(() => expect(maplibre.handlers['style.load']).toBeTypeOf('function'))
    act(() => maplibre.handlers['style.load']?.())

    const source = maplibre.sources['radio-source']
    rerender(<DestinoMapa destino={CORDOBA} radiusKm={120} />)

    await waitFor(() => expect(source?.setData).toHaveBeenCalled())
  })

  it('elimina el círculo cuando el radio vuelve a cero', async () => {
    const { rerender } = render(<DestinoMapa destino={CORDOBA} radiusKm={50} />)

    await waitFor(() => expect(maplibre.handlers['style.load']).toBeTypeOf('function'))
    act(() => maplibre.handlers['style.load']?.())

    rerender(<DestinoMapa destino={CORDOBA} radiusKm={0} />)

    await waitFor(() =>
      expect(maplibre.map.removeSource).toHaveBeenCalledWith('radio-source'),
    )
    expect(maplibre.map.removeLayer).toHaveBeenCalledWith('radio-fill')
    expect(maplibre.map.removeLayer).toHaveBeenCalledWith('radio-outline')
  })
})
