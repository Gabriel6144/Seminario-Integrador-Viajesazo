import {
  CATEGORIA_LABELS,
  CIRCUIT_STRATEGY_LABELS,
  type CircuitStrategy,
  type CircuitoItemResponse,
  type GeneracionCircuitoResponse,
  type InteresCategoria,
} from '@/types/api'
import { GUIA_AVATAR } from './constants'

interface Paso10CircuitoProps {
  tripName: string
  daysCount: number
  rhythm: string
  circuito: GeneracionCircuitoResponse | null
  activeStrategy: CircuitStrategy
  activeDay: number
  isSavingTrip: boolean
  isSelecting: boolean
  isTripSaved: boolean
  onChangeStrategy: (strategy: CircuitStrategy) => void
  onChangeActiveDay: (day: number) => void
  onSelectStrategy: (strategy: CircuitStrategy) => void
  onSaveTrip: () => void
  onExploreMap: () => void
  onRestart: () => void
}

const CATEGORY_CLASSES: Partial<Record<InteresCategoria, string>> = {
  NATURALEZA: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  GASTRONOMIA: 'text-amber-700 bg-amber-50 border-amber-200',
  CULTURA: 'text-purple-700 bg-purple-50 border-purple-200',
  HISTORIA: 'text-orange-700 bg-orange-50 border-orange-200',
  AVENTURA: 'text-rose-700 bg-rose-50 border-rose-200',
  VIDA_NOCTURNA: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  MUSICA: 'text-sky-700 bg-sky-50 border-sky-200',
  COMPRAS: 'text-pink-700 bg-pink-50 border-pink-200',
  FAMILIAR_Y_RELAX: 'text-teal-700 bg-teal-50 border-teal-200',
}

/**
 * Pantalla final del planificador. Muestra las tres alternativas que devolvió el motor y deja
 * elegir una sola. El snapshot del ítem (`descripcion`/`categoria`) se usa tal cual: no vuelve a
 * consultar cada propuesta.
 */
