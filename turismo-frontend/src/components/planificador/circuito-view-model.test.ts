import { describe, expect, it } from 'vitest'

import { CIRCUITO } from '@/test/fixtures'
import {
  buildMapStops,
  firstDayWithStops,
  toCircuitoRecomendado,
} from './circuito-view-model'

const cercania = CIRCUITO.alternativas[0]
const descubrimiento = CIRCUITO.alternativas[2]

describe('toCircuitoRecomendado', () => {
  it('agrupa las propuestas por fecha y conserva el snapshot de cada parada', () => {
    const circuito = toCircuitoRecomendado(cercania, 'Equilibrado')

    expect(circuito.days).toHaveLength(1)
    expect(circuito.daysLabel).toBe('1 Día')
    expect(circuito.days[0].summary).toBe('2 paradas · 3.2 km · ~4 h')
    expect(circuito.stopsByDay[1]).toHaveLength(2)

    const primera = circuito.stopsByDay[1][0]
    expect(primera.number).toBe(1)
    expect(primera.title).toContain('Circuito Peatonal')
    expect(primera.location).toContain('Av. Colón 100')
    expect(primera.duration).toBe('2 h')
    expect(primera.price).toBe('Entrada gratuita')
    expect(primera.image).toBe('https://example.com/circuito.jpg')
    expect(primera.walkNext).toBe('3.2 km · 18 min de traslado')
    expect(primera.latitud).toBe(-31.42)
  })

  it('marca las paradas que ya no están disponibles', () => {
    const circuito = toCircuitoRecomendado(descubrimiento, 'Tranquilo')

    expect(circuito.stopsByDay[1][0].disponible).toBe(false)
    expect(circuito.stopsByDay[1][0].motivoNoDisponible).toContain('pasó')
    expect(circuito.image).toContain('placehold')
  })
})

describe('buildMapStops', () => {
  it('adapta las paradas al formato del mapa general', () => {
    const circuito = toCircuitoRecomendado(cercania, 'Equilibrado')
    const stops = buildMapStops(circuito, firstDayWithStops(circuito))

    expect(stops).toHaveLength(2)
    expect(stops[0].time).toBe('09:00 - 11:00')
    expect(stops[1].lat).toBe(-31.42)
  })
})
