import { formatWeekdayAndDate } from '@/lib/dates'
import { linkComoLlegar, type PuntoGoogleMaps } from '@/lib/google-maps'
import type { ParadaCircuitoDetalle } from './types'
import { CircuitoParadaCarrusel } from './circuito-parada-carrusel'

interface CircuitoParadaCardProps {
  stop: ParadaCircuitoDetalle
  index: number
  total: number
  isLast: boolean
  onDetails: (stop: ParadaCircuitoDetalle) => void
  /** Si faltan, no se muestran Sustituir/Eliminar (por ejemplo, con una alternativa ya elegida). */
  onReplace?: (stop: ParadaCircuitoDetalle) => void
  onDelete?: (stop: ParadaCircuitoDetalle) => void
  /** Parada anterior del día (para el link “desde la parada anterior”). */
  previousStop?: ParadaCircuitoDetalle | null
}

function capitalizeDate(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function toPunto(stop: ParadaCircuitoDetalle): PuntoGoogleMaps {
  return {
    latitud: stop.latitud,
    longitud: stop.longitud,
    direccionTexto: stop.location,
  }
}

const linkClassName =
  'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#bae6fd] bg-[#f0f9ff] px-3 py-2 text-xs font-semibold text-[#00658d] transition-colors hover:bg-sky-100 active:scale-[0.99]'

export function CircuitoParadaCard({
  stop,
  index,
  total,
  isLast,
  onDetails,
  onReplace,
  onDelete,
  previousStop = null,
}: CircuitoParadaCardProps) {
  const isFirst = index === 0
  const tipoBadge =
    stop.tipo === 'EVENTO'
      ? 'bg-rose-100 text-rose-700'
      : 'bg-[#eaf6fc] text-[#00658d]'
  const tipoLabel = stop.tipo === 'EVENTO' ? 'Evento' : 'Actividad'

  const mapsHref = isFirst
    ? linkComoLlegar(toPunto(stop))
    : previousStop
      ? linkComoLlegar(toPunto(stop), toPunto(previousStop))
      : linkComoLlegar(toPunto(stop))

  const mapsLabel = isFirst
    ? 'Cómo llegar desde mi ubicación'
    : 'Cómo llegar desde la parada anterior'
  const mapsAria = `Cómo llegar a ${stop.title} en Google Maps, se abre en otra pestaña`

  return (
    <article
      data-parada-index={index}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4"
    >
      {/* La foto ocupa el espacio libre: el resto de la tarjeta entra siempre completo, sin
          scroll interno, para que la ruedita pase directo a la parada siguiente. */}
      <div className="relative min-h-[140px] flex-1">
        <CircuitoParadaCarrusel
          images={stop.images}
          alt={stop.title}
          stopNumber={stop.number}
          heightClass="h-full"
        />
        <span
          className={`absolute bottom-3 left-3 z-10 rounded-md px-2.5 py-0.5 text-xs font-semibold shadow-sm ${tipoBadge}`}
        >
          {tipoLabel}
        </span>
        {!stop.disponible && (
          <span className="absolute top-3 right-14 z-10 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
            No disponible
          </span>
        )}
      </div>

      <div className="mt-3 flex shrink-0 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className="font-heading line-clamp-2 text-lg font-bold leading-snug text-slate-800"
            title={stop.title}
          >
            {stop.title}
          </h3>
          {stop.origen === 'SUGERENCIA_ACEPTADA' && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
              Agregada por vos
            </span>
          )}
          {isFirst && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#00658d]">
              <span className="material-symbols-outlined text-[14px]">flag</span>
              Punto de partida
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Fecha
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-800">
              {capitalizeDate(formatWeekdayAndDate(stop.fecha))}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Inicio
            </p>
            <p className="mt-0.5 text-xs font-semibold text-[#00658d]">
              {stop.horaInicio ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Fin
            </p>
            <p className="mt-0.5 text-xs font-semibold text-[#00658d]">
              {stop.horaFin ?? '—'}
            </p>
          </div>
        </div>

        <p className="line-clamp-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
          {stop.description}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
          <span className="flex min-w-0 items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-[#00658d]">
              location_on
            </span>
            <span className="line-clamp-1">{stop.location}</span>
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="material-symbols-outlined text-[15px]">payments</span>
            {stop.price}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="material-symbols-outlined text-[15px]">schedule</span>
            {stop.duration}
          </span>
        </div>

        {!stop.disponible && stop.motivoNoDisponible && (
          <p className="line-clamp-2 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
            {stop.motivoNoDisponible}
          </p>
        )}

        <div className={`grid gap-2 ${mapsHref ? 'grid-cols-[auto_1fr]' : 'grid-cols-1'}`}>
          <button
            type="button"
            onClick={() => onDetails(stop)}
            className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>Detalles</span>
          </button>
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={mapsAria}
              className={linkClassName}
            >
              <span className="material-symbols-outlined text-[18px]">directions</span>
              <span>{mapsLabel}</span>
            </a>
          )}
        </div>

        {onReplace && onDelete && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-label={`Sustituir ${stop.title}`}
              onClick={() => onReplace(stop)}
              className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-sky-200 bg-sky-50 text-xs font-semibold text-[#00658d] transition-colors hover:bg-sky-100 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
              <span>Sustituir</span>
            </button>
            <button
              type="button"
              aria-label={`Eliminar ${stop.title}`}
              onClick={() => onDelete(stop)}
              className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span>Eliminar</span>
            </button>
          </div>
        )}

        <div className="border-t border-slate-100 pt-2 text-center">
          {isLast ? (
            <p className="text-xs font-semibold text-slate-500">Fin del día</p>
          ) : (
            <p className="flex items-center justify-center gap-1 text-xs font-medium text-slate-500">
              <span>Scrolleá para ver la siguiente</span>
              <span className="material-symbols-outlined animate-bounce text-[18px] text-[#00658d]">
                keyboard_arrow_down
              </span>
            </p>
          )}
          <p className="sr-only">
            Parada {index + 1} de {total}
          </p>
        </div>
      </div>
    </article>
  )
}
