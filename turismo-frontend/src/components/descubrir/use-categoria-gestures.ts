import { useEffect, useRef } from 'react'

import { CATEGORIAS, type Categoria } from '@/types/api'

/** Delta acumulado (px) para disparar un salto de categoría con la rueda. */
const UMBRAL_RUEDA = 45
/** Distancia mínima (px) para considerar un swipe vertical. */
const UMBRAL_SWIPE = 50
/** Si pasa este tiempo sin rueda, se descarta lo acumulado. */
const PAUSA_RUEDA_MS = 200

interface UseCategoriaGesturesOptions {
  categoriaActiva: Categoria
  irA: (categoria: Categoria) => void
  /** Timestamp (ref) hasta el cual ignoramos gestos por un scroll programático en curso. */
  lockHasta: { current: number }
}

/**
 * Convierte rueda y swipe en saltos de una categoría, reutilizando `irA` para que la transición
 * sea la misma que al tocar el rail. También habilita el teclado (flechas / PageUp / PageDown).
 *
 * Si el usuario pidió menos movimiento (`prefers-reduced-motion`), no intercepta: queda el scroll
 * normal y el rail sincronizado.
 */
export function useCategoriaGestures({
  categoriaActiva,
  irA,
  lockHasta,
}: UseCategoriaGesturesOptions) {
  const categoriaRef = useRef(categoriaActiva)

  useEffect(() => {
    categoriaRef.current = categoriaActiva
  }, [categoriaActiva])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    let acumulado = 0
    let ultimaRueda = 0

    function mover(dir: 1 | -1): boolean {
      const indice = CATEGORIAS.indexOf(categoriaRef.current)
      const objetivo = indice + dir
      if (objetivo < 0 || objetivo >= CATEGORIAS.length) return false
      irA(CATEGORIAS[objetivo])
      return true
    }

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey) return
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return

      const ahora = Date.now()
      // Scroll suave en curso: frenamos la inercia del trackpad.
      if (ahora < lockHasta.current) {
        if (event.cancelable) event.preventDefault()
        return
      }

      if (ahora - ultimaRueda > PAUSA_RUEDA_MS) acumulado = 0
      ultimaRueda = ahora

      const factor =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      acumulado += event.deltaY * factor
      if (Math.abs(acumulado) < UMBRAL_RUEDA) return

      const dir: 1 | -1 = acumulado > 0 ? 1 : -1
      acumulado = 0
      if (mover(dir) && event.cancelable) {
        event.preventDefault()
      }
    }

    let touchInicioY: number | null = null
    let touchInicioX = 0
    let swipeVertical = false

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) {
        touchInicioY = null
        return
      }
      touchInicioY = event.touches[0].clientY
      touchInicioX = event.touches[0].clientX
      swipeVertical = false
    }

    function onTouchMove(event: TouchEvent) {
      if (touchInicioY === null || event.touches.length !== 1) return
      const dy = event.touches[0].clientY - touchInicioY
      const dx = event.touches[0].clientX - touchInicioX
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        swipeVertical = true
        if (event.cancelable) event.preventDefault()
      }
    }

    function onTouchEnd(event: TouchEvent) {
      const inicio = touchInicioY
      touchInicioY = null
      if (inicio === null || !swipeVertical) return
      const fin = event.changedTouches[0]?.clientY ?? inicio
      const dy = inicio - fin
      if (Math.abs(dy) < UMBRAL_SWIPE) return
      if (Date.now() < lockHasta.current) return
      mover(dy > 0 ? 1 : -1)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return
      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
          return
        }
      }
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        if (mover(1)) event.preventDefault()
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        if (mover(-1)) event.preventDefault()
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [irA, lockHasta])
}
