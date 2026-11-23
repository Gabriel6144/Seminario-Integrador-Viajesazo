import { describe, expect, it, vi } from 'vitest'

vi.mock('maplibre-gl', () => {
  class FakeMap {
    private handlers = new Map<string, (...args: unknown[]) => void>()

    constructor() {
      setTimeout(() => {
        this.handlers.get('load')?.()
        this.handlers.get('idle')?.()
      }, 0)
    }

    on(event: string, callback: (...args: unknown[]) => void) {
      this.handlers.set(event, callback)
    }

    once(event: string, callback: (...args: unknown[]) => void) {
      this.handlers.set(event, callback)
    }

    addSource() {}
    addLayer() {}
    setCenter() {}
    setZoom() {}
    fitBounds() {}
    remove() {}
    setLayoutProperty() {}

    getStyle() {
      return { layers: [{ id: 'etiquetas', type: 'symbol' }] }
    }

    project() {
      return { x: 100, y: 80 }
    }

    getCanvas() {
      return { toDataURL: () => 'data:image/png;base64,mapa-real' }
    }
  }

  class FakeBounds {
    extend() {}
  }

  return { Map: FakeMap, LngLatBounds: FakeBounds }
})

import { captureCircuitoDiaMapa } from '@/lib/circuito-mapa-captura'

describe('captureCircuitoDiaMapa', () => {
  it('captura el mapa real con MapLibre y proyecta cada parada', async () => {
    const result = await captureCircuitoDiaMapa([
      { number: 1, title: 'A', latitud: -31.4, longitud: -64.2 },
      { number: 2, title: 'B', latitud: -31.41, longitud: -64.19 },
    ])

    expect(result).toMatchObject({
      image: 'data:image/png;base64,mapa-real',
      width: 720,
      height: 300,
    })
    expect(result?.points).toEqual([
      { number: 1, x: 100, y: 80 },
      { number: 2, x: 100, y: 80 },
    ])
  })

  it('devuelve null cuando no hay coordenadas', async () => {
    const result = await captureCircuitoDiaMapa([{ number: 1, title: 'A' }])

    expect(result).toBeNull()
  })
})