export function Paso10Circuito({
  tripName,
  daysCount,
  rhythm,
  circuito,
  activeStrategy,
  activeDay,
  isSavingTrip,
  isSelecting,
  isTripSaved,
  onChangeStrategy,
  onChangeActiveDay,
  onSelectStrategy,
  onSaveTrip,
  onExploreMap,
  onRestart,
}: Paso10CircuitoProps) {
  const alternative =
    circuito?.alternativas.find((item) => item.estrategia === activeStrategy) ??
    circuito?.alternativas[0] ??
    null
  const strategy = alternative?.estrategia ?? activeStrategy
  const items = alternative?.propuestas ?? []
  const dayDates = [...new Set(items.map((item) => item.fecha))].sort()
  const safeDay = Math.min(Math.max(activeDay, 1), Math.max(dayDates.length, 1))
  const currentDate = dayDates[safeDay - 1] ?? null
  const itemsForDay = currentDate === null ? [] : items.filter((item) => item.fecha === currentDate)
  const selectedStrategy = circuito?.estrategiaSeleccionada ?? null
  const alreadySelectedHere = selectedStrategy === strategy
  const warning = circuito?.advertencia ?? alternative?.advertencia ?? null

  return (
    <div className="w-full">
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 to-sky-800 p-6 text-white shadow-lg">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="inline-block rounded bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
              Itinerario Oficial
            </span>
            <h2 className="font-heading mt-1.5 text-2xl font-bold leading-tight sm:text-3xl">
              ¡Tu aventura está lista!
            </h2>
            <p className="mt-1 text-sm text-sky-100">
              {tripName} • {daysCount} Días ({rhythm})
            </p>
          </div>
          <div className="h-16 w-16 flex-shrink-0 rounded-full bg-white/10 p-1">
            <img
              alt="Guía de Córdoba"
              className="h-full w-full rounded-full object-cover"
              src={GUIA_AVATAR}
            />
          </div>
        </div>
      </div>

      {circuito === null ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
          No pudimos cargar el circuito generado. Volvé a intentarlo.
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {circuito.alternativas.map((item) => {
              const isActive = item.estrategia === strategy
              const isSelected = item.estrategia === selectedStrategy
              return (
                <button
                  key={item.estrategia}
                  type="button"
                  onClick={() => onChangeStrategy(item.estrategia)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'border-sky-500 bg-sky-50 shadow-sm ring-1 ring-sky-400/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {CIRCUIT_STRATEGY_LABELS[item.estrategia]}
                    {isSelected && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Elegida
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm font-bold text-slate-800">
                    {item.propuestas.length} paradas
                  </span>
                  <span className="block text-xs text-slate-500">
                    {item.distanciaTotalKm.toFixed(1)} km en total
                  </span>
                </button>
              )
            })}
          </div>

          {warning === null ? null : (
            <div className="mb-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              <span className="material-symbols-outlined text-base">info</span>
              <span>{warning}</span>
            </div>
          )}

          {dayDates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <span className="material-symbols-outlined text-3xl text-slate-400">event_busy</span>
              <p className="mt-2 text-sm font-bold text-slate-700">
                No hay propuestas compatibles con este viaje
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Probá ampliar el radio, cambiar las fechas o elegir otros intereses.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5 text-xs font-bold">
                {dayDates.map((date, index) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => onChangeActiveDay(index + 1)}
                    className={`flex-1 rounded-xl py-2.5 text-center transition-all ${
                      safeDay === index + 1
                        ? 'bg-white text-sky-600 shadow-sm font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    DÍA {index + 1}
                  </button>
                ))}
              </div>

              <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-inner">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-sky-400">RUTA CONECTADA DEL DÍA</span>
                  <span className="rounded bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    {itemsForDay.length} paradas optimizadas
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                  {itemsForDay.map((item, index) => (
                    <span key={`${item.propuestaId}-${item.orden}`} className="flex items-center gap-2">
                      {index > 0 && (
                        <span className="text-slate-400">
                          ━━ {item.trasladoMinutos} min ━━
                        </span>
                      )}
                      <span className="rounded-lg bg-slate-800 px-2 py-1 font-semibold">
                        {item.propuestaNombre}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3.5">
                {itemsForDay.map((item, idx) => (
                  <ItemCard key={`${item.propuestaId}-${item.orden}-${idx}`} item={item} />
                ))}
              </div>
            </>
          )}

          <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">
                {CIRCUIT_STRATEGY_LABELS[strategy]}
              </p>
              <p className="text-xs text-slate-500">
                {selectedStrategy === null
                  ? 'Podés elegir una sola alternativa para este viaje.'
                  : alreadySelectedHere
                    ? 'Esta es la alternativa que elegiste.'
                    : 'Ya elegiste otra alternativa; no se puede cambiar.'}
              </p>
            </div>
            <button
              type="button"
              disabled={isSelecting || selectedStrategy !== null}
              onClick={() => onSelectStrategy(strategy)}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSelecting
                ? 'Eligiendo...'
                : alreadySelectedHere
                  ? 'Alternativa elegida'
                  : 'Elegir esta alternativa'}
            </button>
          </div>
        </>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={isSavingTrip}
          onClick={onSaveTrip}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-lg">
            {isSavingTrip ? 'hourglass_top' : isTripSaved ? 'list_alt' : 'bookmark'}
          </span>
          <span>
            {isSavingTrip
              ? 'Guardando...'
              : isTripSaved
                ? 'Ver en Mis viajes'
                : 'Guardar en Mis viajes'}
          </span>
        </button>

        <button
          type="button"
          onClick={onExploreMap}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-heading text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-lg text-slate-500">map</span>
          <span>Explorar en el mapa</span>
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-heading text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-lg text-slate-500">restart_alt</span>
          <span>Reiniciar</span>
        </button>
      </div>
    </div>
  )
}

function ItemCard({ item }: { item: CircuitoItemResponse }) {
  const category = item.categoria
  const catLabel = category === null ? 'Propuesta' : CATEGORIA_LABELS[category]
  const catClass = (category === null ? undefined : CATEGORY_CLASSES[category]) ??
    'text-slate-700 bg-slate-50 border-slate-200'

  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border p-4 shadow-sm transition-all ${
        item.disponible
          ? 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-md'
          : 'border-amber-200 bg-amber-50/40'
      }`}
    >
      <div className="flex flex-col items-center">
        <span className="rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
          {formatTime(item.horaInicio)}
        </span>
        <div className="my-1.5 h-12 w-0.5 bg-slate-200" />
        <span className="text-[10px] font-semibold text-slate-400">
          {formatTime(item.horaFin)}
        </span>
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${catClass}`}>
            {catLabel}
          </span>
          <span className="text-xs text-slate-400">{durationLabel(item)}</span>
        </div>
        <h4 className="mt-1 text-sm font-bold text-slate-800">{item.propuestaNombre}</h4>
        {item.descripcion === null ? null : (
          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{item.descripcion}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          {item.trasladoMinutos > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">route</span>
              {item.trasladoKm.toFixed(1)} km · {item.trasladoMinutos} min desde la parada anterior
            </span>
          )}
          {item.disponible ? (
            <span className="font-semibold text-emerald-600">Disponible</span>
          ) : (
            <span className="font-semibold text-amber-700">
              {item.motivoNoDisponible ?? 'No disponible'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(value: string | null): string {
  return value === null ? '--:--' : value.slice(0, 5)
}

function durationLabel(item: CircuitoItemResponse): string {
  if (item.horaInicio === null || item.horaFin === null) return ''
  const [startHour, startMinute] = item.horaInicio.split(':').map(Number)
  const [endHour, endMinute] = item.horaFin.split(':').map(Number)
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  if (minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
