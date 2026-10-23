interface Paso8ResumenProps {
  tripName: string
  dateFrom: string
  dateTo: string
  daysCount: number
  destinoLabel: string
  radiusKm: number
  interests: string[]
  rhythm: string
  onEditStep: (step: number) => void
  onGenerate: () => void
}

export function Paso8Resumen({
  tripName,
  dateFrom,
  dateTo,
  daysCount,
  destinoLabel,
  radiusKm,
  interests,
  rhythm,
  onEditStep,
  onGenerate,
}: Paso8ResumenProps) {
  return (
    <div className="flex min-h-[500px] w-full flex-col justify-between">
      <div>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2.5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner">
          <span className="material-symbols-outlined fill text-3xl">task_alt</span>
        </div>
        <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
          ¡Listo! Tenemos tu aventura preparada
        </h2>
        </div>

      {/* Grid 2 columnas en desktop */}
      <div className="grid grid-cols-1 gap-3.5 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
        {/* Row 1: Nombre */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-sky-600">luggage</span>
            <div>
              <span className="block text-[10px] font-semibold uppercase text-slate-400">Viaje</span>
              <span className="text-sm font-bold text-slate-800">{tripName}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>

        {/* Row 2: Fechas */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-sky-600">calendar_month</span>
            <div>
              <span className="block text-[10px] font-semibold uppercase text-slate-400">Fechas</span>
              <span className="text-sm font-bold text-slate-800">
                {dateFrom} al {dateTo} ({daysCount} días)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>

        {/* Row 3: Zona de destino */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-sky-600">travel_explore</span>
            <div>
              <span className="block text-[10px] font-semibold uppercase text-slate-400">Zona de destino</span>
              <span className="text-sm font-bold text-slate-800">{destinoLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(4)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>

        {/* Row 4: Radio */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-sky-600">radar</span>
            <div>
              <span className="block text-[10px] font-semibold uppercase text-slate-400">Radio</span>
              <span className="text-sm font-bold text-slate-800">Hasta {radiusKm} km a la redonda</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(5)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>

        {/* Row 5: Intereses */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-sky-600">favorite</span>
            <div>
              <span className="block text-[10px] font-semibold uppercase text-slate-400">Intereses</span>
              <span className="text-sm font-bold text-slate-800">{interests.join(', ')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(6)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>

        {/* Row 6: Ritmo */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-sky-600">speed</span>
            <div>
              <span className="block text-[10px] font-semibold uppercase text-slate-400">Ritmo</span>
              <span className="text-sm font-bold text-slate-800">{rhythm}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(7)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>
      </div>
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={onGenerate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-amber-500 px-8 py-4 font-heading text-lg font-bold text-white shadow-xl shadow-sky-500/25 transition-all hover:opacity-95 active:scale-[0.98]"
        >
          <span>Generar mi circuito</span>
        </button>
        <p className="mt-2 text-center text-xs text-slate-400">
          Personalizado con motor turístico de Viajesazo
        </p>
      </div>
    </div>
  )
}
