import { RANDOM_NAMES } from './constants'
import { GuiaCallout } from './guia-callout'

interface Paso2NombreProps {
  tripName: string
  tripNameId: string
  isValid: boolean
  onChangeTripName: (name: string) => void
  onRandomName: () => void
  onNext: () => void
}

export function Paso2Nombre({
  tripName,
  tripNameId,
  onChangeTripName,
  onRandomName,
  onNext,
}: Paso2NombreProps) {
  return (
    <div className="flex min-h-[500px] w-full flex-col justify-between">
      <div>
        <GuiaCallout message="¡Empecemos por bautizar la aventura!" />

        <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
          Primero, pongámosle un nombre a esta aventura
        </h2>

        <div className="mt-6">
          <label htmlFor={tripNameId} className="mb-2 block text-sm font-semibold text-slate-700">
            ¿Cómo querés llamar a tu viaje?
          </label>
          <div className="relative">
            <input
              id={tripNameId}
              type="text"
              value={tripName}
              onChange={(e) => onChangeTripName(e.target.value)}
              placeholder="Ej: Finde Serrano en Córdoba"
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 pr-12 text-base font-semibold text-slate-800 shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <span className="material-symbols-outlined absolute right-4 top-4 text-slate-400 text-xl">
              edit
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRandomName}
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 transition-all hover:bg-amber-100/80 active:scale-[0.98]"
        >
          <span>Sorprendeme con un nombre</span>
        </button>

        <div className="mt-6">
          <span className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Sugerencias rápidas:
          </span>
          <div className="flex flex-wrap gap-2">
            {RANDOM_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onChangeTripName(name)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                  tripName === name
                    ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-400 hover:text-sky-600'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
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
