import { describe, expect, it } from 'vitest'

import {
  addDaysLocalDate,
  eachLocalDateInclusive,
  exclusiveEndLocalDate,
  formatDateRange,
  formatLocalDate,
  formatTimeRange,
  formatTripMonth,
  formatWeekdayAndDate,
  formatWeekdayDay,
} from './dates'

describe('formatLocalDate', () => {
  it('arma la fecha por componentes y no por UTC', () => {
    // El bug que justifica todo el módulo: `new Date('2026-10-01')` se parsea como medianoche
    // UTC, y en Argentina (UTC-3) se muestra como 30 de septiembre. Con `toLocaleDateString` y
    // una `Date` creada por componentes, el día es siempre el que dice el string.
    expect(formatLocalDate('2026-10-01')).toBe('1 de octubre de 2026')
  })

  it('no corre el día hacia atrás en el primer día del mes', () => {
    expect(formatLocalDate('2026-10-01')).toContain('1 de octubre')
  })
})

describe('formatWeekdayAndDate', () => {
  it('incluye el día de la semana', () => {
    // 2026-10-01 es jueves. El separador real sale de ICU y lleva coma: se asserta lo que
    // devuelve `toLocaleDateString`, no una formato inventado.
    expect(formatWeekdayAndDate('2026-10-01')).toBe('jue, 1 oct')
  })
})

describe('formatWeekdayDay', () => {
  it('formatea como en el Paso 7 del planificador', () => {
    expect(formatWeekdayDay('2026-10-01')).toBe('Jueves 1')
  })
})

describe('formatDateRange', () => {
  it('muestra una sola fecha si el evento dura un día', () => {
    expect(formatDateRange('2026-10-05', '2026-10-05')).toBe('5 de octubre de 2026')
  })

  it('abrevia el mes cuando inicio y fin están en el mismo mes', () => {
    expect(formatDateRange('2026-10-01', '2026-10-04')).toBe('Del 1 al 4 de octubre de 2026')
  })

  it('desarrolla ambos meses cuando el rango los cruza', () => {
    // Al cruzar mes no hay un mes común del cual abreviar, así que van las dos fechas completas.
    expect(formatDateRange('2026-09-28', '2026-10-04')).toBe(
      'Del 28 de septiembre de 2026 al 4 de octubre de 2026',
    )
  })
})

describe('formatTripMonth', () => {
  it('muestra un solo mes cuando el rango cae en el mismo mes y año', () => {
    expect(formatTripMonth('2026-12-05', '2026-12-07')).toBe('Diciembre de 2026')
  })

  it('muestra los dos meses cuando el rango los cruza dentro del mismo año', () => {
    expect(formatTripMonth('2026-11-28', '2026-12-02')).toBe('Noviembre – Diciembre de 2026')
  })

  it('muestra los dos años cuando el rango cruza de año', () => {
    expect(formatTripMonth('2026-12-30', '2027-01-02')).toBe('Diciembre de 2026 – Enero de 2027')
  })
})

describe('eachLocalDateInclusive / exclusiveEndLocalDate', () => {
  it('incluye inicio y fin, y un solo día si coinciden', () => {
    expect(eachLocalDateInclusive('2026-09-23', '2026-09-23')).toEqual(['2026-09-23'])
    expect(eachLocalDateInclusive('2026-09-20', '2026-09-22')).toEqual([
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
    ])
  })

  it('suma días en calendario local sin pasar por UTC', () => {
    expect(addDaysLocalDate('2026-09-30', 1)).toBe('2026-10-01')
    expect(exclusiveEndLocalDate('2026-09-23')).toBe('2026-09-24')
  })
})

describe('formatTimeRange', () => {
  it('devuelve null cuando no hay ningún horario', () => {
    expect(formatTimeRange(null, null)).toBeNull()
  })

  it('devuelve la hora cuando hay una sola', () => {
    expect(formatTimeRange('12:30:00', null)).toBe('12:30')
  })

  it('devuelve la hora cuando inicio y fin coinciden', () => {
    expect(formatTimeRange('12:30:00', '12:30:00')).toBe('12:30')
  })

  it('arma el rango con dos horas', () => {
    expect(formatTimeRange('20:00:00', '23:30:00')).toBe('20:00 a 23:30')
  })

  it('recorta los segundos que manda la API', () => {
    // Contra la API real se verificó que Jackson 3 devuelve SIEMPRE "HH:mm:ss", aunque los
    // segundos valgan cero. Mostrar "20:00:00" es ruido.
    expect(formatTimeRange('20:00:00', '23:30:00')).not.toContain(':00:')
  })

  it('reconoce la misma hora aunque venga con y sin segundos', () => {
    // La comparación se hace sobre el valor recortado: comparar los strings crudos daría
    // "20:00" ≠ "20:00:00" para la misma hora, que es lo mismo.
    expect(formatTimeRange('20:00', '20:00:00')).toBe('20:00')
  })
})
