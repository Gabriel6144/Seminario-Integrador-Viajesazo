import { lazy, Suspense } from 'react'

import { RADIO_MAX_KM, RADIO_PRESETS } from './constants'
import { GuiaCallout } from './guia-callout'
import type { DestinoSeleccionado } from './types'

const DestinoMapa = lazy(() =>
  import('./destino-mapa').then((module) => ({ default: module.DestinoMapa })),
)

const MARCAS_RADIO = [1, 50, 100, 150, RADIO_MAX_KM]

interface Paso5RadioProps {
  destino: DestinoSeleccionado | null
  radiusKm: number
  sliderKmId: string
  isValid: boolean
  onChangeRadiusKm: (km: number) => void
  onNext: () => void
}

export function Paso5Radio({
  destino,
  radiusKm,
  sliderKmId,
  onChangeRadiusKm,
  onNext,
}: Paso5RadioProps) {
  return (
    <div className="flex min-h-[500px] w-full flex-col justify-between">
      <div>
        <GuiaCallout message="Ajustá cuánto te querés mover desde tu zona de destino." />

        <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
          ¿Hasta dónde querés explorar?
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          El círculo marca el área alrededor de tu base. Movés el control y el mapa se reencuadra
          solo, desde la ciudad hasta casi toda la provincia.
        </p>

        <div className="mt-5 grid grid-cols-1 items-start gap-5 md:grid-cols-12">
          {/* Control del radio */}
          <div className="space-y-3 md:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">
                  Distancia máxima de recorrido
                </span>
                <span className="font-heading text-3xl font-extrabold text-sky-600">
                  {radiusKm} km
                </span>
              </div>
              <label htmlFor={sliderKmId} className="sr-only">
                Distancia máxima de viaje en kilómetros
              </label>
              <input
                id={sliderKmId}
                type="range"
                min="1"
                max={RADIO_MAX_KM}
                step="1"
                value={radiusKm}
                onChange={(e) => onChangeRadiusKm(parseInt(e.target.value, 10))}
                className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600"
              />
              <div className="mt-1.5 flex justify-between text-xs font-semibold text-slate-400">
                {MARCAS_RADIO.map((km) => (
                  <span key={km}>{km} km</span>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2.5 border-t border-slate-100 pt-4">
                {RADIO_PRESETS.map((preset) => {
                  const isSelected = radiusKm === preset.km
                  return (
                    <button
                      key={preset.km}
                      type="button"
                      onClick={() => onChangeRadiusKm(preset.km)}
                      className={`rounded-2xl border px-2 py-3 text-center text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md ring-1 ring-sky-400/30'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-500'
                      }`}
                    >
                      {preset.label}
                      <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
                        {preset.km} km
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="px-1 text-xs text-slate-500">
              {destino === null
                ? 'Volvé al paso anterior para elegir tu zona de destino.'
                : `Exploraremos los atractivos dentro de ${radiusKm} km de ${destino.nombre}.`}
            </p>
          </div>

          {/* Mapa real con el radio */}
          <div className="md:col-span-7">
            {destino === null ? (
              <div className="flex h-72 w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center sm:h-80 md:h-[400px]">
                <span className="material-symbols-outlined text-3xl text-slate-400">
                  location_off
                </span>
                <p className="max-w-xs text-sm font-semibold text-slate-500">
                  Todavía no elegiste una zona de destino.
                </p>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="h-72 w-full animate-pulse rounded-3xl border border-slate-700 bg-slate-900 sm:h-80 md:h-[400px]" />
                }
              >
                <DestinoMapa destino={destino} radiusKm={radiusKm} />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto flex justify-end pt-6">
        <button
          type="button"
          className="font-heading flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] sm:w-auto"
          onClick={onNext}
        >
          <span>Continuar</span>
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
