import { GUIA_AVATAR } from './constants'

interface GuiaCalloutProps {
  message: string
}

export function GuiaCallout({ message }: GuiaCalloutProps) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-2.5">
      <img
        alt="Guía de Córdoba"
        className="h-9 w-9 flex-shrink-0 rounded-full border border-sky-200 object-cover"
        src={GUIA_AVATAR}
      />
      <div>
        <span className="block text-xs font-bold text-sky-800">Guía de Córdoba</span>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  )
}
