import { Link } from 'react-router-dom'

import { CategoriaBadge } from '@/components/categoria-badge'
import { formatDateRange, formatTimeRange } from '@/lib/dates'
import type { EventoResponse } from '@/types/api'

/**
 * Tarjeta de evento con hero image para las grillas de listado.
 *
 * Diseño según prototipo Stitch: imagen de fondo con gradiente overlay,
 * badges de estado y categoría sobre la imagen, y metadata en el body.
 * Si el evento no tiene imagen, se muestra un placeholder con gradiente.
 */
export function EventoCard({ evento }: { evento: EventoResponse }) {
  const horario = formatTimeRange(evento.horarioInicio, evento.horarioFin)
  const imagen = evento.imagenes[0]

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)]">
      {/* Hero image con overlay */}
      <div className="relative h-52 w-full overflow-hidden bg-[#d8dadc]">
        {imagen ? (
          <img
            src={imagen}
            alt={`Imagen de ${evento.nombre}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#00658d] to-[#65b7e8]">
            <svg className="h-16 w-16 text-white/30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Badges sobre la imagen */}
        <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#df2a29] px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            Publicado
          </span>
          <span className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-[#7a5900] backdrop-blur-sm">
            {evento.categoria ? (
              <CategoriaBadge categoria={evento.categoria} />
            ) : (
              'Sin categoría'
            )}
          </span>
        </div>

        {/* Título sobre la imagen */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <span className="block text-xs font-medium uppercase tracking-wider text-white/80">
            {evento.localidad ?? 'Córdoba'}
          </span>
          <h3 className="font-heading text-lg font-bold leading-tight drop-shadow-sm">
            <Link
              to={`/eventos/${evento.id}`}
              className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
            >
              {evento.nombre}
            </Link>
          </h3>
        </div>
      </div>

      {/* Body con metadata */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-[#3f484e]">
            <svg className="h-4 w-4 text-[#7a5900]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="font-medium text-[#191c1e]">
              {formatDateRange(evento.fechaInicio, evento.fechaFin)}
            </span>
          </div>

          {horario !== null && (
            <div className="flex items-center gap-2 text-sm text-[#3f484e]">
              <svg className="h-4 w-4 text-[#7a5900]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{horario}</span>
            </div>
          )}

          {evento.localidad !== null && (
            <div className="flex items-center gap-2 text-sm text-[#3f484e]">
              <svg className="h-4 w-4 text-[#bb0413]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{evento.localidad}</span>
            </div>
          )}

          {evento.descripcion !== null && (
            <p className="line-clamp-2 text-sm text-[#3f484e]">
              {evento.descripcion}
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#e0e3e5] pt-3">
          <Link
            to={`/eventos/${evento.id}`}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#f2f4f6] px-2 py-2 text-sm font-medium text-[#191c1e] transition-colors hover:bg-[#e0e3e5]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="hidden sm:inline">Detalle</span>
          </Link>
          <Link
            to={`/eventos/${evento.id}/editar`}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#f2f4f6] px-2 py-2 text-sm font-medium text-[#191c1e] transition-colors hover:bg-[#e0e3e5]"
          >
            <svg className="h-4 w-4 text-[#bb0413]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Editar</span>
          </Link>
          <Link
            to={`/eventos/${evento.id}`}
            className="inline-flex items-center justify-center rounded-lg p-2 text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/40"
            title="Dar de baja"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  )
}
