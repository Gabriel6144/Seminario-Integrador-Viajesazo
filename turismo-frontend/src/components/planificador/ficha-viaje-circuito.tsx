import { formatDateRange, formatTripMonth } from '@/lib/dates'
import { CATEGORIA_LABELS } from '@/types/api'

import { CATEGORY_META } from './circuito-view-model'
import type { ViajeResumenCircuito } from './types'

interface FichaViajeCircuitoProps {
  viaje?: ViajeResumenCircuito | null
}

/**
 * Ficha con los datos propios del viaje y las preferencias que eligió el turista al generarlo.
 * Va debajo del hero del detalle del circuito, en el paso 10 y en la página confirmada.
 */
export function FichaViajeCircuito({ viaje }: FichaViajeCircuitoProps) {
  if (!viaje) return null

  const intereses = viaje.intereses ?? []
  const { fechaInicio, fechaFin } = viaje
  const mes =
    fechaInicio && fechaFin ? formatTripMonth(fechaInicio, fechaFin) : null
  const fechas =
    fechaInicio && fechaFin ? formatDateRange(fechaInicio, fechaFin) : null

  const tieneDatos =
    Boolean(viaje.nombre || viaje.zona || mes || viaje.ritmoLabel) ||
    viaje.rangoInteresKm != null ||
    intereses.length > 0

  if (!tieneDatos) return null

  return (
    <section
      aria-label="Datos del viaje"
      className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        {mes && (
          <span className="flex items-center gap-1 rounded-full bg-[#EAF6FC] px-3 py-1 text-xs font-semibold text-[#00658D]">
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            <span>{mes}</span>
          </span>
        )}
        {viaje.ritmoLabel && (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <span className="material-symbols-outlined text-[16px]">map</span>
            <span>{viaje.ritmoLabel}</span>
          </span>
        )}
        {viaje.rangoInteresKm != null && (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <span className="material-symbols-outlined text-[16px]">near_me</span>
            <span>A {viaje.rangoInteresKm} km a la redonda</span>
          </span>
        )}
      </div>

      {(viaje.nombre || viaje.zona || fechas) && (
        <div className="mt-3 flex flex-col gap-1">
          {viaje.nombre && (
            <h2 className="font-heading text-base font-bold text-slate-900">{viaje.nombre}</h2>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-600 sm:text-sm">
            {viaje.zona && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#00658D]">place</span>
                <span>{viaje.zona}</span>
              </span>
            )}
            {fechas && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#00658D]">date_range</span>
                <span>{fechas}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {intereses.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Tus intereses:</span>
          {intereses.map((interes) => {
            const meta = CATEGORY_META[interes]
            return (
              <span
                key={interes}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${meta?.badgeClass ?? 'bg-slate-700 text-white'}`}
              >
                <span className="material-symbols-outlined text-[14px]">{meta?.icon ?? 'star'}</span>
                <span>{CATEGORIA_LABELS[interes] ?? interes}</span>
              </span>
            )
          })}
        </div>
      )}
    </section>
  )
}
