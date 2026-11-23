import type { ComponentProps } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CircuitoRutaMapa } from './circuito-ruta-mapa'
import type { ParadaCircuitoDetalle } from './types'
import { user } from '@/test/utils'
import { STORAGE_MODO_MAPA } from './mapa-circuito'

const leaflet = vi.hoisted(() => {
  const map = {
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    panTo: vi.fn(),
    setView: vi.fn(),
    fitBounds: vi.fn(),
    on: vi.fn(),
  }
  const marker = {
    addTo: vi.fn(),
    remove: vi.fn(),
    on: vi.fn(),
    bindPopup: vi.fn(),
    openPopup: vi.fn(),
    setLatLng: vi.fn(),
  }
  marker.addTo.mockReturnValue(marker)
  marker.bindPopup.mockReturnValue(marker)
  marker.openPopup.mockReturnValue(marker)

  const polyline = {
    addTo: vi.fn(),
    remove: vi.fn(),
    setLatLngs: vi.fn(),
    setStyle: vi.fn(),
    bringToFront: vi.fn(),
    getBounds: vi.fn(() => ({})),
  }
  polyline.addTo.mockReturnValue(polyline)

  return {
    map,
    marker,
    polyline,
    tileLayer: { addTo: vi.fn() },
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({})),
    mapCalls: [] as unknown[],
  }
})

const maplibre = vi.hoisted(() => {
  const mapInstance = {
    addControl: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getLayer: vi.fn(() => null),
    getSource: vi.fn(() => null),
    setLayoutProperty: vi.fn(),
    once: vi.fn((event: string, cb: () => void) => {
      if (event === 'load') queueMicrotask(cb)
      return mapInstance
    }),
    on: vi.fn(),
    remove: vi.fn(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    jumpTo: vi.fn(),
    getZoom: vi.fn(() => 14),
  }
  const mapCalls: unknown[] = []
  return { mapInstance, mapCalls, Map: vi.fn() }
})

vi.mock('leaflet', () => {
  const api = {
    map: vi.fn((...args: unknown[]) => {
      leaflet.mapCalls.push(args)
      return leaflet.map
    }),
    tileLayer: vi.fn(() => leaflet.tileLayer),
    marker: vi.fn(() => leaflet.marker),
    polyline: vi.fn(() => leaflet.polyline),
    divIcon: leaflet.divIcon,
    latLngBounds: leaflet.latLngBounds,
    control: { zoom: vi.fn(() => ({ addTo: vi.fn() })) },
    Browser: { mobile: false },
  }
  return { ...api, default: api }
})

vi.mock('maplibre-gl', () => {
  class Map {
    constructor(opts: unknown) {
      maplibre.mapCalls.push(opts)
      Object.assign(this, maplibre.mapInstance)
      return maplibre.mapInstance
    }
  }
  class Marker {
    setLngLat() {
      return this
    }
    setPopup() {
      return this
    }
    addTo() {
      return this
    }
    remove() {}
    togglePopup() {}
  }
  class Popup {
    setText() {
      return this
    }
  }
  class NavigationControl {}
  class LngLatBounds {
    extend() {
      return this
    }
  }
  class GeoJSONSource {}
  return {
    Map,
    Marker,
    Popup,
    NavigationControl,
    LngLatBounds,
    GeoJSONSource,
  }
})

vi.mock('@/api/rutas', () => ({
  useRutaDia: () => ({
    data: {
      geometria: [
        [-31.42, -64.18],
        [-31.413, -64.183],
      ],
    },
    isPending: false,
    isError: false,
    isFetched: true,
  }),
}))

const stops: ParadaCircuitoDetalle[] = [
  {
    id: '1',
    number: 1,
    time: '09:00',
    title: 'Primera',
    category: 'Cultura',
    badgeClass: '',
    description: '',
    detailDescription: '',
    location: 'A',
    hours: '09:00 - 10:00',
    price: 'Gratis',
    image: 'https://example.com/a.jpg',
    images: ['https://example.com/a.jpg'],
    tipo: 'EVENTO',
    fecha: '2026-12-05',
    horaInicio: '09:00',
    horaFin: '10:00',
    trasladoKm: 0,
    trasladoMinutos: 0,
    duration: '1 h',
    latitud: -31.42,
    longitud: -64.18,
    disponible: true,
  },
  {
    id: '2',
    number: 2,
    time: '11:00',
    title: 'Segunda',
    category: 'Cultura',
    badgeClass: '',
    description: '',
    detailDescription: '',
    location: 'B',
    hours: '11:00 - 12:00',
    price: 'Gratis',
    image: 'https://example.com/b.jpg',
    images: ['https://example.com/b.jpg'],
    tipo: 'ACTIVIDAD',
    fecha: '2026-12-05',
    horaInicio: '11:00',
    horaFin: '12:00',
    trasladoKm: 1,
    trasladoMinutos: 10,
    duration: '1 h',
    latitud: -31.413,
    longitud: -64.183,
    disponible: true,
  },
]

function renderMapa(props?: Partial<ComponentProps<typeof CircuitoRutaMapa>>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <div style={{ height: 280 }}>
        <CircuitoRutaMapa
          viajeId={2}
          dayLabel="Sábado 5"
          dayFecha="2026-12-05"
          stops={stops}
          activeStopIndex={0}
          onSelectStop={vi.fn()}
          cancelAnimationKey={0}
          {...props}
        />
      </div>
    </QueryClientProvider>,
  )
}

