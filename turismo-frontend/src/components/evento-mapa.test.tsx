import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EventoMapa } from './evento-mapa'

/**
 * Las fábricas de Leaflet devuelven objetos encadenables (`marker.bindPopup(...).addTo(map)...`),
 * así que el mock tiene que devolver `this` en cada paso. Se arma con `vi.hoisted` porque
 * `vi.mock` se eleva por encima de las variables del módulo.
 */
const { setView, marker, tileLayer, mapRemove } = vi.hoisted(() => {
  const marker = { bindPopup: vi.fn(), addTo: vi.fn(), openPopup: vi.fn() }
  marker.bindPopup.mockReturnValue(marker)
  marker.addTo.mockReturnValue(marker)
  marker.openPopup.mockReturnValue(marker)

  const map = { setView: vi.fn(), remove: vi.fn() }
  map.setView.mockReturnValue(map)

  const tileLayer = { addTo: vi.fn() }

  return { setView: map.setView, marker, tileLayer, mapRemove: map.remove, map }
})

vi.mock('leaflet', () => {
  const map = { setView, remove: mapRemove }
  setView.mockReturnValue(map)

  return {
    default: {
      map: vi.fn(() => map),
      tileLayer: vi.fn(() => tileLayer),
      circleMarker: vi.fn(() => marker),
    },
  }
})

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

    expect(setView).toHaveBeenCalledWith([-30.9816, -64.0959], 15)
    expect(marker.addTo).toHaveBeenCalled()
    expect(marker.openPopup).toHaveBeenCalled()
  })

  it('destruye el mapa al desmontar', () => {
    const { unmount } = renderMapa()

    unmount()

    expect(mapRemove).toHaveBeenCalled()
  })
})
