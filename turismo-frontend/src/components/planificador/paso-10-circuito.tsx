import { DAYS_DATA, GUIA_AVATAR } from './constants'

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
}

export function Paso10Circuito({
  tripName,
  daysCount,
  rhythm,
  activeDay,
  isSavingTrip,
  onChangeActiveDay,
  onSaveTrip,
  onExploreMap,
  onRestart,
}: Paso10CircuitoProps) {
  return (
    <div className="w-full">
      {/* Banner de Éxito */}
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

      {/* Selector de Días Tabs */}
      <div className="mb-6 flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5 text-xs font-bold">
        {[1, 2, 3].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChangeActiveDay(d)}
            className={`flex-1 rounded-xl py-2.5 text-center transition-all ${
              activeDay === d
                ? 'bg-white text-sky-600 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DÍA {d}
          </button>
        ))}
      </div>

      {/* Diagrama de Ruta Conectada */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-inner">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-xs text-sky-400">RUTA CONECTADA DEL DÍA</span>
          <span className="rounded bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
            3 Paradas optimizadas
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-slate-800/90 px-4 py-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="font-semibold">Hospedaje</span>
          </div>
          <span className="text-slate-400">━━ 12 min ━━</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            <span className="font-semibold">Centro</span>
          </div>
          <span className="text-slate-400">━━ 8 min ━━</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="font-semibold">Güemes</span>
          </div>
        </div>
      </div>

      {/* Tarjetas de Actividades */}
      <div className="space-y-3.5">
        {DAYS_DATA[activeDay]?.map((it, idx) => (
          <div
            key={idx}
            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex flex-col items-center">
              <span className="rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                {it.time}
              </span>
              {idx < 2 && <div className="my-1.5 h-12 w-0.5 bg-slate-200" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${it.catClass}`}>
                  {it.cat}
                </span>
                <span className="text-xs text-slate-400">{it.dur}</span>
              </div>
              <h4 className="mt-1 text-sm font-bold text-slate-800">{it.title}</h4>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Acciones Finales */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Botón Principal */}
        <button
          type="button"
          disabled={isSavingTrip}
          onClick={onSaveTrip}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-lg">
            {isSavingTrip ? 'hourglass_top' : 'bookmark'}
          </span>
          <span>{isSavingTrip ? 'Guardando...' : 'Guardar en Mis viajes'}</span>
        </button>

        {/* Botón Secundario */}
        <button
          type="button"
          onClick={onExploreMap}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-heading text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-lg text-slate-500">
            map
          </span>
          <span>Explorar en el mapa</span>
        </button>

        {/* Botón Reiniciar (Ahora idéntico al secundario) */}
        <button
          type="button"
          onClick={onRestart}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-heading text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-lg text-slate-500">
            restart_alt
          </span>
          <span>Reiniciar</span>
        </button>
      </div>
    </div>
  )
}