describe('CircuitoRutaMapa', () => {
  beforeEach(() => {
    localStorage.clear()
    leaflet.mapCalls.length = 0
    maplibre.mapCalls.length = 0
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
  })

  it('muestra el link del día y no el selector A pie / En auto', async () => {
    renderMapa()
    expect(
      await screen.findByRole('link', { name: /ver el día en google maps/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/distancias y tiempos en google maps/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /a pie/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /en auto/i })).not.toBeInTheDocument()
  })

  it('cambia aria-pressed del selector 2D / 3D', async () => {
    const usuario = user()
    // Sin WebGL2: elegir 3D vuelve a 2D; igual se puede leer el group.
    renderMapa()
    const group = await screen.findByRole('group', { name: /vista del mapa/i })
    expect(group).toBeInTheDocument()
    const btn2d = screen.getByRole('button', { name: '2D' })
    const btn3d = screen.getByRole('button', { name: '3D' })
    expect(btn2d).toHaveAttribute('aria-pressed', 'true')
    expect(btn3d).toHaveAttribute('aria-pressed', 'false')
    await usuario.click(btn3d)
    // Sin WebGL2 cae a 2D con mensaje.
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/vista 3d no está disponible/i)
    })
    expect(screen.getByRole('button', { name: '2D' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('con WebGL2 simulado crea MapLibre con scrollZoom false y pitch 55', async () => {
    const usuario = user()
    const canvasProto = HTMLCanvasElement.prototype as HTMLCanvasElement & {
      getContext: typeof HTMLCanvasElement.prototype.getContext
    }
    const original = canvasProto.getContext
    canvasProto.getContext = vi.fn((type: string) => {
      if (type === 'webgl2') {
        return {
          getExtension: () => ({ loseContext: vi.fn() }),
        } as unknown as WebGL2RenderingContext
      }
      return original.call(canvasProto, type as '2d')
    }) as typeof canvasProto.getContext

    try {
      renderMapa()
      await screen.findByRole('button', { name: '3D' })
      await usuario.click(screen.getByRole('button', { name: '3D' }))
      await waitFor(() => {
        expect(maplibre.mapCalls.length).toBeGreaterThan(0)
      })
      expect(maplibre.mapCalls[0]).toEqual(
        expect.objectContaining({
          scrollZoom: false,
          pitch: 55,
        }),
      )
      expect(localStorage.getItem(STORAGE_MODO_MAPA)).toBe('3d')
    } finally {
      canvasProto.getContext = original
    }
  })

  it('respeta la elección guardada en localStorage', async () => {
    localStorage.setItem(STORAGE_MODO_MAPA, '2d')
    renderMapa()
    expect(await screen.findByRole('button', { name: '2D' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('cambiar de modo detiene la animación y conserva la parada activa', async () => {
    const onSelectStop = vi.fn()
    const usuario = user()
    renderMapa({ activeStopIndex: 1, onSelectStop })
    expect(await screen.findByText(/Parada 2 de 2/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: /recorrer el día/i }))
    await usuario.click(screen.getByRole('button', { name: '3D' }))
    // Tras fallback a 2D, el overlay sigue mostrando la parada activa prop.
    expect(screen.getByText(/Parada 2 de 2/)).toBeInTheDocument()
  })
})
