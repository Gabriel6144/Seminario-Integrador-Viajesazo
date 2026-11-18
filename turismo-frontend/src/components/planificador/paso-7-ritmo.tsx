import { useMemo, useState } from 'react'

import { formatShortLocalDate, formatWeekdayDay } from '@/lib/dates'
import type { DiaRitmoPlan } from '@/types/api'

import { RHYTHMS } from './constants'
import { GuiaCallout } from './guia-callout'

interface Paso7RitmoProps {
  rhythm: string
  dateFrom: string
  dateTo: string
  diasPlan: DiaRitmoPlan[]
  isValid: boolean
  onChangeRhythm: (id: string) => void
  onChangeDiasPlan: (dias: DiaRitmoPlan[]) => void
  onNext: () => void
}

type DraftKey = `${string}:eventos` | `${string}:actividades`

function parseNonNegativeInt(raw: string): number | null {
  if (raw.trim() === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.floor(value)
}

export function Paso7Ritmo({
  rhythm,
  dateFrom,
  dateTo,
  diasPlan,
  onChangeRhythm,
  onChangeDiasPlan,
  onNext,
}: Paso7RitmoProps) {
  const isManual = rhythm === 'Manual'
  const [drafts, setDrafts] = useState<Partial<Record<DraftKey, string>>>({})

  const dayRows = useMemo(() => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) return []
    const rows: string[] = []
    const cursor = new Date(`${dateFrom}T12:00:00`)
    const end = new Date(`${dateTo}T12:00:00`)
    while (cursor <= end) {
      const y = cursor.getFullYear()
      const m = String(cursor.getMonth() + 1).padStart(2, '0')
      const d = String(cursor.getDate()).padStart(2, '0')
      rows.push(`${y}-${m}-${d}`)
      cursor.setDate(cursor.getDate() + 1)
    }
    return rows
  }, [dateFrom, dateTo])

  const planByDate = useMemo(() => {
    const map = new Map(diasPlan.map((d) => [d.fecha, d]))
    return dayRows.map((fecha) => {
      const existing = map.get(fecha)
      return (
        existing ?? {
          fecha,
          cantidadEventos: 0,
          cantidadActividades: 0,
        }
      )
    })
  }, [dayRows, diasPlan])

  const updateDay = (
    fecha: string,
    field: 'cantidadEventos' | 'cantidadActividades',
    value: number,
  ) => {
    const next = planByDate.map((row) =>
      row.fecha === fecha
        ? { ...row, [field]: Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0 }
        : row,
    )
    onChangeDiasPlan(next)
  }

  const draftKey = (fecha: string, field: 'eventos' | 'actividades'): DraftKey =>
    `${fecha}:${field}`

  const displayValue = (
    fecha: string,
    field: 'eventos' | 'actividades',
    committed: number,
  ): string => {
    const key = draftKey(fecha, field)
    return drafts[key] ?? String(committed)
  }

  const handleDraftChange = (
    fecha: string,
    field: 'eventos' | 'actividades',
    planField: 'cantidadEventos' | 'cantidadActividades',
    raw: string,
  ) => {
    const key = draftKey(fecha, field)
    setDrafts((prev) => ({ ...prev, [key]: raw }))
    const parsed = parseNonNegativeInt(raw)
    if (parsed !== null) {
      updateDay(fecha, planField, parsed)
    }
  }

  const commitDraft = (
    fecha: string,
    field: 'eventos' | 'actividades',
    planField: 'cantidadEventos' | 'cantidadActividades',
    committed: number,
  ) => {
    const key = draftKey(fecha, field)
    const raw = drafts[key]
    if (raw === undefined) return
    const parsed = parseNonNegativeInt(raw)
    updateDay(fecha, planField, parsed ?? committed)
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  return (
    <div className="flex min-h-[500px] w-full flex-col justify-between">
      <div>
        <GuiaCallout message="¡Elegí tu ritmo, disfrutá tu tiempo!" />

        <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
          ¿Cómo querés vivir Córdoba?
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          No todos viajamos al mismo ritmo. Elegí el que mejor te describa en este viaje.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RHYTHMS.map((r) => {
            const isSelected = rhythm === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onChangeRhythm(r.id)
                  setDrafts({})
                  if (r.id === 'Manual') {
                    onChangeDiasPlan(
                      dayRows.map((fecha) => ({
                        fecha,
                        cantidadEventos: 0,
                        cantidadActividades: 0,
                      })),
                    )
                  } else {
                    onChangeDiasPlan([])
                  }
                }}
                className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/90 shadow-md ring-1 ring-sky-400/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <p className="mt-0 text-base font-bold tracking-wide text-slate-800">{r.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{r.desc}</p>
                </div>
                <span
                  className={`mt-4 inline-block w-fit rounded-lg border px-3 py-1 text-[11px] font-semibold ${r.badgeClass}`}
                >
                  {r.tag}
                </span>
              </button>
            )
          })}
        </div>

        {isManual ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">Plan diario</p>
              <p className="text-xs text-slate-500">
                Basado en tus fechas ({formatShortLocalDate(dateFrom)} al{' '}
                {formatShortLocalDate(dateTo)}). Podés escribir la cantidad o usar las flechas
                arriba/abajo. Con 0 y 0 el día queda vacío.
              </p>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Día</th>
                  <th className="px-4 py-3 font-semibold">Cantidad de Eventos</th>
                  <th className="px-4 py-3 font-semibold">Cantidad de Actividades</th>
                </tr>
              </thead>
              <tbody>
                {planByDate.map((row) => (
                  <tr key={row.fecha} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatWeekdayDay(row.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={displayValue(row.fecha, 'eventos', row.cantidadEventos)}
                        aria-label={`Eventos ${formatWeekdayDay(row.fecha)}`}
                        onChange={(e) =>
                          handleDraftChange(
                            row.fecha,
                            'eventos',
                            'cantidadEventos',
                            e.target.value,
                          )
                        }
                        onBlur={() =>
                          commitDraft(
                            row.fecha,
                            'eventos',
                            'cantidadEventos',
                            row.cantidadEventos,
                          )
                        }
                        className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={displayValue(row.fecha, 'actividades', row.cantidadActividades)}
                        aria-label={`Actividades ${formatWeekdayDay(row.fecha)}`}
                        onChange={(e) =>
                          handleDraftChange(
                            row.fecha,
                            'actividades',
                            'cantidadActividades',
                            e.target.value,
                          )
                        }
                        onBlur={() =>
                          commitDraft(
                            row.fecha,
                            'actividades',
                            'cantidadActividades',
                            row.cantidadActividades,
                          )
                        }
                        className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex justify-end pt-6">
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
