import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { CategoriaSeccion } from '@/components/descubrir/categoria-seccion'
import { DescubrirTimeline } from '@/components/descubrir/descubrir-timeline'
import { useCategoriaGestures } from '@/components/descubrir/use-categoria-gestures'
import { CATEGORIAS, type Categoria } from '@/types/api'

function categoriaDesdeUrl(valor: string | null): Categoria {
  if (valor !== null && (CATEGORIAS as readonly string[]).includes(valor)) {
    return valor as Categoria
  }
  return CATEGORIAS[0]
}

/** Margen (px) alrededor del viewport dentro del cual se precarga una categoría. */
const PREFETCH_MARGEN = 800
/** Tiempo que ignoramos el scroll mientras corre un desplazamiento pedido por el rail. */
const LOCK_SCROLL_MS = 900

/**
 * Catálogo del turista/invitado: nueve secciones apiladas, una por categoría.
 *
 * El rail (fijo en escritorio, sticky horizontal en mobile) sigue la sección visible y la URL
 * guarda `?categoria=` para que F5 vuelva a la misma. Cada sección pide sus propuestas recién
 * cuando entra en el viewport, así no se disparan nueve listados al cargar.
 */
export function DescubrirPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const inicial = categoriaDesdeUrl(searchParams.get('categoria'))

  const [categoriaActiva, setCategoriaActiva] = useState<Categoria>(inicial)
  const [activadas, setActivadas] = useState<Set<Categoria>>(() => new Set([inicial]))

  const ultimaUrl = useRef<Categoria>(inicial)
  const scrollInicialHecho = useRef(false)
  const frameRef = useRef<number | null>(null)
  const lockHasta = useRef(0)

  // La URL acompaña al scroll, sin llenar el historial.
  useEffect(() => {
    if (ultimaUrl.current === categoriaActiva) return
    ultimaUrl.current = categoriaActiva
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('categoria', categoriaActiva)
        return next
      },
      { replace: true },
    )
  }, [categoriaActiva, setSearchParams])

  // Si se entra con `?categoria=`, arrancamos en esa sección.
  useEffect(() => {
    if (scrollInicialHecho.current) return
    scrollInicialHecho.current = true
    if (!searchParams.has('categoria')) return
    requestAnimationFrame(() => {
      document.getElementById(`descubrir-${inicial}`)?.scrollIntoView({ block: 'start' })
    })
  }, [inicial, searchParams])

  // Detecta la sección visible y precarga las cercanas.
  useEffect(() => {
    function medir() {
      frameRef.current = null
      const linea = window.innerHeight * 0.45
      let mejorCat: Categoria | null = null
      let mejorDistancia = Number.POSITIVE_INFINITY
      const cercanas: Categoria[] = []

      for (const categoria of CATEGORIAS) {
        const nodo = document.getElementById(`descubrir-${categoria}`)
        if (nodo === null) continue
        const rect = nodo.getBoundingClientRect()
        // En jsdom no hay layout (todo mide 0): no precargamos ni cambiamos de sección.
        if (rect.height === 0) continue

        if (rect.top < window.innerHeight + PREFETCH_MARGEN && rect.bottom > -PREFETCH_MARGEN) {
          cercanas.push(categoria)
        }

        const distancia =
          rect.top > linea ? rect.top - linea : rect.bottom < linea ? linea - rect.bottom : 0
        if (distancia < mejorDistancia) {
          mejorDistancia = distancia
          mejorCat = categoria
        }
      }

      if (cercanas.length > 0) {
        setActivadas((prev) => {
          if (cercanas.every((categoria) => prev.has(categoria))) return prev
          const next = new Set(prev)
          for (const categoria of cercanas) next.add(categoria)
          return next
        })
      }

      const activa = mejorCat
      if (activa !== null && Date.now() >= lockHasta.current) {
        setCategoriaActiva((prev) => (prev === activa ? prev : activa))
      }
    }

    function onScroll() {
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(medir)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const irA = useCallback((categoria: Categoria) => {
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    lockHasta.current = Date.now() + LOCK_SCROLL_MS
    setActivadas((prev) => (prev.has(categoria) ? prev : new Set(prev).add(categoria)))
    setCategoriaActiva(categoria)
    document.getElementById(`descubrir-${categoria}`)?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  useCategoriaGestures({ categoriaActiva, irA, lockHasta })

  return (
    <div className="relative w-full bg-[#F7F6F2] font-jakarta text-[#111215]">
      {/* Rail fijo de escritorio */}
      <div className="pointer-events-none fixed inset-y-0 left-0 z-30 hidden items-center lg:flex">
        <div className="pointer-events-auto ml-5 xl:ml-8" data-testid="rail-desktop">
          <DescubrirTimeline activa={categoriaActiva} onChange={irA} orientacion="vertical" />
        </div>
      </div>

      {/* Rail sticky de mobile */}
      <div className="sticky top-[53px] z-30 border-b border-black/5 bg-[#F7F6F2]/95 backdrop-blur lg:hidden">
        <div className="px-5 md:px-10" data-testid="rail-mobile">
          <DescubrirTimeline activa={categoriaActiva} onChange={irA} orientacion="horizontal" />
        </div>
      </div>

      <h1 className="sr-only">Descubrir Córdoba</h1>

      <div className="mx-auto w-full px-5 md:px-10 lg:pl-24 lg:pr-10 xl:pl-32 xl:pr-16">
        {CATEGORIAS.map((categoria, indice) => (
          <CategoriaSeccion
            key={categoria}
            categoria={categoria}
            numero={indice + 1}
            enabled={activadas.has(categoria)}
          />
        ))}
      </div>
    </div>
  )
}
