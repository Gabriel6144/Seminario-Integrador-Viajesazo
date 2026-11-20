import type { ParadaCircuitoDetalle } from './types'

interface CircuitoParadaDetalleModalProps {
  stop: ParadaCircuitoDetalle
  onClose: () => void
  onOpenMap: (stop: ParadaCircuitoDetalle) => void
}

export function CircuitoParadaDetalleModal({
  stop,
  onClose,
  onOpenMap,
}: CircuitoParadaDetalleModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-heading pr-4 text-lg font-bold text-slate-800">{stop.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="space-y-3 py-4 text-xs sm:text-sm">
          <p className="leading-relaxed text-slate-600">{stop.detailDescription}</p>
          <div className="flex items-center gap-2 text-slate-800">
            <span className="material-symbols-outlined text-[18px] text-[#00658d]">
              location_on
            </span>
            <span className="font-medium">{stop.location}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-800">
            <span className="material-symbols-outlined text-[18px] text-[#00658d]">
              schedule
            </span>
            <span className="font-medium">
              {stop.hours} · {stop.duration}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-800">
            <span className="material-symbols-outlined text-[18px] text-[#00658d]">
              payments
            </span>
            <span className="font-medium">{stop.price}</span>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenMap(stop)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00658d] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#004f70]"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            <span>Ver en mapa</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
