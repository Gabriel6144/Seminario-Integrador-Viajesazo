import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon, HeartIcon } from 'lucide-react'
import { toast } from 'sonner'

import { useDarMeGusta, useMeGusta, useQuitarMeGusta } from '@/api/me-gustas'
import { useAuth } from '@/components/auth-provider'
import { formatDateRange, formatTimeRange } from '@/lib/dates'
import { toUserMessage } from '@/lib/http'
import {
  CATEGORIA_LABELS,
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
  placeholder = false,
}: {
  categoria: Categoria
  gradiente: string
  propuestas: PropuestaResumenResponse[]
  cargando: boolean
  error: boolean
  onReintentar: () => void
  /** Sección todavía no activada por el scroll: pintamos un esqueleto estático. */
  placeholder?: boolean
}) {
  const [inicio, setInicio] = useState(0)
  const total = propuestas.length
  const desde = Math.min(inicio, Math.max(0, total - TAMANO_VENTANA))
  const visibles = propuestas.slice(desde, desde + TAMANO_VENTANA)
  const hayAnteriores = desde > 0
  const haySiguientes = desde + TAMANO_VENTANA < total
  const [destacada, ...resto] = visibles

  return (
    <section className="w-full min-w-0" aria-label="Propuestas de la categoría">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#696E79]">
          {total > 0
            ? `${total} propuestas en ${CATEGORIA_LABELS[categoria].toLowerCase()}`
            : 'Propuestas'}
        </p>

        {total > TAMANO_VENTANA ? (
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-semibold tabular-nums text-[#696E79]">
              {desde + 1}–{Math.min(desde + TAMANO_VENTANA, total)} de {total}
            </span>
            <button
              type="button"
              aria-label="Tarjetas anteriores"
              title="Tarjetas anteriores"
              disabled={!hayAnteriores}
              onClick={() => setInicio((prev) => Math.max(0, prev - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#111215] transition-all hover:bg-neutral-200/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeftIcon className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Tarjetas siguientes"
              title="Tarjetas siguientes"
              disabled={!haySiguientes}
              onClick={() =>
                setInicio((prev) => Math.min(prev + 1, Math.max(0, total - TAMANO_VENTANA)))
              }
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#111215] transition-all hover:bg-neutral-200/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRightIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {placeholder ? <MosaicoPendiente /> : null}

      {!placeholder && cargando ? <MosaicoCargando /> : null}

      {!placeholder && !cargando && error ? (
        <EstadoMosaico>
          <p className="text-sm text-[#696E79]">
            No pudimos cargar las propuestas de esta categoría.
          </p>
          <button
            type="button"
            onClick={onReintentar}
            className="mt-4 rounded-full bg-[#111215] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#111215]/80"
          >
            Reintentar
          </button>
        </EstadoMosaico>
      ) : null}

      {!placeholder && !cargando && !error && total === 0 ? (
        <EstadoMosaico>
          <p className="text-sm text-[#696E79]">
            Todavía no hay propuestas cargadas en {CATEGORIA_LABELS[categoria].toLowerCase()}.
          </p>
        </EstadoMosaico>
      ) : null}

      {!placeholder && !cargando && !error && destacada ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-5 lg:h-[clamp(360px,calc(100dvh-220px),520px)]">
          <TarjetaDescubrir
            key={`${destacada.tipo ?? 'EVENTO'}-${destacada.id}`}
            propuesta={destacada}
            gradiente={gradiente}
            numero={desde + 1}
            grande
            className={`col-span-2 ${resto.length === 0 ? 'md:col-span-12' : 'md:col-span-7'}`}
          />

          {resto.length > 0 ? (
            <div className="col-span-2 grid grid-cols-2 gap-3 md:col-span-5 md:flex md:flex-col md:gap-5">
              {resto.map((propuesta, indice) => (
                <TarjetaDescubrir
                  key={`${propuesta.tipo ?? 'EVENTO'}-${propuesta.id}`}
                  propuesta={propuesta}
                  gradiente={gradiente}
                  numero={desde + indice + 2}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function TarjetaDescubrir({
  propuesta,
  gradiente,
  numero,
  grande = false,
  className,
}: {
  propuesta: PropuestaResumenResponse
  gradiente: string
  numero: number
  grande?: boolean
  className?: string
}) {
  const esActividad = propuesta.tipo === 'ACTIVIDAD'
  const detallePath = esActividad
    ? `/actividades/${propuesta.id}`
    : `/eventos/${propuesta.id}`
  const imagen = propuesta.imagenes[0]
  const horario = formatTimeRange(propuesta.horarioInicio, propuesta.horarioFin)
  const tieneFechas = propuesta.fechaInicio !== null && propuesta.fechaFin !== null
  const fechaTexto = esActividad
    ? propuesta.duracionMinutos != null
      ? `${propuesta.duracionMinutos} min`
      : null
    : tieneFechas
      ? formatDateRange(propuesta.fechaInicio!, propuesta.fechaFin!)
      : null
  const detalle = [fechaTexto, horario].filter(Boolean).join(', ')
  const numeroTexto = String(numero).padStart(2, '0')

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-black/5 bg-neutral-900 shadow-lg shadow-black/5 transition-all duration-300 ${
        grande
          ? 'h-[clamp(150px,26vh,220px)] md:h-[420px] lg:h-full'
          : 'h-[clamp(110px,16vh,150px)] md:h-[200px] lg:h-auto lg:flex-1'
      } ${className ?? ''}`}
    >
      <Link
        to={detallePath}
        aria-label={`Ver detalle de ${propuesta.nombre}`}
        className="absolute inset-0 z-10 rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-white"
      />

      {imagen ? (
        <img
          src={imagen}
          alt={`Imagen de ${propuesta.nombre}`}
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ background: gradiente }}
        >
          <svg
            className="h-16 w-16 text-white/25"
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

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />

      <div className="absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-2 md:left-4 md:right-4 md:top-4">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
            {esActividad ? 'Actividad' : 'Evento'}
          </span>
          {propuesta.categoria ? (
            <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
              {CATEGORIA_LABELS[propuesta.categoria]}
            </span>
          ) : null}
        </div>
        <div className="relative z-20">
          <GuardarPropuesta propuestaId={propuesta.id} />
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 z-20 ${grande ? 'p-6 md:p-8' : 'p-3 md:p-4'}`}>
        <h3
          className={`font-syne font-bold uppercase tracking-wider text-white ${
            grande
              ? 'mb-1 text-lg leading-tight md:text-xl'
              : 'mb-0.5 text-sm leading-snug md:text-base'
          }`}
        >
          <span>{numeroTexto}. </span>
          {propuesta.nombre}
        </h3>
        <p
          className={`font-light tracking-wide text-neutral-300 ${
            grande ? 'text-xs' : 'text-[11px]'
          }`}
        >
          {detalle || propuesta.localidad || 'Córdoba'}
        </p>
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

function EstadoMosaico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm">
      {children}
    </div>
  )
}

function MosaicoCargando() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-5 lg:h-[clamp(360px,calc(100dvh-220px),520px)]"
    >
      <div className="col-span-2 h-[clamp(150px,26vh,220px)] animate-pulse rounded-3xl bg-neutral-200 md:col-span-7 md:h-[420px] lg:h-full" />
      <div className="col-span-2 grid grid-cols-2 gap-3 md:col-span-5 md:flex md:flex-col md:gap-5">
        <div className="h-[clamp(110px,16vh,150px)] animate-pulse rounded-3xl bg-neutral-200 md:h-[200px] lg:h-auto lg:flex-1" />
        <div className="h-[clamp(110px,16vh,150px)] animate-pulse rounded-3xl bg-neutral-200 md:h-[200px] lg:h-auto lg:flex-1" />
      </div>
    </div>
  )
}

/** Esqueleto sin animación para secciones que todavía no se activaron con el scroll. */
function MosaicoPendiente() {
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-5 lg:h-[clamp(360px,calc(100dvh-220px),520px)]"
      aria-hidden
    >
      <div className="col-span-2 h-[clamp(150px,26vh,220px)] rounded-3xl bg-neutral-200/60 md:col-span-7 md:h-[420px] lg:h-full" />
      <div className="col-span-2 grid grid-cols-2 gap-3 md:col-span-5 md:flex md:flex-col md:gap-5">
        <div className="h-[clamp(110px,16vh,150px)] rounded-3xl bg-neutral-200/60 md:h-[200px] lg:h-auto lg:flex-1" />
        <div className="h-[clamp(110px,16vh,150px)] rounded-3xl bg-neutral-200/60 md:h-[200px] lg:h-auto lg:flex-1" />
      </div>
    </div>
  )
}
