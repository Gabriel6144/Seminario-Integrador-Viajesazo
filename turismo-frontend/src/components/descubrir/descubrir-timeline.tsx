import { CATEGORIA_LABELS, CATEGORIAS, type Categoria } from '@/types/api'

export function DescubrirTimeline({
  activa,
  onChange,
}: {
  activa: Categoria
  onChange: (categoria: Categoria) => void
}) {
  return (
    <aside
      aria-label="Categorías turísticas"
      className="relative flex shrink-0 select-none flex-row items-center justify-center gap-2 lg:flex-col lg:justify-between lg:gap-0 lg:py-2"
    >
      <div className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-slate-200 lg:bottom-8 lg:left-1/2 lg:right-auto lg:top-2 lg:h-auto lg:w-px lg:-translate-x-1/2 lg:translate-y-0" />

      <div className="relative z-10 flex flex-row items-center gap-2 sm:gap-2.5 lg:flex-col lg:gap-3.5">
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
                  ? 'flex h-8 w-8 items-center justify-center rounded-full bg-[#00658d] text-xs font-semibold text-white shadow-md transition-all'
                  : 'h-2 w-2 rounded-full bg-slate-300 transition-all hover:scale-125 hover:bg-[#65b7e8] focus-visible:scale-125 focus-visible:bg-[#65b7e8]'
              }
            >
              {esActiva ? indice + 1 : null}
            </button>
          )
        })}
      </div>

      <span className="mt-8 hidden rotate-180 text-[10px] font-medium tracking-widest text-[#70787f] [writing-mode:vertical-rl] lg:inline">
        {String(CATEGORIAS.indexOf(activa) + 1).padStart(2, '0')} /{' '}
        {String(CATEGORIAS.length).padStart(2, '0')}
      </span>
    </aside>
  )
}
