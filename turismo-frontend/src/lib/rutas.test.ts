import { describe, expect, it } from 'vitest'

import { geometriaLineaRecta } from './rutas'

describe('geometriaLineaRecta', () => {
  it('arma [lat, lng] en el mismo orden de las paradas', () => {
    expect(
      geometriaLineaRecta([
        { lat: -31.42, lng: -64.18 },
        { lat: -31.413, lng: -64.183 },
      ]),
    ).toEqual([
      [-31.42, -64.18],
      [-31.413, -64.183],
    ])
  })
})
