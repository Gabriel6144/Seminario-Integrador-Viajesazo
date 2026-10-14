import { ALL_INTERESTS } from './constants'
import { GuiaCallout } from './guia-callout'

interface Paso6InteresesProps {
  interests: string[]
  isValid: boolean
  onToggleInterest: (name: string) => void
  onNext: () => void
}

export function Paso6Intereses({
  interests,
  onToggleInterest,
  onNext,
}: Paso6InteresesProps) {
  return (
    <div className="flex min-h-[500px] w-full flex-col justify-between">
      <div>
        <GuiaCallout message="¡Seleccioná todas las temáticas que te gusten!" />

        <div className="flex flex-col justify-between sm:flex-row sm:items-center">
          <h2 className="font-heading flex items-center gap-2 text-2xl font-bold text-slate-800 sm:text-3xl">
            <span>¿Qué te gustaría descubrir?</span>
          </h2>
          <span className="mt-2 inline-block w-fit rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 sm:mt-0">
            {interests.length} seleccionados
          </span>
        </div>
        <p className="mt-1.5 text-sm text-slate-500">
          Nosotros nos encargamos de combinarlos de forma balanceada a lo largo del viaje.
        </p>

        {/* Grid responsive de chips */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ALL_INTERESTS.map((it) => {
            const isSelected = interests.includes(it.name)
            return (
              <button
                key={it.name}
                type="button"
                onClick={() => onToggleInterest(it.name)}
                className={`flex flex-col items-center justify-center rounded-2xl border p-3 sm:p-3.5 text-xs transition-all active:scale-95 ${
                  isSelected
                    ? 'border-sky-300 bg-sky-50/90 font-bold text-sky-800 shadow-md ring-1 ring-sky-400/40'
                    : 'border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300'
                }`}
              >
                <div
                  className={`mb-2 flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                    isSelected ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{it.icon}</span>
                </div>
                <span className="text-center font-bold text-slate-900">{it.label || it.name}</span>
                <span
                  className={`material-symbols-outlined mt-1.5 text-base ${
                    isSelected ? 'text-sky-600' : 'text-slate-300'
                  }`}
                >
                  {isSelected ? 'check_circle' : 'add_circle'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-auto pt-6 flex justify-end">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] sm:w-auto"
          onClick={onNext}
        >
          <span>Continuar</span>
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
