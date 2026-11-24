import { useState, type ReactNode } from 'react'
import {
  AccessibilityIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  CircleDollarSignIcon,
  ExternalLinkIcon,
  MapPinIcon,
  NavigationIcon,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { useEvento } from '@/api/eventos'
import { useAuth } from '@/components/auth-provider'
import { CategoriaBadge } from '@/components/categoria-badge'
import { EventoActions } from '@/components/evento-actions'
import { EventoImagen } from '@/components/evento-imagen'
import { EventoMapa } from '@/components/evento-mapa'
import { ErrorState } from '@/components/query-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateRange, formatLocalDate, formatTimeRange } from '@/lib/dates'
import { linkComoLlegar } from '@/lib/google-maps'
import { parseId } from '@/lib/parse-id'
import { cn } from '@/lib/utils'
import {
  ESTADO_PROPUESTA_LABELS,
  MODALIDAD_LABELS,
  TIPO_ACCESO_LABELS,
  TIPO_PROPUESTA_LABELS,
  type EstadoPropuesta,
  type EstadoPropuestaObj,
  type EventoResponse,
} from '@/types/api'

const ESTADO_DOT_COLORS: Record<EstadoPropuesta, string> = {
  INICIADO: 'bg-emerald-400',
  REPROGRAMADO: 'bg-amber-400',
  CANCELADO: 'bg-rose-400',
  FINALIZADO: 'bg-slate-400',
}

/** Detalle de un evento — `GET /api/eventos/{id}`. */
export function EventoDetailPage() {
  const { id: rawId } = useParams()
  const id = parseId(rawId)
  const query = useEvento(id)

  // Un id no numérico nunca llega al backend: pedírlo devolvería 500 en vez de 400.
  if (id === null) return <IdInvalido />

  if (query.isPending) return <DetalleSkeleton />

  if (query.isError) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 pt-6 md:px-8">
        <Volver />
        <ErrorState error={query.error} />
      </div>
    )
  }

  const evento = query.data
  const horario = formatTimeRange(evento.horarioInicio, evento.horarioFin)
  const adicionales = evento.imagenes.slice(1)

  return (
    <article className="flex w-full flex-col bg-[#f7f9fb]">
      <HeroEvento evento={evento} />
      <FranjaDatos evento={evento} horario={horario} />

      <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14">
          <section className="flex flex-col gap-8">
            <div>
              <h2 className="font-heading text-2xl font-bold text-[#191c1e]">Sobre el evento</h2>
              {evento.descripcion !== null ? (
                <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#3f484e]">
                  {evento.descripcion}
                </p>
              ) : (
                <p className="mt-4 text-[#3f484e]">Este evento todavía no tiene una descripción.</p>
              )}
            </div>

            <Pildoras evento={evento} />

            <p className="text-sm text-[#3f484e]">Publicado por {evento.publicadorNombre}</p>

            {adicionales.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="font-heading text-xl font-bold text-[#191c1e]">Galería</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {adicionales.map((url) => (
                    <li key={url}>
                      <EventoImagen
                        src={url}
                        alt={`Imagen de ${evento.nombre}`}
                        className="aspect-[4/3] w-full"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <BloqueUbicacion evento={evento} />
        </div>

        <footer className="mt-12 flex flex-col gap-4 border-t border-[#e0e3e5] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-[#3f484e]">
            {formatLocalDate(evento.fechaInicio)} · evento #{evento.id} ·{' '}
            {estadoLabel(evento.estadoPropuesta)}
          </span>
          <EventoActions
            id={evento.id}
            nombre={evento.nombre}
            publicadorId={evento.publicadorId}
            imagen={evento.imagenes[0]}
            fecha={formatDateRange(evento.fechaInicio, evento.fechaFin)}
          />
        </footer>
      </div>
    </article>
  )
}

function HeroEvento({ evento }: { evento: EventoResponse }) {
  return (
    <section className="relative isolate w-full overflow-hidden bg-[#0b2b3a]">
      <HeroImagen src={evento.imagenes[0]} alt={`Imagen de ${evento.nombre}`} />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#07141c] via-[#07141c]/60 to-[#07141c]/15"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[460px] w-full max-w-7xl flex-col justify-between gap-8 px-5 pb-10 pt-5 sm:min-h-[540px] md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Volver sobreHero />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-[#df2a29] px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-md">
              Evento
            </span>
            {evento.categoria ? (
              <CategoriaBadge categoria={evento.categoria} />
            ) : (
              <span className="rounded-full bg-[#d7a73b] px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-md">
                Sin categoría
              </span>
            )}
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#00658d] shadow-sm backdrop-blur-md">
              {TIPO_ACCESO_LABELS[evento.tipoAcceso ?? 'GRATUITO']}
            </span>
          </div>
        </div>

        <div className="max-w-4xl">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-medium text-white/85">
            <MapPinIcon className="h-4 w-4" aria-hidden />
            <span>{evento.localidad ?? 'Córdoba'}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  ESTADO_DOT_COLORS[estadoKey(evento.estadoPropuesta)],
                )}
                aria-hidden
              />
              {estadoLabel(evento.estadoPropuesta)}
            </span>
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase leading-[0.92] tracking-tight text-white drop-shadow-sm sm:text-6xl lg:text-7xl">
            {evento.nombre}
          </h1>
        </div>
      </div>
    </section>
  )
}

function HeroImagen({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false)

  if (src === undefined || failed) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,#0f6f96_0%,#0b2b3a_45%,#07141c_100%)]"
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  )
}

