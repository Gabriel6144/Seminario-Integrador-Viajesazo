import { describe, expect, it } from 'vitest'

import { buildDayData, formatKilometers, routeTitle } from '@/lib/circuito-pdf-day'
import type {
  CircuitoRecomendado,
  ParadaCircuitoDetalle,
} from '@/components/planificador/types'
import { BORRADORES } from '@/test/fixtures'

function stop(overrides: Partial<ParadaCircuitoDetalle> = {}): ParadaCircuitoDetalle {
  return {
    id: '1',
    number: 1,
    time: '09:00',
    title: 'Museo de la Ciudad',
    category: 'Cultura',
    badgeClass: '',
    description: '',
    detailDescription: '',
    location: 'Centro, Córdoba',
    ciudad: 'Córdoba',
    localidad: 'Centro',
    hours: '09:00 - 10:00',
    price: '',
    image: '',
    images: [],
    tipo: 'EVENTO',
    fecha: '2026-10-20',
    horaInicio: '09:00',
    horaFin: '10:00',
    trasladoKm: 1.2,
    trasladoMinutos: 8,
    duration: '1 h',
    latitud: -31.4,
    longitud: -64.2,
    disponible: true,
    motivoNoDisponible: null,
    ...overrides,
  }
}

const CIRCUITO: CircuitoRecomendado = {
  id: 'INTERESES',
  estrategia: 'INTERESES',
  title: 'A tu medida',
  affinity: '',
  image: '',
  categoryTag: '',
  categoryIcon: '',
  daysLabel: '2 Días',
  paceLabel: 'Equilibrado',
  chips: [],
  ventajas: [],
  consideraciones: [],
  days: [
    { number: 1, fecha: '2026-10-20', label: 'Martes 20', summary: '2 paradas · 3 km' },
    { number: 2, fecha: '2026-10-21', label: 'Miércoles 21', summary: 'Sin paradas' },
  ],
  stopsByDay: {
    1: [
      stop({ id: '1', number: 1, detailDescription: 'Un museo imperdible en el centro.' }),
      stop({
        id: '2',
        number: 2,
        title: 'Peña del Centro',
        category: 'Gastronomía',
        hours: '20:00 - 23:00',
        horaInicio: '20:00',
        horaFin: '23:00',
        trasladoKm: 1.2,
        latitud: -31.41,
        longitud: -64.19,
      }),
    ],
    2: [],
  },
}

describe('buildDayData', () => {
  it('arma título, badge, ubicación y distancia del día', () => {
    const data = buildDayData(CIRCUITO.days[0], CIRCUITO, BORRADORES[1])

    expect(data.number).toBe(1)
    expect(data.title).toBe('Centro — Córdoba')
    expect(data.badge).toBe('DÍA 1 · CULTURA')
    expect(data.dateLabel).toBe('Martes 20')
    expect(data.location).toBe('Centro, Córdoba')
    expect(data.totalKm).toBe(2.4)
  })

  it('deja las paradas listas para la timeline y para el mapa', () => {
    const data = buildDayData(CIRCUITO.days[0], CIRCUITO, BORRADORES[1])

    expect(data.stops).toHaveLength(2)
    expect(data.stops[0]).toMatchObject({
      number: 1,
      time: '09:00',
      title: 'Museo de la Ciudad',
      category: 'Cultura',
      description: 'Un museo imperdible en el centro.',
    })
    expect(data.stops[1].time).toBe('20:00')
    expect(data.mapStops[1]).toMatchObject({
      number: 2,
      latitud: -31.41,
      longitud: -64.19,
    })
  })

  it('un día vacío no rompe: cae en la etiqueta y en la zona del viaje', () => {
    const data = buildDayData(CIRCUITO.days[1], CIRCUITO, BORRADORES[1])

    expect(data.title).toBe('Miércoles 21')
    expect(data.badge).toBe('DÍA 2')
    expect(data.location).toBe('Villa Carlos Paz')
    expect(data.stops).toEqual([])
    expect(data.mapStops).toEqual([])
  })
})

describe('helpers', () => {
  it('formatea kilómetros con coma decimal', () => {
    expect(formatKilometers(2.4)).toBe('2,4 km')
  })

  it('usa la primera y la última localidad para el título de la ruta', () => {
    expect(
      routeTitle(
        [
          stop({ ciudad: 'Córdoba', localidad: 'Centro' }),
          stop({ ciudad: 'Villa Carlos Paz', localidad: 'Centro' }),
        ],
        'Plan',
      ),
    ).toBe('Centro — Villa Carlos Paz')
    expect(routeTitle([], 'Plan')).toBe('Plan')
  })
})
