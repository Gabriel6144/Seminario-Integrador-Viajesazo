import { describe, expect, it } from 'vitest'

import { groupByDay } from './group-by-day'
import { EVENTOS, FOLKLORE, GASTRONOMIA_ESTANCIA } from '../test/fixtures'

describe('groupByDay', () => {
  it('agrupa por día de inicio conservando el orden de llegada', () => {
    // La consulta del backend ya viene ordenada por fecha, así que el agrupado no debe reordenar.
    const groups = groupByDay(EVENTOS)

    expect(groups.map(([date]) => date)).toEqual([
      '2026-10-01',
      '2026-10-03',
      '2026-10-05',
      '2026-10-07',
    ])
  })

  it('mete en el mismo grupo los eventos que arrancan el mismo día', () => {
    const otro = { ...FOLKLORE, id: 99, nombre: 'Segundo show' }
    const groups = groupByDay([FOLKLORE, otro])

    expect(groups).toHaveLength(1)
    expect(groups[0][1]).toHaveLength(2)
  })

  it('no muta el array original', () => {
    const copia = [...EVENTOS]
    groupByDay(EVENTOS)
    expect(EVENTOS).toEqual(copia)
  })

  it('devuelve un array vacío sin eventos', () => {
    expect(groupByDay([])).toEqual([])
  })

  it('no agrupa por el día del calendario sino por la fecha completa', () => {
    // Un evento de tres días va en el grupo de su fecha de INICIO, no se lo parte por día: la
    // agenda muestra "del 1 al 4" una sola vez.
    const [date, eventos] = groupByDay([FOLKLORE, GASTRONOMIA_ESTANCIA])[0]

    expect(date).toBe('2026-10-01')
    expect(eventos).toEqual([FOLKLORE])
  })
})
