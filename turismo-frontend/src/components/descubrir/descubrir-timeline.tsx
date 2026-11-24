import { CATEGORIA_LABELS, CATEGORIAS, type Categoria } from '@/types/api'

/**
 * Índice de categorías de `/descubrir`.
 *
 * `vertical` es el rail fijo de escritorio (columna con contador). `horizontal` es la franja
 * sticky de mobile. En ambos casos el activo se resalta y el click navega a la sección.
 */
export function DescubrirTimeline({
  activa,
  onChange,
  orientacion = 'vertical',
}: {
  activa: Categoria
  onChange: (categoria: Categoria) => void
  orientacion?: 'vertical' | 'horizontal'
}) {
  const indiceActivo = CATEGORIAS.indexOf(activa)
  const contador = `${String(indiceActivo + 1).padStart(2, '0')} / ${String(
    CATEGORIAS.length,
  ).padStart(2, '0')}`

  if (orientacion === 'horizontal') {
    return (
      <aside aria-label="Categorías turísticas" className="w-full select-none">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-2">
          {CATEGORIAS.map((categoria, indice) => {
            const esActiva = categoria === activa
            return (
              <button
                key={categoria}
                type="button"
                aria-label={`Ir a ${CATEGORIA_LABELS[categoria]}`}
                aria-current={esActiva ? 'true' : undefined}
                onClick={() => onChange(categoria)}
                className={
                  esActiva
                    ? 'flex h-8 shrink-0 items-center justify-center rounded-full bg-[#111215] px-3 font-syne text-[11px] font-bold text-white shadow-sm transition-all'
                    : 'h-2.5 w-2.5 shrink-0 rounded-full bg-[#c9c6bd] transition-all hover:bg-[#111215]/50 focus-visible:bg-[#111215]/50'
                }
              >
                {esActiva ? indice + 1 : null}
              </button>
            )
          })}
          <span className="ml-auto shrink-0 pl-2 text-[11px] font-semibold tracking-widest text-[#696E79] tabular-nums">
            {contador}
          </span>
        </div>
      </aside>
    )
  }

  return (
    <aside
      aria-label="Categorías turísticas"
      className="flex h-[min(70vh,560px)] shrink-0 select-none flex-col items-center justify-between py-2"
    >
      <div className="relative flex w-8 flex-1 flex-col items-center">
        <div
          className="vz-dashed-rail absolute inset-y-2 left-1/2 w-0.5 -translate-x-1/2"
          aria-hidden
        />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-between py-1">
          {CATEGORIAS.map((categoria, indice) => {
            const esActiva = categoria === activa
            return (
              <button
                key={categoria}
                type="button"
                aria-label={`Ir a ${CATEGORIA_LABELS[categoria]}`}
                aria-current={esActiva ? 'true' : undefined}
                onClick={() => onChange(categoria)}
                className={
                  esActiva
                    ? 'flex h-7 w-7 items-center justify-center rounded-full bg-[#111215] font-syne text-[11px] font-bold text-white shadow-sm transition-all'
                    : 'flex h-3 w-3 items-center justify-center rounded-full bg-[#c9c6bd] transition-all hover:scale-150 hover:bg-[#111215]/50 focus-visible:scale-150 focus-visible:bg-[#111215]/50'
                }
              >
                {esActiva ? indice + 1 : null}
              </button>
            )
          })}
        </div>
      </div>

      <span className="vz-vertical-counter mt-4 text-[11px] font-semibold tracking-widest text-[#696E79]">
        {contador}
      </span>
    </aside>
  )
}
