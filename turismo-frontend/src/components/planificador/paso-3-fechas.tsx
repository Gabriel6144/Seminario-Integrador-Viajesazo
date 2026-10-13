import { GuiaCallout } from './guia-callout'

interface Paso3FechasProps {
  dateFrom: string
  dateTo: string
  dateFromId: string
  dateToId: string
  todayStr: string
  daysCount: number
  isValid: boolean
  onChangeDateFrom: (val: string) => void
  onChangeDateTo: (val: string) => void
  onNext: () => void
}

export function Paso3Fechas({
  dateFrom,
  dateTo,
  dateFromId,
  dateToId,
  todayStr,
  daysCount,
  isValid,
  onChangeDateFrom,
  onChangeDateTo,
  onNext,
}: Paso3FechasProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <GuiaCallout message="Reviso el clima y aperturas para esos días." />

      <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
        ¿Cuándo venís a Córdoba? 📅
      </h2>
      <p className="mt-1.5 text-sm text-slate-500">
        Elegí las fechas para encontrar actividades que estén realmente disponibles durante tu estadía.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor={dateFromId} className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Fecha de Llegada</span>
            <span className="text-[11px] font-bold text-sky-600">Check-in</span>
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-sky-500">
              flight_land
            </span>
            <input
              id={dateFromId}
              type="date"
              min={todayStr}
              value={dateFrom}
              onChange={(e) => onChangeDateFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor={dateToId} className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Fecha de Partida</span>
            <span className="text-[11px] font-bold text-amber-600">Check-out</span>
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-amber-500">
              flight_takeoff
            </span>
            <input
              id={dateToId}
              type="date"
              min={dateFrom && dateFrom >= todayStr ? dateFrom : todayStr}
              value={dateTo}
              onChange={(e) => onChangeDateTo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {isValid ? (
        <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-emerald-200/90 bg-emerald-50 p-4 transition-all">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-snug text-emerald-900">
              Perfecto, tenemos {daysCount} {daysCount === 1 ? 'día' : 'días'} para disfrutar Córdoba al máximo.
            </p>
            <p className="text-xs text-emerald-700">Tiempo ideal para recorrer, degustar y relajarte en las sierras.</p>
          </div>
        </div>
      ) : dateFrom && dateFrom < todayStr ? (
        <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-rose-200/90 bg-rose-50 p-4 transition-all">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <span className="material-symbols-outlined text-[22px]">warning</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-snug text-rose-900">
              La fecha de llegada no puede ser anterior a la fecha actual.
            </p>
            <p className="text-xs text-rose-700">Elegí una fecha de llegada de hoy en adelante.</p>
          </div>
        </div>
      ) : dateFrom && dateTo && dateFrom > dateTo ? (
        <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-rose-200/90 bg-rose-50 p-4 transition-all">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <span className="material-symbols-outlined text-[22px]">warning</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-snug text-rose-900">
              La fecha de llegada no puede ser posterior a la de partida.
            </p>
            <p className="text-xs text-rose-700">Revisá las fechas seleccionadas para continuar.</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 transition-all">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <span className="material-symbols-outlined text-[22px]">calendar_month</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-snug text-sky-900">
              Seleccioná tus fechas de llegada y partida.
            </p>
            <p className="text-xs text-sky-700">Calcularemos la duración exacta de tu estadía y actividades acordes.</p>
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-end">
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
