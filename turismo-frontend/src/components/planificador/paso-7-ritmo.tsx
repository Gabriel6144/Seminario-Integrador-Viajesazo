import { RHYTHMS } from './constants'
import { GuiaCallout } from './guia-callout'

interface Paso7RitmoProps {
  rhythm: string
  isValid: boolean
  onChangeRhythm: (id: string) => void
  onNext: () => void
}

export function Paso7Ritmo({
  rhythm,
  onChangeRhythm,
  onNext,
}: Paso7RitmoProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <GuiaCallout message="¡Elegí tu ritmo, disfrutá tu tiempo!" />

      <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
        ¿Cómo querés vivir Córdoba? 💫
      </h2>
      <p className="mt-1.5 text-sm text-slate-500">
        No todos viajamos al mismo ritmo. Elegí el que mejor te describa en este viaje.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {RHYTHMS.map((r) => {
          const isSelected = rhythm === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onChangeRhythm(r.id)}
              className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                isSelected
                  ? 'border-sky-500 bg-sky-50/90 shadow-md ring-1 ring-sky-400/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`rounded-xl p-2.5 text-3xl ${r.iconBg}`}>{r.emoji}</span>
                  <span
                    className={`material-symbols-outlined text-2xl ${
                      isSelected ? 'text-sky-600' : 'text-slate-300'
                    }`}
                  >
                    {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
                <p className="mt-4 text-base font-bold tracking-wide text-slate-800">{r.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{r.desc}</p>
              </div>
              <span className={`mt-4 inline-block w-fit rounded-lg border px-3 py-1 text-[11px] font-semibold ${r.badgeClass}`}>
                {r.tag}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/25 transition-all hover:bg-sky-700 active:scale-[0.98] sm:w-auto"
          onClick={onNext}
        >
          <span>Continuar</span>
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
