import type { Content, ContentSection, ContentStack } from 'pdfmake/interfaces'
import { describe, expect, it } from 'vitest'

import {
  buildCircuitoPdfDefinition,
  buildSummaryData,
  type CircuitoPdfAssets,
} from '@/lib/circuito-pdf'
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
    price: 'Entrada gratuita',
    image: '',
    images: [],
    tipo: 'EVENTO',
    fecha: '2026-10-20',
    horaInicio: '09:00',
    horaFin: '10:00',
    trasladoKm: 1.2,
    trasladoMinutos: 8,
    duration: '1 h',
    walkNext: '1,2 km · 8 min de traslado',
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
  affinity: '87% Afinidad',
  image: '',
  categoryTag: '',
  categoryIcon: '',
  daysLabel: '2 Días',
  paceLabel: 'Equilibrado',
  chips: [],
  ventajas: [],
  consideraciones: [],
  days: [
    {
      number: 1,
      fecha: '2026-10-20',
      label: 'Martes 20',
      summary: '2 paradas · 3 km · ~2 h',
    },
    {
      number: 2,
      fecha: '2026-10-21',
      label: 'Miércoles 21',
      summary: 'Sin paradas',
    },
  ],
  stopsByDay: {
    1: [
      stop({ id: '1', number: 1 }),
      stop({
        id: '2',
        number: 2,
        title: 'Peña del Centro',
        latitud: -31.41,
        longitud: -64.19,
      }),
    ],
    2: [],
  },
}

const ASSETS: CircuitoPdfAssets = {
  logoDataUrl: 'data:image/png;base64,logo',
  heroDataUrl: 'data:image/png;base64,hero',
  dayMaps: { 1: 'data:image/png;base64,mapa1', 2: null },
  dayBadges: {
    1: 'data:image/png;base64,badge1',
    2: 'data:image/png;base64,badge2',
  },
  stopBadges: {
    '1': 'data:image/png;base64,stop1',
    '2': 'data:image/png;base64,stop2',
  },
  dayStopBadges: {
    '1:1': 'data:image/png;base64,daystop1',
    '1:2': 'data:image/png;base64,daystop2',
  },
}

describe('buildSummaryData', () => {
  const summary = buildSummaryData(CIRCUITO, BORRADORES[1])

  it('arma la portada con zona, ribbon y métricas reales', () => {
    expect(summary.title).toBe('Córdoba')
    expect(summary.ribbon).toBe('2 DÍAS DE CULTURA & GASTRONOMÍA')
    expect(summary.heroBadge).toContain('VILLA CARLOS PAZ')
    expect(summary.heroMeta).toContain('2 días · 2 paradas')
  })

  it('incluye todas las paradas de cada día con numeración global', () => {
    expect(summary.days).toHaveLength(2)
    expect(summary.days[0].title).toBe('CENTRO — CÓRDOBA')
    expect(summary.days[0].stops.map((item) => item.title)).toEqual([
      'Museo de la Ciudad',
      'Peña del Centro',
    ])
    expect(summary.days[0].stops.map((item) => item.globalNumber)).toEqual([1, 2])
    expect(summary.days[1].stops).toHaveLength(0)
  })
})

