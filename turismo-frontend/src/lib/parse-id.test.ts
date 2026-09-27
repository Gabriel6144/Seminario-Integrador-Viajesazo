import { describe, expect, it } from 'vitest'

import { parseId } from './parse-id'

describe('parseId', () => {
  it('convierte un id numérico válido', () => {
    expect(parseId('7')).toBe(7)
  })

  it('rechaza un id no numérico', () => {
    // El backend no tiene @Validated en los controllers: pedir `/api/eventos/abc` cae en el
    // catch-all y devuelve 500 en lugar de 400. Por eso el filtro tiene que estar acá.
    expect(parseId('abc')).toBeNull()
  })

  it('rechaza un id con caracteres inyectados', () => {
    expect(parseId('1 OR 1=1')).toBeNull()
    expect(parseId('1;drop')).toBeNull()
  })

  it('rechaza un id undefined', () => {
    expect(parseId(undefined)).toBeNull()
  })

  it('rechaza cero y negativos', () => {
    // H2 genera ids desde 1, así que 0 y negativos nunca existen.
    expect(parseId('0')).toBeNull()
    expect(parseId('-1')).toBeNull()
  })

  it('rechaza un id decimal', () => {
    expect(parseId('1.5')).toBeNull()
  })
})
