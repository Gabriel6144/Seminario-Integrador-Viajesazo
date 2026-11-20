import { afterEach, describe, expect, it, vi } from 'vitest'

import { crearMapaLeaflet } from './mapa-circuito-leaflet'
import type { ParadaMapa } from './mapa-circuito'

// Este test usa Leaflet real (no el mock) para cubrir el orden en que la vista llama
// al adaptador: setParadas → setActiva antes de encuadrar la ruta. Sin vista inicial,
// el panTo dejaba el zoom indefinido y al destruir el mapa saltaba
// "Cannot read properties of undefined (reading '_leaflet_events')".
vi.unmock('leaflet')

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const PARADAS: ParadaMapa[] = [
  { index: 0, number: 1, title: 'Cabildo', hours: '09:00 – 10:30', latitud: -31.4168, longitud: -64.1846 },
  { index: 1, number: 2, title: 'Museo Evita', hours: '11:00 – 12:30', latitud: -31.4277, longitud: -64.1856 },
]

function contenedor(): HTMLDivElement {
  const div = document.createElement('div')
  // jsdom no calcula layout: sin tamaño, Leaflet no puede armar la grilla de tiles.
  Object.defineProperty(div, 'clientWidth', { value: 600, configurable: true })
  Object.defineProperty(div, 'clientHeight', { value: 400, configurable: true })
  document.body.appendChild(div)
  return div
}

describe('crearMapaLeaflet', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('setActiva antes de encuadrar no rompe y el mapa se destruye sin errores', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    const mapa = await crearMapaLeaflet(contenedor(), () => {})

    expect(() => {
      mapa.setParadas(PARADAS, 0)
      mapa.setActiva(0)
      mapa.setActiva(1)
    }).not.toThrow()
    expect(() => mapa.destruir()).not.toThrow()
  })

  it('se puede destruir sin haber cargado paradas', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    const mapa = await crearMapaLeaflet(contenedor(), () => {})

    expect(() => mapa.destruir()).not.toThrow()
  })

  it('recorrido con muñequito y destrucción', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    const mapa = await crearMapaLeaflet(contenedor(), () => {})

    mapa.setParadas(PARADAS, 0)
    mapa.setActiva(0)
    mapa.setRuta(PARADAS.map((p) => [p.latitud, p.longitud]))
    mapa.encuadrarRuta()
    mapa.setProgreso([[PARADAS[0].latitud, PARADAS[0].longitud]], [PARADAS[0].latitud, PARADAS[0].longitud])

    expect(() => mapa.destruir()).not.toThrow()
  })
})
