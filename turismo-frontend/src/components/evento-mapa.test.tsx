import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EventoMapa } from './evento-mapa'

/**
 * MapLibre es imperativo y en jsdom no hay WebGL, así que se mockea con fábricas
 * encadenables. El mock guarda el contenido del popup y las coordenadas del marcador.
 */
const maplibre = vi.hoisted(() => {
  const map = { remove: vi.fn(), jumpTo: vi.fn() }
  const marker = {
    setLngLat: vi.fn(),
    setPopup: vi.fn(),
    addTo: vi.fn(),
    remove: vi.fn(),
  }
  marker.setLngLat.mockReturnValue(marker)
  marker.setPopup.mockReturnValue(marker)
  marker.addTo.mockReturnValue(marker)

  const popup = { setDOMContent: vi.fn() }
  popup.setDOMContent.mockReturnValue(popup)

  const mapCalls: unknown[] = []
  return { map, marker, popup, mapCalls }
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
  Popup: class {
    constructor() {
      return maplibre.popup
    }
  },
  setWorkerUrl: vi.fn(),
}))

function renderMapa() {
  return render(
    <EventoMapa
      nombre="Festival de Doma y Folklore"
      lugar="Anfiteatro José Hernández"
      localidad="Jesús María"
      latitud={-30.9816}
      longitud={-64.0959}
    />,
  )
}

describe('EventoMapa', () => {
  it('expone la referencia con el lugar y la localidad', () => {
    renderMapa()

    expect(screen.getByText('Anfiteatro José Hernández · Jesús María')).toBeInTheDocument()
  })

  it('tiene una etiqueta accesible que describe el mapa', () => {
    renderMapa()

    expect(
      screen.getByRole('img', { name: 'Mapa de la ubicación de Festival de Doma y Folklore' }),
    ).toBeInTheDocument()
  })

  it('centra el mapa en las coordenadas que devolvió el backend', () => {
    renderMapa()

    expect(maplibre.mapCalls[0]).toEqual(
      expect.objectContaining({ center: [-64.0959, -30.9816], zoom: 15 }),
    )
    expect(maplibre.marker.setLngLat).toHaveBeenCalledWith([-64.0959, -30.9816])
    expect(maplibre.marker.addTo).toHaveBeenCalled()
    expect(maplibre.popup.setDOMContent).toHaveBeenCalled()
  })

  it('destruye el mapa al desmontar', () => {
    const { unmount } = renderMapa()

    unmount()

    expect(maplibre.map.remove).toHaveBeenCalled()
    expect(maplibre.marker.remove).toHaveBeenCalled()
  })
})
