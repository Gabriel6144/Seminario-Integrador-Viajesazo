import { describe, expect, it } from 'vitest'

import type { CapturaMapa } from '@/lib/circuito-mapa-captura'
import {
  buildScaleBar,
  composeDayMapDataUrl,
  haversineKm,
} from '@/lib/circuito-pdf-day-map'
import type { DayMapStopData } from '@/lib/circuito-pdf-day'

const STOPS: DayMapStopData[] = [
  { number: 1, title: 'A', hours: '09:00 - 10:00', category: 'Cultura', latitud: -31.4, longitud: -64.2 },
  { number: 2, title: 'B', hours: '11:00 - 12:00', category: 'Cultura', latitud: -31.4, longitud: -64.1 },
]

const CAPTURE: CapturaMapa = {
  image: 'data:image/png;base64,mapa',
  points: [
    { number: 1, x: 100, y: 100 },
    { number: 2, x: 400, y: 100 },
  ],
  width: 604,
  height: 800,
}

describe('composeDayMapDataUrl', () => {
  it('devuelve null si no hay captura', async () => {
    const result = await composeDayMapDataUrl({
      capture: null,
      width: 302,
      height: 400,
      stops: [],
      dayNumber: 1,
      routeTitle: 'Centro',
      totalKm: 0,
    })

    expect(result).toBeNull()
  })
})

describe('haversineKm', () => {
  it('calcula la distancia entre dos coordenadas', () => {
    const km = haversineKm(
      { latitud: -31.4, longitud: -64.2 },
      { latitud: -31.4, longitud: -64.1 },
    )
    expect(km).toBeGreaterThan(9)
    expect(km).toBeLessThan(10)
  })
})

describe('buildScaleBar', () => {
  it('usa la distancia real de dos paradas para elegir una escala honesta', () => {
    const bar = buildScaleBar(CAPTURE, STOPS, 302, 400)

    expect(bar).not.toBeNull()
    expect(bar?.label).toMatch(/km|m/)
    expect(bar?.px).toBeGreaterThanOrEqual(28)
    expect(bar?.px).toBeLessThanOrEqual(86)
  })

  it('no inventa una escala si las paradas no tienen coordenadas', () => {
    const bar = buildScaleBar(
      { ...CAPTURE, points: [{ number: 1, x: 100, y: 100 }] },
      [{ number: 1, title: 'A', hours: '', category: '' }],
      302,
      400,
    )

    expect(bar).toBeNull()
  })
})
