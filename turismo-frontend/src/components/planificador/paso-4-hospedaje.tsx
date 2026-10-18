import { ZONES } from './constants'
import { GuiaCallout } from './guia-callout'

interface Paso4HospedajeProps {
  zone: string
  isValid: boolean
  onChangeZone: (zone: string) => void
  onNext: () => void
}

export function Paso4Hospedaje({
  zone,
  onChangeZone,
  onNext,
}: Paso4HospedajeProps) {
  return (
    <div className="flex min-h-[500px] w-full flex-col justify-between">
      <div>
        <GuiaCallout message="Calculo traslados desde tu punto base para organizar el mejor recorrido." />

        <h2 className="font-heading flex items-center gap-2 text-2xl font-bold text-slate-800 sm:text-3xl">
          <span>¿Dónde te vas a quedar?</span>
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Esto nos ayuda a armar un circuito con sentido logístico y sin viajes innecesarios.
        </p>

        {/* Layout 2 columnas en desktop */}
        <div className="mt-5 grid grid-cols-1 items-start gap-5 md:grid-cols-12">
          {/* Lista de Zonas */}
          <div className="space-y-2 md:col-span-7">
            {ZONES.map((z) => {
              const isSelected = zone === z.name
              return (
                <button
                  key={z.name}
                  type="button"
                  onClick={() => onChangeZone(z.name)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 text-slate-800 shadow-md ring-1 ring-sky-400/40'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                        isSelected ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">{z.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{z.label}</p>
                      <p className="text-xs text-slate-500">{z.desc}</p>
                    </div>
                  </div>
                  <span
                    className={`material-symbols-outlined text-xl ${
                      isSelected ? 'text-sky-600' : 'text-slate-300'
                    }`}
                  >
                    {isSelected ? 'check_circle' : 'circle'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Mapa Preview */}
          <div className="relative flex h-48 flex-col justify-between overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-xl md:col-span-5 md:h-[295px]">
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
            <svg className="absolute inset-0 h-full w-full stroke-sky-400 opacity-30" fill="none" viewBox="0 0 350 200">
              <path d="M 20 80 Q 90 30 180 80 T 330 60" strokeDasharray="4 4" strokeWidth="2" />
              <path d="M 60 160 Q 150 100 240 140" strokeWidth="1.5" />
            </svg>

            <div className="relative z-10 flex items-start justify-between">
              <span className="rounded-md bg-black/70 px-2.5 py-1 font-mono text-[10px] tracking-wider text-sky-300">
                MAPA REGIONAL CÓRDOBA
              </span>
              <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow">
                {zone || 'Sin seleccionar'}
              </span>
            </div>

            <div className="relative z-10 flex items-center gap-2.5">
              <div className="absolute -ml-1 h-9 w-9 animate-ping rounded-full bg-red-500/25" />
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
                <span className="material-symbols-outlined text-[18px]">hotel</span>
              </div>
              <div className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-lg backdrop-blur-sm">
                <span>Base de hospedaje: {zone ? zone.split('/')[0] : 'Elegí una zona'}</span>
              </div>
            </div>
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
