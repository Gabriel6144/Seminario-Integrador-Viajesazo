import { useMemo, useState } from 'react'

import type {
  CircuitStrategy,
  GeneracionCircuitoResponse,
} from '@/types/api'
import { CircuitoDetalleView } from './circuito-detalle-view'
import { CircuitoMapaGeneralView } from './circuito-mapa-general-view'
import { firstDayWithStops, toCircuitoRecomendado } from './circuito-view-model'
import type { CircuitoRecomendado } from './types'

interface Paso10CircuitoProps {
  circuito: GeneracionCircuitoResponse
  rhythm: string
  activeDay: number
  selectedStrategy: CircuitStrategy | null
  isSelecting: boolean
  showSuccessModal: boolean
  onChangeActiveDay: (day: number) => void
  onConfirmCircuit: (strategy: CircuitStrategy) => void
  onCloseSuccess: () => void
  onGoToTrips: () => void
  onRestart: () => void
  onBackToResumen?: () => void
}

export function Paso10Circuito({
  circuito,
  rhythm,
  activeDay,
  selectedStrategy,
  isSelecting,
  showSuccessModal,
  onChangeActiveDay,
  onConfirmCircuit,
  onCloseSuccess,
  onGoToTrips,
  onRestart,
  onBackToResumen,
}: Paso10CircuitoProps) {
  const [selectedCircuit, setSelectedCircuit] =
    useState<CircuitoRecomendado | null>(null)
  const [mapCircuit, setMapCircuit] =
    useState<CircuitoRecomendado | null>(null)

  const openCircuit = (item: CircuitoRecomendado) => {
    onChangeActiveDay(firstDayWithStops(item))
    setSelectedCircuit(item)
  }

  const circuitos = useMemo(
    () =>
      circuito.alternativas.map((alternativa) =>
        toCircuitoRecomendado(alternativa, rhythm),
      ),
    [circuito.alternativas, rhythm],
  )

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
        selectedStrategy={selectedStrategy}
        isSelecting={isSelecting}
        showSuccessModal={showSuccessModal}
        onChangeActiveDay={onChangeActiveDay}
        onBackToList={() => setSelectedCircuit(null)}
        onConfirmCircuit={() => onConfirmCircuit(selectedCircuit.estrategia)}
        onCloseSuccess={onCloseSuccess}
        onGoToTrips={onGoToTrips}
        onExploreMap={() => setMapCircuit(selectedCircuit)}
        onRestart={onRestart}
      />
    )
  }

  return (
    <div className="w-full pb-8">
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
        Armamos estas alternativas con las propuestas disponibles para tus fechas. Explorá y elegí
        la ruta que mejor se adapte a tu viaje.
      </p>

      {circuito.advertencia && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <span className="material-symbols-outlined mt-0.5">info</span>
          <p className="text-xs font-medium sm:text-sm">{circuito.advertencia}</p>
        </div>
      )}

      {circuitos.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No encontramos propuestas disponibles para estas fechas y preferencias.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {circuitos.map((item) => {
            const isSelected = selectedStrategy === item.estrategia
            return (
              <article
                key={item.id}
                      onClick={() => openCircuit(item)}
                className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                  isSelected
                    ? 'border-[#00658d] ring-2 ring-[#00658d]/30'
                    : 'border-slate-200/80'
                }`}
              >
                <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1 rounded-full border border-amber-300/60 bg-[#F7EBCB] px-3 py-1 text-xs font-bold text-[#7A5900] shadow-sm">
                  <span className="material-symbols-outlined fill text-[16px]">star</span>
                  <span>{item.affinity}</span>
                </div>

                {isSelected && (
                  <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Elegida</span>
                  </div>
                )}

                <div className="relative h-52 w-full overflow-hidden sm:h-56">
                  <div
                    className="h-full w-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{ backgroundImage: `url('${item.image}')` }}
                  />
                  <div className="absolute bottom-0 h-1/2 w-full bg-gradient-to-t from-white/80 to-transparent" />
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                  <h3 className="font-heading text-xl font-bold text-slate-900 transition-colors group-hover:text-[#00658d]">
                    {item.title}
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {item.chips.map((chip) => {
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

                  <div className="mt-auto grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <h4 className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <span className="material-symbols-outlined text-[18px] text-rose-600">
                          check_circle
                        </span>
                        <span>Ventajas</span>
                      </h4>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 marker:text-rose-500/60">
                        {item.ventajas.map((ventaja) => (
                          <li key={ventaja}>{ventaja}</li>
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
                        {item.consideraciones.map((consideracion) => (
                          <li key={consideracion}>{consideracion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div
                    className="mt-2 flex items-center gap-3 border-t border-slate-100 pt-3.5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                onClick={() => openCircuit(item)}
                      className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#65B7E8] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#52a6d8] active:scale-95"
                    >
                      Ver circuito
                    </button>
                    <button
                      type="button"
                      aria-label="Ver en mapa"
                      onClick={() => setMapCircuit(item)}
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-[#00658D] transition-colors hover:bg-slate-200 active:scale-95"
                    >
                      <span className="material-symbols-outlined">map</span>
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
