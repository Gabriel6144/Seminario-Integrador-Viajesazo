import { ASISTENTE_AVATAR } from './constants'

interface Paso1BienvenidaProps {
  onStart: () => void
}

export function Paso1Bienvenida({ onStart }: Paso1BienvenidaProps) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="relative mb-6 flex h-44 w-44 items-center justify-center">
        <div className="animate-ripple absolute inset-0 rounded-full bg-sky-200/50" />
        <div className="animate-gentle-pulse relative z-10 h-36 w-36 overflow-hidden rounded-full border-4 border-sky-300 bg-white p-1.5 shadow-xl">
          <img
            alt="Guía de Córdoba"
            className="h-full w-full rounded-full object-cover"
            src={ASISTENTE_AVATAR}
          />
        </div>
        <span className="absolute bottom-2 right-4 z-20 flex items-center justify-center rounded-full bg-amber-400 p-2 text-sm text-white shadow-md">
          👋
        </span>
      </div>

      <h1 className="font-heading mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        ¡Córdoba te espera!
      </h1>

      <p className="max-w-md px-2 text-base leading-relaxed text-slate-600 sm:text-lg">
        ¿Preparado para descubrirla a tu manera? Te acompaño paso a paso a organizar una experiencia inolvidable adaptada a tus gustos y tiempos.
      </p>

      <div className="mt-8 w-full max-w-sm">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-sky-500 px-8 py-4 font-heading text-base font-bold text-white shadow-lg shadow-sky-500/30 transition-all hover:from-sky-700 hover:to-sky-600 active:scale-[0.98]"
          onClick={onStart}
        >
          <span>Empecemos</span>
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
