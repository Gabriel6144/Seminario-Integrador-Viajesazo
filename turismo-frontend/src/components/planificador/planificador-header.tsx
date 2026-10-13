interface PlanificadorHeaderProps {
  step: number
  onBack: () => void
  onClose: () => void
}

export function PlanificadorHeader({ step, onBack, onClose }: PlanificadorHeaderProps) {
  if (step > 8) return null

  const progressPercent = Math.min(100, Math.round((step / 8) * 100))

  return (
    <header className="w-full">
      <div className="flex items-center gap-3 w-full">
        {step > 1 ? (
          <button
            type="button"
            aria-label="Atrás"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 active:scale-95 md:h-9 md:w-9"
            onClick={onBack}
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
        ) : (
          <div className="h-8 w-8 flex-shrink-0 md:h-9 md:w-9" />
        )}

        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
            <span className="font-semibold text-sky-800">Paso {step} de 8</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-600 to-amber-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {step > 1 ? (
          <button
            type="button"
            aria-label="Cerrar"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-90 md:h-9 md:w-9"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        ) : (
          <div className="h-8 w-8 flex-shrink-0 md:h-9 md:w-9" />
        )}
      </div>
    </header>
  )
}
