import { useState } from 'react'
import { CircuitoDetalleView } from './circuito-detalle-view'
import { CircuitoMapaGeneralView } from './circuito-mapa-general-view'
import { CIRCUITOS_RECOMENDADOS } from './constants'
import type { CircuitoRecomendado } from './types'

interface Paso10CircuitoProps {
  tripName: string
  daysCount: number
  rhythm: string
  activeDay: number
  isSavingTrip: boolean
  onChangeActiveDay: (day: number) => void
  onSaveTrip: () => void
  onExploreMap: () => void
  onRestart: () => void
  onBackToResumen?: () => void
}

export function Paso10Circuito({
  activeDay,
  isSavingTrip,
  onChangeActiveDay,
  onSaveTrip,
  onRestart,
  onBackToResumen,
}: Paso10CircuitoProps) {
  const [selectedCircuit, setSelectedCircuit] =
    useState<CircuitoRecomendado | null>(null)
  const [mapCircuit, setMapCircuit] =
    useState<CircuitoRecomendado | null>(null)

  if (mapCircuit !== null) {
    return (
      <CircuitoMapaGeneralView
        circuito={mapCircuit}
        onBack={() => setMapCircuit(null)}
      />
    )
  }

  if (selectedCircuit !== null) {
    return (
      <CircuitoDetalleView
        circuito={selectedCircuit}
        activeDay={activeDay}
        isSavingTrip={isSavingTrip}
        onChangeActiveDay={onChangeActiveDay}
        onBackToList={() => setSelectedCircuit(null)}
        onSaveTrip={onSaveTrip}
        onExploreMap={() => setMapCircuit(selectedCircuit)}
        onRestart={onRestart}
      />
    )
  }

  return (
    <div className="w-full pb-8">
      {/* Header Circuitos Recomendados (ZIP 0) */}
      <header className="mb-4 flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-3">
          {onBackToResumen && (
            <button
              type="button"
              onClick={onBackToResumen}
              aria-label="Volver al resumen"
              className="flex h-9 w-9 items-center justify-center rounded-full text-sky-600 transition-colors hover:bg-slate-100 active:scale-95"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Circuitos Recomendados
          </h1>
        </div>
      </header>

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
        Hemos diseñado estas alternativas basándonos en tus preferencias. Explora y elige la ruta
        que mejor se adapte a tu viaje.
      </p>

      {/* Grid de Alternativas de Circuitos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {CIRCUITOS_RECOMENDADOS.map((circuito) => (
          <article
            key={circuito.id}
            onClick={() => setSelectedCircuit(circuito)}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            {/* Affinity Badge */}
            <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1 rounded-full border border-amber-300/60 bg-[#F7EBCB] px-3 py-1 text-xs font-bold text-[#7A5900] shadow-sm">
              <span className="material-symbols-outlined fill text-[16px]">star</span>
              <span>{circuito.affinity}</span>
            </div>

            {/* Image Header */}
            <div className="relative h-52 w-full overflow-hidden sm:h-56">
              <div
                className="h-full w-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                style={{ backgroundImage: `url('${circuito.image}')` }}
              />
              <div className="absolute bottom-0 h-1/2 w-full bg-gradient-to-t from-white/80 to-transparent" />
            </div>

            {/* Content Body */}
            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
              <h3 className="font-heading text-xl font-bold text-slate-900 transition-colors group-hover:text-[#00658d]">
                {circuito.title}
              </h3>

              {/* Quick Stats Chips */}
              <div className="flex flex-wrap gap-2">
                {circuito.chips.map((chip) => {
                  const chipStyle =
                    chip.variant === 'sky'
                      ? 'bg-[#EAF6FC] text-[#00658D]'
                      : chip.variant === 'amber'
                        ? 'bg-[#F7EBCB] text-[#7A5900]'
                        : 'bg-slate-100 text-slate-700'

                  return (
                    <span
                      key={chip.label}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${chipStyle}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{chip.icon}</span>
                      <span>{chip.label}</span>
                    </span>
                  )
                })}
              </div>

              {/* Details Grid: Ventajas & Consideraciones */}
              <div className="mt-auto grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <h4 className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <span className="material-symbols-outlined text-[18px] text-rose-600">
                      check_circle
                    </span>
                    <span>Ventajas</span>
                  </h4>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 marker:text-rose-500/60">
                    {circuito.ventajas.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-1">
                  <h4 className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <span className="material-symbols-outlined text-[18px] text-amber-700">
                      info
                    </span>
                    <span>Consideraciones</span>
                  </h4>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 marker:text-amber-600/60">
                    {circuito.consideraciones.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div
                className="mt-2 flex items-center gap-3 border-t border-slate-100 pt-3.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCircuit(circuito)}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#65B7E8] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#52a6d8] active:scale-95"
                >
                  Ver circuito
                </button>
                <button
                  type="button"
                  aria-label="Ver en mapa"
                  onClick={() => setMapCircuit(circuito)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-[#00658D] transition-colors hover:bg-slate-200 active:scale-95"
                >
                  <span className="material-symbols-outlined">map</span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
