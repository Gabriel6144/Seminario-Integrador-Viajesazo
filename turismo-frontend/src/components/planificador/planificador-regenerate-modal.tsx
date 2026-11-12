interface PlanificadorRegenerateModalProps {
  isOpen: boolean
  isRegenerating: boolean
  onClose: () => void
  onConfirm: () => void
}

export function PlanificadorRegenerateModal({
  isOpen,
  isRegenerating,
  onClose,
  onConfirm,
}: PlanificadorRegenerateModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl transition-all">
        <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner">
          <span className="material-symbols-outlined text-3xl">refresh</span>
        </div>
        <h3 className="font-heading text-lg font-bold text-slate-800">
          ¿Regenerar el circuito?
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          Se descartan las alternativas actuales y cualquier reemplazo manual que hayas hecho.
          Si ya elegiste una estrategia, intentaremos conservarla.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isRegenerating}
            onClick={onConfirm}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base">
              {isRegenerating ? 'hourglass_top' : 'refresh'}
            </span>
            <span>{isRegenerating ? 'Regenerando...' : 'Regenerar circuito'}</span>
          </button>
          <button
            type="button"
            disabled={isRegenerating}
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
