interface CircuitoGuardadoModalProps {
  circuitoTitle: string
  onClose: () => void
  onGoToTrips: () => void
  onRestart?: () => void
}

/** Modal de éxito al confirmar una alternativa (mismo copy/UX que CircuitoDetalleView). */
export function CircuitoGuardadoModal({
  circuitoTitle,
  onClose,
  onGoToTrips,
  onRestart,
}: CircuitoGuardadoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-[#00658d] ring-8 ring-sky-50/60">
          <span className="material-symbols-outlined text-[36px]">task_alt</span>
        </div>
        <h3 className="font-heading text-xl font-bold text-slate-800">
          ¡Circuito guardado con éxito!
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
          Elegiste <strong>&quot;{circuitoTitle}&quot;</strong> para tu viaje. Ya podés
          encontrarlo en Mis viajes.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onGoToTrips}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00658d] py-3 text-xs font-semibold text-white shadow-md hover:bg-[#004f70] sm:text-sm"
          >
            <span className="material-symbols-outlined text-[20px]">luggage</span>
            <span>Ver en Mis viajes</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onRestart?.()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
          >
            <span className="material-symbols-outlined text-[20px] text-[#00658d]">explore</span>
            <span>Volver al Planificador</span>
          </button>
        </div>
      </div>
    </div>
  )
}
