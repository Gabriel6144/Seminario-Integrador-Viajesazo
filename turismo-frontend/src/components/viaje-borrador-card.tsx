import { Link } from 'react-router-dom'

import type { ViajeResponse } from '@/types/api'

interface Props {
  borrador: ViajeResponse
  onDescartar: (id: number) => void
  descartando: boolean
}

export function ViajeBorradorCard({ borrador, onDescartar, descartando }: Props) {
  const confirmado = borrador.estado !== 'BORRADOR'
  const paso = borrador.pasoActual ?? 0
  const progreso = Math.min(100, Math.max(0, Math.round((paso / 8) * 100)))

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm ${
        confirmado ? 'border-emerald-200' : 'border-amber-200'
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-slate-800">
            {borrador.nombre ?? 'Borrador sin nombre'}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            confirmado
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {confirmado ? 'Circuito confirmado' : `Borrador · Paso ${borrador.pasoActual ?? '?'} de 8`}
        </span>
      </header>

      {confirmado ? (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          <span className="material-symbols-outlined text-[20px]">verified</span>
          <span>Tu itinerario está listo. ¡Buen viaje!</span>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Progreso de armado</span>
            <span className="font-bold text-amber-700">
              Paso {borrador.pasoActual ?? '?'} / 8 ({progreso}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 text-sm text-slate-600">
        {borrador.fechaInicio && borrador.fechaFin ? (
          <p className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">date_range</span>
            {borrador.fechaInicio} al {borrador.fechaFin}
          </p>
        ) : (
          <p className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            Fechas a definir
          </p>
        )}
        {borrador.ubicacion ? (
          <p className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">travel_explore</span>
            Zona de destino: {borrador.ubicacion.nombre}
          </p>
        ) : (
          <p className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">location_on</span>
            Zona a definir
          </p>
        )}
        {borrador.rangoInteresKm !== null && borrador.rangoInteresKm !== undefined ? (
          <p>Radio: {borrador.rangoInteresKm} km</p>
        ) : null}
        {borrador.ritmo ? <p>Ritmo: {borrador.ritmo}</p> : null}
        {borrador.interesesCategoria.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {borrador.interesesCategoria.map((interes) => (
              <span key={interes} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {interes}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {confirmado ? (
        <div className="mt-auto rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-center text-xs font-semibold text-emerald-800">
          Circuito elegido y guardado
        </div>
      ) : (
      <footer className="mt-auto flex flex-wrap gap-2 pt-3">
        <Link
          to={`/planificar?borrador=${borrador.id}`}
          className="w-full rounded-xl bg-sky-600 px-4 py-3 text-center text-xs font-bold text-white transition hover:bg-sky-700"
        >
          Continuar planificación →
        </Link>
        <button
          type="button"
          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50 hover:border-red-300 hover:text-red-600"
          onClick={() => onDescartar(borrador.id)}
          disabled={descartando}
        >
          {descartando ? 'Descartando...' : 'Descartar borrador'}
        </button>
      </footer>
      )}
    </article>
  )
}