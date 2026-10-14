import { GuiaCallout } from './guia-callout'

interface Paso5RadioProps {
  radiusKm: number
  sliderKmId: string
  isValid: boolean
  onChangeRadiusKm: (km: number) => void
  onNext: () => void
}

export function Paso5Radio({
  radiusKm,
  sliderKmId,
  onChangeRadiusKm,
  onNext,
}: Paso5RadioProps) {
  return (
    <div className="flex min-h-[500px] w-full flex-col justify-between">
      <div>
        <GuiaCallout message="Ajustá cuánto te querés mover desde tu base de alojamiento." />

        <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
          ¿Hasta dónde querés explorar?
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Podemos buscar actividades a pasos de tu hotel o abrir el abanico a toda la región serrana.
        </p>

        {/* Layout 2 columnas en desktop */}
        <div className="mt-5 grid grid-cols-1 items-center gap-5 md:grid-cols-2">
          {/* Radar Interactivo */}
          <div className="relative flex h-56 flex-col justify-between overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-xl sm:h-64">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-20" />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-28 rounded-full border border-sky-500/20" />
            <div className="absolute h-48 w-48 rounded-full border border-sky-500/20" />

            {/* Círculo dinámico según km */}
            <div
              className="flex items-center justify-center rounded-full border-2 border-sky-400 bg-sky-400/25 shadow-[0_0_25px_rgba(56,189,248,0.5)] transition-all duration-300"
              style={{
                width: `${60 + radiusKm * 7}px`,
                height: `${60 + radiusKm * 7}px`,
              }}
            >
              <span className="rounded bg-slate-900/80 px-2 py-0.5 font-mono text-xs font-bold text-sky-200">
                {radiusKm} km
              </span>
            </div>

            {/* Pin central */}
            <div className="absolute z-20 flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg">
              <span className="material-symbols-outlined text-[19px]">cottage</span>
            </div>

            {/* Puntos de interés simulados */}
            <div className="absolute -translate-x-12 -translate-y-10 rounded-full bg-sky-300 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow">
              Café
            </div>
            <div className="absolute translate-x-14 translate-y-8 rounded-full bg-sky-300 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow">
              Parque
            </div>
            <div className="absolute -translate-x-16 translate-y-14 rounded-full bg-sky-300 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow">
              Museo
            </div>
          </div>

          <div className="relative z-20 flex items-center justify-between text-white">
            <span className="rounded border border-sky-800 bg-sky-950/80 px-2.5 py-1 font-mono text-[11px] text-sky-400">
              RADIO ACTIVO
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <span className="material-symbols-outlined text-sm">near_me</span>
              <span>{radiusKm} km a la redonda</span>
            </div>
          </div>

          <div className="relative z-20 rounded-xl border border-slate-800/80 bg-slate-950/70 p-2.5 text-xs text-slate-300 backdrop-blur-sm">
            <span>Explorarás actividades y atractivos dentro de {radiusKm} km de tu hospedaje.</span>
          </div>
        </div>

        {/* Control Slider y Presets */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Distancia máxima de recorrido</span>
            <span className="font-heading text-3xl font-extrabold text-sky-600">{radiusKm} km</span>
          </div>
          <label htmlFor={sliderKmId} className="sr-only">
            Distancia máxima de viaje en kilómetros
          </label>
          <input
            id={sliderKmId}
            type="range"
            min="1"
            max="20"
            step="1"
            value={radiusKm}
            onChange={(e) => onChangeRadiusKm(parseInt(e.target.value, 10))}
            className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600"
          />
          <div className="mt-1.5 flex justify-between text-xs font-semibold text-slate-400">
            <span>1 km</span>
            <span>5 km</span>
            <span>10 km</span>
            <span>15 km</span>
            <span>20 km</span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2.5 border-t border-slate-100 pt-4">
            {[
              { km: 3, label: 'Más cerca' },
              { km: 8, label: 'Equilibrado' },
              { km: 18, label: 'Aventura' },
            ].map((preset) => {
              const isSelected = radiusKm === preset.km
              return (
                <button
                  key={preset.km}
                  type="button"
                  onClick={() => onChangeRadiusKm(preset.km)}
                  className={`rounded-2xl border py-3 px-2 text-center text-xs font-bold transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md ring-1 ring-sky-400/30'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-500'
                  }`}
                >
                  {preset.label}
                  <span className="block mt-0.5 text-[11px] font-normal text-slate-400">{preset.km} km</span>
                </button>
              )
            })}
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
