interface PlanificadorExitModalProps {
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSaveDraft: () => void
  onDiscard: () => void
}

export function PlanificadorExitModal({
  isOpen,
  isSaving,
  onClose,
  onSaveDraft,
  onDiscard,
}: PlanificadorExitModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl transition-all">
        <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-600 shadow-inner">
          <span className="material-symbols-outlined text-3xl">bookmark_add</span>
        </div>
        <h3 className="font-heading text-lg font-bold text-slate-800">
          ¿Querés guardar tu aventura?
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          Podés guardar tu planificación como borrador y continuarla en cualquier momento.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isSaving}
            onClick={onSaveDraft}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base">
              {isSaving ? 'hourglass_top' : 'bookmark'}
            </span>
            <span>{isSaving ? 'Guardando...' : 'Guardar como borrador'}</span>
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
          >
            Salir sin guardar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 transition-all hover:text-slate-800"
          >
            Seguir planificando
          </button>
        </div>
      </div>
    </div>
  )
}

