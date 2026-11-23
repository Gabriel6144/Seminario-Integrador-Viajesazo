import { describe, expect, it } from 'vitest'

import { esMalClima, resolverIconoClima, wwoToWmoCode } from '@/lib/clima'

describe('clima helpers', () => {
  it('marca lluvia, nieve y tormenta como mal clima', () => {
    expect(esMalClima(61)).toBe(true)
    expect(esMalClima(71)).toBe(true)
    expect(esMalClima(95)).toBe(true)
    expect(esMalClima(0)).toBe(false)
    expect(esMalClima(3)).toBe(false)
  })

  it('resuelve íconos WMO básicos', () => {
    expect(resolverIconoClima(0, 1).icono).toBe('sunny')
    expect(resolverIconoClima(0, 0).icono).toBe('clear_night')
    expect(resolverIconoClima(61, 1).icono).toBe('rainy')
    expect(resolverIconoClima(95, 1).icono).toBe('thunderstorm')
  })

  it('traduce códigos WWO de estación a códigos WMO', () => {
    expect(wwoToWmoCode(113)).toBe(0)
    expect(wwoToWmoCode(296)).toBe(61)
    expect(wwoToWmoCode(200)).toBe(95)
  })
})
