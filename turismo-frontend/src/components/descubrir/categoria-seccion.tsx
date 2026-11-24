import { memo } from 'react'

import { usePropuestasCategoria } from '@/api/propuestas'
import { CATEGORIAS_DESCUBRIR } from '@/lib/descubrir-categorias'
import { CATEGORIA_LABELS, type Categoria } from '@/types/api'

import { DescubrirCarrusel } from './descubrir-carrusel'

interface CategoriaSeccionProps {
  categoria: Categoria
  numero: number
  /** Se activa cuando la sección entra en el viewport (o la pide el rail). */
  enabled: boolean
}

/**
 * Bloque editorial de una categoría dentro de `/descubrir`.
 *
 * La página apila las nueve; cada una pide sus propuestas recién cuando `enabled` se prende, así
 * no se disparan nueve listados al cargar.
 */
export const CategoriaSeccion = memo(function CategoriaSeccion({
  categoria,
  numero,
  enabled,
}: CategoriaSeccionProps) {
  const config = CATEGORIAS_DESCUBRIR[categoria]
  const consulta = usePropuestasCategoria(categoria, enabled)
  const propuestas = consulta.data?.content ?? []
  const cargando = enabled && (consulta.isPending || consulta.isPlaceholderData)

  return (
    <section
      id={`descubrir-${categoria}`}
      data-categoria={categoria}
      className="flex min-h-[calc(100dvh-101px)] scroll-mt-[101px] items-center border-t border-black/5 py-8 first:border-t-0 lg:min-h-[calc(100dvh-53px)] lg:scroll-mt-[53px] lg:py-10"
    >
      <div className="grid w-full grid-cols-1 items-center gap-5 md:gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7a5900]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#696E79]">
              {config.region}
            </span>
            <span className="ml-1 font-syne text-xs font-bold tabular-nums text-[#c9c6bd]">
              {String(numero).padStart(2, '0')}
            </span>
          </div>

          <h2 className="mb-6 font-syne text-3xl font-extrabold uppercase leading-[0.92] tracking-tight text-[#111215] sm:text-4xl md:text-5xl lg:text-6xl">
            {CATEGORIA_LABELS[categoria]}
          </h2>

          <p className="line-clamp-3 max-w-sm text-sm leading-relaxed text-[#696E79] md:line-clamp-none md:text-base">
            {config.descripcion}
          </p>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <DescubrirCarrusel
            categoria={categoria}
            gradiente={config.gradiente}
            propuestas={propuestas}
            cargando={cargando}
            error={enabled && consulta.isError}
            placeholder={!enabled}
            onReintentar={() => {
              void consulta.refetch()
            }}
          />
        </div>
      </div>
    </section>
  )
})