function FranjaDatos({ evento, horario }: { evento: EventoResponse; horario: string | null }) {
  const esDePago = evento.tipoAcceso === 'DE_PAGO'

  return (
    <section aria-label="Datos clave del evento" className="w-full bg-[#0b2b3a] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-6 md:grid-cols-3 md:gap-0 md:px-8 md:py-9">
        <ModuloDato icon={<CalendarDaysIcon className="h-7 w-7" aria-hidden />} label="Cuándo">
          <p className="font-display text-xl leading-tight sm:text-2xl">
            {cuandoLabel(evento, horario)}
          </p>
        </ModuloDato>

        <ModuloDato
          icon={<MapPinIcon className="h-7 w-7" aria-hidden />}
          label="Dónde"
          borde
        >
          <p className="text-base leading-snug text-white/90">
            {evento.lugarRecinto !== null && (
              <span className="font-semibold text-white">{evento.lugarRecinto}</span>
            )}
            {evento.lugarRecinto !== null &&
              (evento.direccion !== null || evento.localidad !== null) && (
                <span aria-hidden> · </span>
              )}
            {evento.direccion !== null && <span>{evento.direccion}</span>}
            {evento.direccion !== null && evento.localidad !== null && <span>, </span>}
            {evento.localidad !== null && <span>{evento.localidad}</span>}
            {evento.lugarRecinto === null &&
              evento.direccion === null &&
              evento.localidad === null && <span>Ubicación a confirmar</span>}
          </p>
        </ModuloDato>

        <ModuloDato
          icon={<CircleDollarSignIcon className="h-7 w-7" aria-hidden />}
          label={esDePago ? 'Entradas desde' : 'Entradas'}
          borde
        >
          {esDePago ? (
            <div className="flex flex-col gap-1">
              <p className="font-display text-3xl leading-none text-white">
                {formatArancel(evento.montoEstimado)}
              </p>
              {evento.descripcionArancel !== null && (
                <p className="text-sm text-white/75">{evento.descripcionArancel}</p>
              )}
              {evento.sitioOficial !== null && (
                <a
                  href={evento.sitioOficial}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#8fd3f4] underline-offset-4 hover:underline"
                >
                  Sitio oficial de entradas
                  <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
            </div>
          ) : (
            <p className="font-display text-2xl leading-tight text-white">
              Entrada libre y gratuita
            </p>
          )}
        </ModuloDato>
      </div>
    </section>
  )
}

function ModuloDato({
  icon,
  label,
  borde = false,
  children,
}: {
  icon: ReactNode
  label: string
  borde?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('flex gap-4', borde && 'md:border-l md:border-white/15 md:pl-8')}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#8fd3f4]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/55">{label}</p>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  )
}

function Pildoras({ evento }: { evento: EventoResponse }) {
  const etiquetas: { key: string; label: string; accesible?: boolean }[] = []

  if (evento.modalidad) {
    etiquetas.push({
      key: 'modalidad',
      label: MODALIDAD_LABELS[evento.modalidad],
      accesible: evento.modalidad === 'ACCESIBLE',
    })
  }
  if (evento.tipoPropuesta) {
    etiquetas.push({ key: 'tipo', label: TIPO_PROPUESTA_LABELS[evento.tipoPropuesta] })
  }

  if (etiquetas.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Etiquetas del evento">
      {etiquetas.map((etiqueta) => (
        <li key={etiqueta.key}>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium',
              etiqueta.accesible
                ? 'border-[#1e7d32]/30 bg-[#1e7d32]/10 text-[#1e7d32]'
                : 'border-[#e0e3e5] bg-white text-[#3f484e]',
            )}
          >
            {etiqueta.accesible && <AccessibilityIcon className="h-4 w-4" aria-hidden />}
            {etiqueta.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BloqueUbicacion({ evento }: { evento: EventoResponse }) {
  const tieneMapa = evento.latitud !== null && evento.longitud !== null
  const comoLlegar = destinoComoLlegar(evento)
  const referencia = direccionCompleta(evento)

  return (
    <aside className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-bold text-[#191c1e]">Ubicación</h2>

      {tieneMapa ? (
        <EventoMapa
          nombre={evento.nombre}
          lugar={evento.lugarRecinto ?? evento.direccion ?? evento.localidad ?? evento.nombre}
          localidad={evento.localidad}
          latitud={evento.latitud as number}
          longitud={evento.longitud as number}
        />
      ) : (
        <div className="rounded-xl border border-dashed bg-white p-5 text-sm text-[#3f484e]">
          {referencia || 'Todavía no hay datos de ubicación para este evento.'}
        </div>
      )}

      {comoLlegar !== null && (
        <Button
          asChild
          size="lg"
          className="w-full rounded-xl bg-[#00658d] font-bold text-white shadow-sm hover:bg-[#65b7e8]"
        >
          <a href={comoLlegar} target="_blank" rel="noreferrer">
            <NavigationIcon data-icon="inline-start" aria-hidden />
            Cómo llegar
          </a>
        </Button>
      )}
    </aside>
  )
}

function Volver({ sobreHero = false }: { sobreHero?: boolean }) {
  const { hasRole } = useAuth()
  const destino = hasRole('PUBLICADOR') ? '/propuestas' : '/descubrir'

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn(
        'self-start',
        sobreHero &&
          'rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white',
      )}
    >
      <Link to={destino}>
        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
        Volver al listado
      </Link>
    </Button>
  )
}

/** Rango de fechas + horario; el horario solo se agrega si el evento lo tiene. */
function cuandoLabel(evento: EventoResponse, horario: string | null): string {
  const fecha = formatDateRange(evento.fechaInicio, evento.fechaFin)
  return horario !== null ? `${fecha} · ${horario} hs.` : fecha
}

/** `lugarRecinto · direccion, localidad`, omitiendo lo que falte. */
function direccionCompleta(evento: EventoResponse): string {
  const calle = [evento.direccion, evento.localidad].filter(Boolean).join(', ')
  return [evento.lugarRecinto, calle].filter(Boolean).join(' · ')
}

function destinoComoLlegar(evento: EventoResponse): string | null {
  return linkComoLlegar({
    latitud: evento.latitud,
    longitud: evento.longitud,
    direccionTexto: direccionCompleta(evento),
  })
}

/** `1500` → `$ 1.500,00`. El backend garantiza que no es null cuando el evento es arancelado. */
function formatArancel(monto: number | null): string {
  if (monto === null) return 'Arancelado'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)
}

function estadoKey(estado: EstadoPropuesta | EstadoPropuestaObj | null): EstadoPropuesta {
  const key = typeof estado === 'object' && estado !== null ? estado.nombre : estado
  return key ?? 'INICIADO'
}

/** `null` (evento viejo o sin estado) cae en el label de `INICIADO` para no mostrar nada raro. */
function estadoLabel(estado: EstadoPropuesta | EstadoPropuestaObj | null): string {
  return ESTADO_PROPUESTA_LABELS[estadoKey(estado)]
}

function IdInvalido() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 pt-6 md:px-8">
      <Volver />
      <Alert variant="destructive">
        <AlertTitle>Identificador inválido</AlertTitle>
        <AlertDescription>
          La dirección no corresponde a un evento: el id tiene que ser un número entero.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function DetalleSkeleton() {
  return (
    <div className="w-full">
      <div className="flex min-h-[460px] w-full items-end bg-[#e6eaed] sm:min-h-[540px]">
        <div
          role="status"
          aria-label="Cargando"
          className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 pb-10 md:px-8"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-3/4 max-w-2xl" />
          <Skeleton className="h-4 w-1/2 max-w-md" />
          <span className="sr-only">Cargando…</span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_440px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
