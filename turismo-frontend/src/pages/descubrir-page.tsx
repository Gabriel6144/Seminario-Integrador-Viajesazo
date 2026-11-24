import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { usePropuestasCategoria } from '@/api/propuestas'
import { DescubrirCarrusel } from '@/components/descubrir/descubrir-carrusel'
import { DescubrirTimeline } from '@/components/descubrir/descubrir-timeline'
import { CATEGORIAS_DESCUBRIR } from '@/lib/descubrir-categorias'
import { CATEGORIA_LABELS, CATEGORIAS, type Categoria } from '@/types/api'

function categoriaDesdeUrl(valor: string | null): Categoria {
  if (valor !== null && (CATEGORIAS as readonly string[]).includes(valor)) {
    return valor as Categoria
  }
  return CATEGORIAS[0]
}

export function DescubrirPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoria = categoriaDesdeUrl(searchParams.get('categoria'))
  const config = CATEGORIAS_DESCUBRIR[categoria]
  const consulta = usePropuestasCategoria(categoria)
  const propuestas = consulta.data?.content ?? []
  const indiceActual = CATEGORIAS.indexOf(categoria)
  const anterior = CATEGORIAS[(indiceActual - 1 + CATEGORIAS.length) % CATEGORIAS.length]
  const siguiente = CATEGORIAS[(indiceActual + 1) % CATEGORIAS.length]

  const cambiarCategoria = useCallback(
    (nueva: Categoria) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('categoria', nueva)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return
      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
          return
        }
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        cambiarCategoria(siguiente)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        cambiarCategoria(anterior)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [anterior, siguiente, cambiarCategoria])

  const cargando = consulta.isPending || consulta.isPlaceholderData

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col justify-center gap-6 py-8 lg:min-h-[calc(100dvh_-_8rem)] lg:gap-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)] lg:items-stretch lg:gap-10">
        <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-stretch lg:gap-8">
          <DescubrirTimeline activa={categoria} onChange={cambiarCategoria} />

          <section className="flex min-w-0 flex-col justify-center">
            <div key={categoria}>
              <div className="mb-2 flex items-center gap-2.5 sm:mb-3">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7a5900]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#70787f] sm:text-sm">
                  {config.region}
                </span>
              </div>

              <h1 className="mb-4 font-heading text-4xl font-bold uppercase leading-tight tracking-tight text-[#191c1e] sm:text-5xl">
                {CATEGORIA_LABELS[categoria]}
              </h1>

              <p className="mb-7 max-w-md text-sm leading-relaxed text-[#3f484e]">
                {config.descripcion}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Categoría anterior"
                  onClick={() => cambiarCategoria(anterior)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00658d] text-white shadow-md transition hover:bg-[#005273] active:scale-95"
                >
                  <ChevronLeftIcon className="h-6 w-6" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Categoría siguiente"
                  onClick={() => cambiarCategoria(siguiente)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00658d] text-white shadow-md transition hover:bg-[#005273] active:scale-95"
                >
                  <ChevronRightIcon className="h-6 w-6" aria-hidden />
                </button>
                <span className="ml-1 text-xs font-semibold uppercase tracking-widest text-[#70787f] tabular-nums">
                  {String(indiceActual + 1).padStart(2, '0')} / {String(CATEGORIAS.length).padStart(2, '0')}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="min-w-0">
          <DescubrirCarrusel
            key={categoria}
            categoria={categoria}
            gradiente={config.gradiente}
            propuestas={propuestas}
            cargando={cargando}
            error={consulta.isError}
            onReintentar={() => {
              void consulta.refetch()
            }}
          />
        </div>
      </div>

      <p className="text-center text-xs text-[#70787f]">
        Usá las flechas ← / → o tocá el índice para cambiar de categoría.
      </p>
    </div>
  )
}