describe('buildCircuitoPdfDefinition', () => {
  const definition = buildCircuitoPdfDefinition(CIRCUITO, BORRADORES[1], ASSETS)
  const [summarySection, daysSection] = definition.content as ContentSection[]

  it('mezcla una sección horizontal para el resumen con una vertical para los días', () => {
    expect(definition.pageSize).toBe('A4')
    expect(definition.pageOrientation).toBe('portrait')
    expect(definition.defaultStyle?.font).toBe('Inter')

    expect(summarySection.pageOrientation).toBe('landscape')
    expect(summarySection.pageMargins).toEqual([12, 12, 12, 12])
    expect(summarySection.footer).toBeNull()
    expect(daysSection.pageOrientation).toBe('portrait')
    expect(daysSection.pageMargins).toEqual([32, 32, 32, 40])
  })

  it('usa la paleta del Stitch y pinta el resumen oscuro y los días en papel', () => {
    const serialized = JSON.stringify(summarySection)
    expect(serialized).toContain('#e05d52')
    expect(serialized).toContain('#007bb8')
    expect(serialized).toContain('Caveat')
    expect(serialized).toContain('MontserratBlack')

    const background = definition.background
    expect(typeof background).toBe('function')
    const dark = (background as (page: number, size: { width: number; height: number }) => Content)(
      1,
      { width: 842, height: 595 },
    )
    const paper = (background as (page: number, size: { width: number; height: number }) => Content)(
      2,
      { width: 595, height: 842 },
    )
    expect(JSON.stringify(dark)).toContain('#0E1612')
    expect(JSON.stringify(paper)).toContain('#FCFAF6')
  })

  it('incluye la portada, el ribbon y todas las paradas del resumen', () => {
    const serialized = JSON.stringify(summarySection)
    expect(serialized).toContain('Córdoba')
    expect(serialized).toContain('ITINERARIO')
    expect(serialized).toContain('2 DÍAS DE CULTURA & GASTRONOMÍA')
    expect(serialized).toContain('DÍA 1')
    expect(serialized).toContain('CENTRO — CÓRDOBA')
    expect(serialized).toContain('Museo de la Ciudad')
    expect(serialized).toContain('Peña del Centro')
    expect(serialized).toContain('Desconectar. Explorar. Reconectar.')
  })

  it('embebe el hero, los badges y los mapas', () => {
    const serialized = JSON.stringify(summarySection)
    expect(serialized).toContain('data:image/png;base64,hero')
    expect(serialized).toContain('data:image/png;base64,badge1')
    expect(serialized).toContain('data:image/png;base64,stop1')
  })

  it('arranca el primer día en la página nueva y no parte las filas de la timeline', () => {
    const daysStack = daysSection.section as ContentStack
    const dayStacks = daysStack.stack as ContentStack[]

    expect(dayStacks).toHaveLength(2)
    expect(dayStacks[0].pageBreak).toBeUndefined()
    expect(dayStacks[1].pageBreak).toBe('before')
    expect(JSON.stringify(dayStacks[0])).toContain('"unbreakable":true')
  })

  it('arma la página del día con título, badge, atributos y timeline', () => {
    const serialized = JSON.stringify(daysSection)
    expect(serialized).toContain('CENTRO — CÓRDOBA')
    expect(serialized).toContain('DÍA 1 · CULTURA')
    expect(serialized).toContain('MARTES 20')
    expect(serialized).toContain('HORARIO')
    expect(serialized).toContain('DISTANCIA')
    expect(serialized).toContain('2 paradas')
    expect(serialized).toContain('Museo de la Ciudad')
    expect(serialized).toContain('Peña del Centro')
    expect(serialized).toContain('data:image/png;base64,mapa1')
    expect(serialized).toContain('data:image/png;base64,daystop1')
    expect(serialized).toContain('data:image/png;base64,daystop2')
  })

  it('muestra un día libre cuando no hay paradas', () => {
    const serialized = JSON.stringify(daysSection)
    expect(serialized).toContain('DÍA LIBRE')
    expect(serialized).toContain('No hay paradas programadas')
  })

  it('muestra el bloque sin ubicación si el día tiene paradas pero no mapa', () => {
    const sinMapa = buildCircuitoPdfDefinition(CIRCUITO, BORRADORES[1], {
      ...ASSETS,
      dayMaps: { 1: null, 2: null },
    })
    const [, dias] = sinMapa.content as ContentSection[]
    expect(JSON.stringify(dias)).toContain('SIN UBICACIÓN')
  })

  it('agrega el pie con la página actual en las páginas por día', () => {
    const footer =
      typeof definition.footer === 'function'
        ? (definition.footer as (currentPage: number, pageCount: number) => Content)(2, 5)
        : definition.footer
    expect(JSON.stringify(footer)).toContain('Página 2 de 5')
    expect(JSON.stringify(footer)).toContain('Viajesazo')
  })
})
