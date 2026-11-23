import { describe, expect, it } from 'vitest'

import {
  linkComoLlegar,
  linksDiaCompleto,
  puntoAParam,
  type PuntoGoogleMaps,
} from './google-maps'

const museo: PuntoGoogleMaps = {
  latitud: -31.4201,
  longitud: -64.1888,
  direccionTexto: 'Museo Evita',
}

const plaza: PuntoGoogleMaps = {
  latitud: -31.4167,
  longitud: -64.1833,
}

describe('puntoAParam', () => {
  it('formatea coordenadas negativas de Córdoba', () => {
    expect(puntoAParam(museo)).toBe('-31.4201,-64.1888')
  })

  it('usa dirección cuando faltan coordenadas', () => {
    expect(
      puntoAParam({ direccionTexto: 'Av. Colón 100, Centro, Córdoba' }),
    ).toBe('Av. Colón 100, Centro, Córdoba')
  })

  it('no produce valor sin coordenadas ni dirección usable', () => {
    expect(puntoAParam({})).toBeNull()
    expect(puntoAParam({ direccionTexto: 'Ubicación a confirmar' })).toBeNull()
    expect(puntoAParam({ direccionTexto: '   ' })).toBeNull()
  })
})

describe('linkComoLlegar', () => {
  it('arma URL con origen y destino', () => {
    const url = linkComoLlegar(plaza, museo)
    expect(url).toContain('https://www.google.com/maps/dir/?')
    expect(url).toContain('api=1')
    expect(url).toContain('origin=-31.4201%2C-64.1888')
    expect(url).toContain('destination=-31.4167%2C-64.1833')
    expect(url).not.toContain('travelmode')
    expect(url!.length).toBeLessThan(2048)
  })

  it('omite origin cuando no hay origen', () => {
    const url = linkComoLlegar(plaza)
    expect(url).toContain('destination=-31.4167%2C-64.1833')
    expect(url).not.toContain('origin=')
  })

  it('codifica coma como %2C', () => {
    const url = linkComoLlegar(plaza, museo)!
    expect(url).toMatch(/%2C/)
    expect(url).not.toMatch(/origin=-31\.4201,-64/)
  })

  it('usa respaldo de dirección', () => {
    const url = linkComoLlegar(
      { direccionTexto: 'Calle Falsa 123, Córdoba' },
      { direccionTexto: 'Plaza San Martín' },
    )
    expect(url).toContain('origin=Plaza+San+Mart%C3%ADn')
    expect(url).toContain('destination=Calle+Falsa+123%2C+C%C3%B3rdoba')
  })

  it('sin destino usable no hay link', () => {
    expect(linkComoLlegar({ direccionTexto: 'Ubicación a confirmar' })).toBeNull()
  })
})

describe('linksDiaCompleto', () => {
  function punto(i: number): PuntoGoogleMaps {
    return { latitud: -31.42 - i * 0.01, longitud: -64.18 - i * 0.01 }
  }

  it('1 parada: solo destination', () => {
    const urls = linksDiaCompleto([museo])
    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain('destination=-31.4201%2C-64.1888')
    expect(urls[0]).not.toContain('origin=')
    expect(urls[0]).not.toContain('waypoints=')
  })

  it('2 paradas: origin + destination sin waypoints', () => {
    const urls = linksDiaCompleto([museo, plaza])
    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain('origin=')
    expect(urls[0]).toContain('destination=')
    expect(urls[0]).not.toContain('waypoints=')
  })

  it('5 paradas: un solo tramo con 3 waypoints', () => {
    const urls = linksDiaCompleto([0, 1, 2, 3, 4].map(punto))
    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain('waypoints=')
    expect(urls[0]).toMatch(/%7C/)
    expect(urls[0].length).toBeLessThan(2048)
  })

  it('6 paradas: dos tramos encadenados', () => {
    const pts = [0, 1, 2, 3, 4, 5].map(punto)
    const urls = linksDiaCompleto(pts)
    expect(urls).toHaveLength(2)
    // Tramo 1: 0→4; tramo 2: 4→5
    expect(urls[0]).toContain(encodeURIComponent(puntoAParam(pts[0])!))
    expect(urls[0]).toContain(encodeURIComponent(puntoAParam(pts[4])!))
    expect(urls[1]).toContain(encodeURIComponent(puntoAParam(pts[4])!))
    expect(urls[1]).toContain(encodeURIComponent(puntoAParam(pts[5])!))
  })

  it('9 paradas: dos tramos encadenados de hasta 5', () => {
    // 0–4 y 4–8 (la última del tramo 1 es la primera del 2).
    const pts = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(punto)
    const urls = linksDiaCompleto(pts)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain(encodeURIComponent(puntoAParam(pts[0])!))
    expect(urls[0]).toContain(encodeURIComponent(puntoAParam(pts[4])!))
    expect(urls[1]).toContain(encodeURIComponent(puntoAParam(pts[4])!))
    expect(urls[1]).toContain(encodeURIComponent(puntoAParam(pts[8])!))
    for (const url of urls) {
      expect(url.length).toBeLessThan(2048)
      expect(url).not.toContain('travelmode')
    }
  })

  it('ignora paradas sin datos y no inventa links vacíos', () => {
    expect(linksDiaCompleto([{ direccionTexto: 'Ubicación a confirmar' }])).toEqual(
      [],
    )
  })
})
