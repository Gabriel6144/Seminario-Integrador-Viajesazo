import type { ResumenDiaCircuito } from '@/types/api'

interface AvisoDiaIncompletoProps {
  resumen: ResumenDiaCircuito | null | undefined
  /** Si false (planificador), solo texto, sin CTAs. */
  interactivo?: boolean
  onVerSugerencias?: () => void
  onDejarloAsi?: () => void
  descartando?: boolean
}

/**
 * Aviso de día incompleto. En la consulta, con `puedeCompletar`, ofrece completar
 * con sugerencias o "Dejarlo así". En el planificador solo informa.
 */
export function AvisoDiaIncompleto({
  resumen,
  interactivo = false,
  onVerSugerencias,
  onDejarloAsi,
  descartando = false,
}: AvisoDiaIncompletoProps) {
  if (!resumen) return null

  if (!resumen.pendiente && resumen.agregadasPorUsuario > 0) {
    return (
      <p className="mt-3 text-xs font-medium text-slate-500">
        Completaste este día con sugerencias
      </p>
    )
  }

  if (!resumen.pendiente) return null

  const mensaje =
    resumen.mensaje ??
    'Este día quedó con menos paradas de las pedidas. La generación no rellena sola.'

  if (!interactivo) {
    return (
      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/70 p-4">
        <span className="material-symbols-outlined mt-0.5 text-sky-700">info</span>
        <p className="text-xs leading-relaxed text-sky-900 sm:text-sm">{mensaje}</p>
      </div>
    )
  }

  if (!resumen.puedeCompletar) return null

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/70 p-4">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined mt-0.5 text-sky-700">info</span>
        <p className="text-xs leading-relaxed text-sky-900 sm:text-sm">{mensaje}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onVerSugerencias}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#00658d] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#004f70]"
        >
          Ver sugerencias para completar
        </button>
        <button
          type="button"
          onClick={onDejarloAsi}
          disabled={descartando}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {descartando ? 'Guardando…' : 'Dejarlo así'}
        </button>
      </div>
    </div>
  )
}
