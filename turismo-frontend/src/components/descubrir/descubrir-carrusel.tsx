import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon, HeartIcon } from 'lucide-react'
import { toast } from 'sonner'

import { useDarMeGusta, useMeGusta, useQuitarMeGusta } from '@/api/me-gustas'
import { useAuth } from '@/components/auth-provider'
import { CategoriaBadge } from '@/components/categoria-badge'
import { formatDateRange, formatTimeRange } from '@/lib/dates'
import { toUserMessage } from '@/lib/http'
import {
  CATEGORIA_LABELS,
  TIPO_ACCESO_LABELS,
  type Categoria,
  type PropuestaResumenResponse,
} from '@/types/api'

const TAMANO_VENTANA = 3

export function DescubrirCarrusel({
  categoria,
  gradiente,
  propuestas,
  cargando,
  error,
  onReintentar,
}: {
  categoria: Categoria
  gradiente: string
  propuestas: PropuestaResumenResponse[]
  cargando: boolean
  error: boolean
  onReintentar: () => void
}) {
  const [inicio, setInicio] = useState(0)
  const total = propuestas.length
  const desde = Math.min(inicio, Math.max(0, total - TAMANO_VENTANA))
  const visibles = propuestas.slice(desde, desde + TAMANO_VENTANA)
  const hayAnteriores = desde > 0
  const haySiguientes = desde + TAMANO_VENTANA < total

  return (
    <section className="w-full min-w-0" aria-label="Propuestas de la categoría">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#3f484e]">
          {total > 0 ? `${total} propuestas en ${CATEGORIA_LABELS[categoria].toLowerCase()}` : 'Propuestas'}
        </p>

        {total > TAMANO_VENTANA ? (
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs font-semibold tabular-nums text-[#70787f]">
              {desde + 1}–{Math.min(desde + TAMANO_VENTANA, total)} de {total}
            </span>
            <button
              type="button"
              aria-label="Tarjetas anteriores"
              title="Tarjetas anteriores"
              disabled={!hayAnteriores}
              onClick={() => setInicio((prev) => Math.max(0, prev - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00658d] text-white shadow-md transition hover:bg-[#005273] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Tarjetas siguientes"
              title="Tarjetas siguientes"
              disabled={!haySiguientes}
              onClick={() =>
                setInicio((prev) => Math.min(prev + 1, Math.max(0, total - TAMANO_VENTANA)))
              }
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00658d] text-white shadow-md transition hover:bg-[#005273] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRightIcon className="h-5 w-5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {cargando ? <CarruselCargando /> : null}

      {!cargando && error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#3f484e]">No pudimos cargar las propuestas de esta categoría.</p>
          <button
            type="button"
            onClick={onReintentar}
            className="mt-4 rounded-full bg-[#00658d] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#005273]"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!cargando && !error && total === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#3f484e]">
            Todavía no hay propuestas cargadas en {CATEGORIA_LABELS[categoria].toLowerCase()}.
          </p>
        </div>
      ) : null}

      {!cargando && !error && total > 0 ? (
        <div className="no-scrollbar flex snap-x snap-mandatory items-end gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-[1.7fr_1fr_1fr] lg:items-end lg:gap-5 lg:overflow-visible">
          {visibles.map((propuesta, indice) => (
            <TarjetaDescubrir
              key={`${propuesta.tipo ?? 'EVENTO'}-${propuesta.id}`}
              propuesta={propuesta}
              gradiente={gradiente}
              destacada={indice === 0}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function TarjetaDescubrir({
  propuesta,
  gradiente,
  destacada,
}: {
  propuesta: PropuestaResumenResponse
  gradiente: string
  destacada: boolean
}) {
  const esActividad = propuesta.tipo === 'ACTIVIDAD'
  const detallePath = esActividad
    ? `/actividades/${propuesta.id}`
    : `/eventos/${propuesta.id}`
  const imagen = propuesta.imagenes[0]
  const horario = formatTimeRange(propuesta.horarioInicio, propuesta.horarioFin)
  const tieneFechas = propuesta.fechaInicio !== null && propuesta.fechaFin !== null
  const tipoAcceso = propuesta.tipoAcceso
    ? TIPO_ACCESO_LABELS[propuesta.tipoAcceso]
    : null

  return (
    <article
      className={`group relative shrink-0 snap-start overflow-hidden rounded-2xl ring-1 transition-all duration-300 hover:-translate-y-1 ${
        destacada
          ? 'w-[88%] shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45)] ring-slate-300 hover:shadow-[0_36px_70px_-20px_rgba(15,23,42,0.5)] lg:w-full'
          : 'w-[70%] shadow-[0_10px_25px_rgba(15,23,42,0.10)] ring-slate-200 hover:shadow-[0_16px_35px_rgba(15,23,42,0.16)] lg:w-full'
      }`}
    >
      <Link
        to={detallePath}
        aria-label={`Ver detalle de ${propuesta.nombre}`}
        className="absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#00658d]"
      />

      <div
        className={`relative w-full overflow-hidden bg-slate-200 ${
          destacada ? 'aspect-[3/4]' : 'aspect-[4/5]'
        }`}
        style={{ background: gradiente }}
      >
        {imagen ? (
          <img
            src={imagen}
            alt={`Imagen de ${propuesta.nombre}`}
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-20 w-20 text-white/25"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/25" />

        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm ${
                esActividad ? 'bg-[#00658d]/90' : 'bg-[#df2a29]/90'
              }`}
            >
              {esActividad ? 'Actividad' : 'Evento'}
            </span>
            {propuesta.categoria ? <CategoriaBadge categoria={propuesta.categoria} /> : null}
          </div>
          <div className="relative z-20">
            <GuardarPropuesta propuestaId={propuesta.id} />
          </div>
        </div>

        <div className={`absolute bottom-0 left-0 right-0 text-white ${destacada ? 'p-5' : 'p-3.5'}`}>
          <div
            className={`mb-1.5 flex flex-wrap items-center gap-1.5 font-medium text-white/80 ${
              destacada ? 'text-xs' : 'text-[11px]'
            }`}
          >
            <span>{propuesta.localidad ?? 'Córdoba'}</span>
            {tipoAcceso ? (
              <>
                <span aria-hidden>·</span>
                <span>{tipoAcceso}</span>
              </>
            ) : null}
          </div>
          <h3
            className={`mb-1 line-clamp-2 font-heading font-bold leading-tight drop-shadow-sm ${
              destacada ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'
            }`}
          >
            {propuesta.nombre}
          </h3>
          <p className={destacada ? 'text-xs text-white/80' : 'text-[11px] text-white/80'}>
            {esActividad && propuesta.duracionMinutos != null
              ? `${propuesta.duracionMinutos} min`
              : !esActividad && tieneFechas
                ? formatDateRange(propuesta.fechaInicio!, propuesta.fechaFin!)
                : null}
            {horario ? (
              <span className="text-white/60">
                {esActividad || tieneFechas ? ' · ' : ''}
                {horario}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </article>
  )
}

function GuardarPropuesta({ propuestaId }: { propuestaId: number }) {
  const { hasRole, isAuthenticated } = useAuth()
  const esTurista =
    isAuthenticated && hasRole('TURISTA') && !hasRole('PUBLICADOR') && !hasRole('ADMINISTRADOR')
  const consulta = useMeGusta(propuestaId, esTurista)
  const dar = useDarMeGusta()
  const quitar = useQuitarMeGusta()

  if (!esTurista) {
    return (
      <Link
        to="/login"
        aria-label="Entrá para guardar"
        title="Entrá para guardar"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white backdrop-blur-md transition hover:bg-white/35"
      >
        <HeartIcon className="h-4 w-4" aria-hidden />
      </Link>
    )
  }

  const liked = consulta.data?.meGusta === true
  const pending = consulta.isPending || dar.isPending || quitar.isPending

  function alternar(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (liked) {
      quitar.mutate(propuestaId, { onError: (error) => toast.error(toUserMessage(error)) })
      return
    }
    dar.mutate(propuestaId, { onError: (error) => toast.error(toUserMessage(error)) })
  }

  return (
    <button
      type="button"
      aria-label={liked ? 'Quitar Me gusta' : 'Me gusta'}
      aria-pressed={liked}
      disabled={pending}
      onClick={alternar}
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-white backdrop-blur-md transition hover:bg-white/35 disabled:opacity-60 ${
        liked ? 'border-[#ffb4ab]/70 bg-[#ba1a1a]/80' : 'border-white/40 bg-white/20'
      }`}
    >
      <HeartIcon className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} aria-hidden />
    </button>
  )
}

function CarruselCargando() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex items-end gap-4 lg:grid lg:grid-cols-[1.7fr_1fr_1fr] lg:gap-5"
    >
      {[0, 1, 2].map((indice) => (
        <div
          key={indice}
          className={`shrink-0 animate-pulse rounded-2xl bg-slate-200 ${
            indice === 0 ? 'aspect-[3/4] w-[88%] lg:w-full' : 'aspect-[4/5] w-[70%] lg:w-full'
          }`}
        />
      ))}
    </div>
  )
}
