import { describe, expect, it } from 'vitest'

import { buildCircuitoMapaSvg, buildCircuitoMapaSvgMarkup } from '@/lib/circuito-svg'

describe('buildCircuitoMapaSvg', () => {
  it('proyecta las paradas y arma la polilínea', () => {
    const map = buildCircuitoMapaSvg([
      { number: 1, title: 'A', latitud: -31.4, longitud: -64.2 },
      { number: 2, title: 'B', latitud: -31.5, longitud: -64.3 },
    ])

    expect(map.sinCoordenadas).toBe(false)
    expect(map.markers).toHaveLength(2)
    expect(map.points.split(' ')).toHaveLength(2)
    expect(map.viewBox).toBe('0 0 560 220')
  })

  it('marca sin coordenadas cuando no hay datos', () => {
    const map = buildCircuitoMapaSvg([
      { number: 1, title: 'A', latitud: null, longitud: null },
    ])

    expect(map.sinCoordenadas).toBe(true)
    expect(map.points).toBe('')
    expect(map.markers).toHaveLength(0)
  })

  it('centra una única parada', () => {
    const map = buildCircuitoMapaSvg([
      { number: 1, title: 'A', latitud: -31.4, longitud: -64.2 },
    ])

    expect(map.markers[0]).toMatchObject({ x: 280, y: 110 })
  })

  it('genera el SVG string del fallback con línea y pines', () => {
    const map = buildCircuitoMapaSvg([
      { number: 1, title: 'A', latitud: -31.4, longitud: -64.2 },
      { number: 2, title: 'B', latitud: -31.5, longitud: -64.3 },
    ])
    const svg = buildCircuitoMapaSvgMarkup(map)

    expect(svg).toContain('<polyline')
    expect(svg).toContain('>1</text>')
    expect(svg).toContain('>2</text>')
    expect(svg).toContain('fill="#f7f9fb"')
  })
})
