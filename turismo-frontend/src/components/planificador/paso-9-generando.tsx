import { GUIA_AVATAR } from './constants'
import type { LoadingStep } from './types'

interface Paso9GenerandoProps {
  loadingStep: LoadingStep
}

export function Paso9Generando({ loadingStep }: Paso9GenerandoProps) {
  return (
    <div className="flex min-h-[500px] w-full flex-col items-center justify-center py-8 text-center">
      <div className="relative mb-6 h-40 w-40">
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-dashed border-sky-400"
          style={{ animationDuration: '9s' }}
        />
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-white p-2 shadow-2xl">
          <img
            alt="Asistente Buscando"
            className="animate-gentle-pulse h-28 w-28 rounded-full object-cover"
            src={GUIA_AVATAR}
          />
        </div>
      </div>

      <div className="max-w-md space-y-2.5">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3.5 py-1 text-xs font-bold text-sky-800">
          <span className="h-2 w-2 animate-ping rounded-full bg-sky-500" />
          <span>Procesando itinerario</span>
        </div>
        <h3 className="font-heading text-xl font-bold text-slate-800 transition-all duration-300 sm:text-2xl">
          {loadingStep.title}
        </h3>
        <p className="text-sm leading-relaxed text-slate-500">
          {loadingStep.sub}
        </p>
      </div>

      <div className="mt-8 h-2.5 w-64 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-sky-600 transition-all duration-500"
          style={{ width: `${loadingStep.bar || 30}%` }}
        />
      </div>
    </div>
  )
}
