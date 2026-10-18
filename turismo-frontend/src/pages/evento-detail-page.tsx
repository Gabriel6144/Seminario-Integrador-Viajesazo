import {
  ArrowLeftIcon,
  Building2Icon,
  CalendarDaysIcon,
  CircleDollarSignIcon,
  ClockIcon,
  ExternalLinkIcon,
  LandmarkIcon,
  MapPinIcon,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { useEvento } from '@/api/eventos'
import { CategoriaBadge } from '@/components/categoria-badge'
import { EventoActions } from '@/components/evento-actions'
import { EventoImagen } from '@/components/evento-imagen'
import { EventoMapa } from '@/components/evento-mapa'
import { ErrorState } from '@/components/query-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateRange, formatLocalDate, formatTimeRange } from '@/lib/dates'
import { parseId } from '@/lib/parse-id'
import { TIPO_ACCESO_LABELS, ESTADO_PROPUESTA_LABELS, type EstadoPropuesta } from '@/types/api'

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
      <div className="flex flex-col gap-4">
        <Volver />
        <ErrorState error={query.error} />
      </div>
    )
  }

  const evento = query.data
  const horario = formatTimeRange(evento.horarioInicio, evento.horarioFin)
  const imagen = evento.imagenes[0]
  const esDePago = evento.tipoAcceso === 'DE_PAGO'
  const tieneMapa = evento.latitud !== null && evento.longitud !== null

  return (
    <div className="flex flex-col gap-6">
      <Volver />

      {/* Hero image con overlay */}
      {imagen && (
        <div className="relative h-64 w-full overflow-hidden rounded-2xl shadow-sm sm:h-80 md:h-96">
          <img
            src={imagen}
            alt={`Imagen de ${evento.nombre}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Badges flotantes */}
          <div className="absolute left-3 right-3 top-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#7a5900] shadow-sm backdrop-blur-md">
                {evento.categoria ? (
                  <CategoriaBadge categoria={evento.categoria} />
                ) : (
                  'Sin categoría'
                )}
              </span>
              <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#00658d] shadow-sm backdrop-blur-md">
                {TIPO_ACCESO_LABELS[evento.tipoAcceso ?? 'GRATUITO']}
              </span>
            </div>
            <span className="rounded-full bg-[#eaf6fc] px-3 py-1 text-xs font-semibold text-[#00658d] shadow-sm backdrop-blur-md">
              Agenda Provincial Abierta
            </span>
          </div>

          {/* Título sobre la imagen */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <p className="mb-1 flex items-center gap-1 text-sm font-medium text-white/90">
              <MapPinIcon className="h-4 w-4" aria-hidden />
              {evento.localidad ?? 'Córdoba'}
            </p>
            <h2 className="font-heading text-2xl font-bold leading-tight drop-shadow-sm">
              {evento.nombre}
            </h2>
          </div>
        </div>
      )}

      {/* Card principal */}
      <Card>
        <CardHeader>
          {!imagen && (
            <div className="flex items-center gap-2">
              <CategoriaBadge categoria={evento.categoria} />
            </div>
          )}
          {imagen && (
            <div className="flex items-center gap-2">
              <CategoriaBadge categoria={evento.categoria} />
            </div>
          )}
          {/*
            `CardTitle` de shadcn es un `div` fijo (no acepta `asChild`), así que el nombre del
            evento se compone como `<h2>` a mano. Sin esto la página no tendría ningún heading y
            el lector de pantalla no encontraría el título del contenido.
          */}
          {!imagen && (
            <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
              {evento.nombre}
            </h2>
          )}
          <CardDescription>
            Publicado por{' '}
            <Link
              to={`/publicadores/${evento.publicadorId}`}
              className="underline-offset-4 hover:underline"
            >
              {evento.publicadorNombre}
            </Link>
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Ficha del evento */}
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-4 w-4 text-[#7a5900]" aria-hidden />
              <dt className="sr-only">Fechas</dt>
              <dd className="font-medium text-[#191c1e]">
                {formatDateRange(evento.fechaInicio, evento.fechaFin)}
              </dd>
            </div>

            {horario !== null && (
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-[#7a5900]" aria-hidden />
                <dt className="sr-only">Horario</dt>
                <dd className="text-[#3f484e]">{horario}</dd>
              </div>
            )}

            {evento.localidad !== null && (
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-[#bb0413]" aria-hidden />
                <dt className="sr-only">Localidad</dt>
                <dd className="text-[#3f484e]">{evento.localidad}</dd>
              </div>
            )}

            {evento.lugarRecinto !== null && (
              <div className="flex items-center gap-2">
                <LandmarkIcon className="h-4 w-4 text-[#3f484e]" aria-hidden />
                <dt className="sr-only">Lugar o recinto</dt>
                <dd className="text-[#3f484e]">{evento.lugarRecinto}</dd>
              </div>
            )}

            {evento.direccion !== null && (
              <div className="flex items-center gap-2">
                <Building2Icon className="h-4 w-4 text-[#3f484e]" aria-hidden />
                <dt className="sr-only">Dirección</dt>
                <dd className="text-[#3f484e]">{evento.direccion}</dd>
              </div>
            )}

            {esDePago && (
              <div className="flex items-start gap-2">
                <CircleDollarSignIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1e7d32]" aria-hidden />
                <div className="flex flex-col gap-0.5">
                  <dt className="sr-only">Arancel</dt>
                  <dd className="text-[#3f484e]">
                    <span className="font-semibold text-[#1e7d32]">
                      {formatArancel(evento.montoEstimado)}
                    </span>
                    {evento.descripcionArancel !== null && (
                      <span> · {evento.descripcionArancel}</span>
                    )}
                  </dd>
                  {evento.sitioOficial !== null && (
                    <dd>
                      <a
                        href={evento.sitioOficial}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#00658d] underline-offset-4 hover:underline"
                      >
                        Sitio oficial de entradas
                        <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </dd>
                  )}
                </div>
              </div>
            )}
          </dl>

          {tieneMapa && (
            <div className="flex flex-col gap-1.5">
              <h3 className="font-heading text-lg font-bold text-[#191c1e]">¿Dónde se hace?</h3>
              <EventoMapa
                nombre={evento.nombre}
                lugar={evento.lugarRecinto ?? evento.direccion ?? evento.localidad ?? evento.nombre}
                localidad={evento.localidad}
                latitud={evento.latitud as number}
                longitud={evento.longitud as number}
              />
            </div>
          )}

          {evento.descripcion !== null && (
            <>
              <Separator />
              <p className="leading-relaxed text-[#3f484e]">{evento.descripcion}</p>
            </>
          )}

          {evento.imagenes.length > 0 && (
            <>
              <Separator />
              <ul className="grid gap-3 sm:grid-cols-2">
                {evento.imagenes.map((url) => (
                  <li key={url}>
                    <EventoImagen
                      src={url}
                      alt={`Imagen de ${evento.nombre}`}
                      className="aspect-video w-full"
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-[#3f484e]">
            {formatLocalDate(evento.fechaInicio)} · evento #{evento.id} ·{' '}
            {estadoLabel(evento.estadoPropuesta)}
          </span>
          <EventoActions
            id={evento.id}
            nombre={evento.nombre}
            publicadorId={evento.publicadorId}
            imagen={imagen}
            fecha={formatDateRange(evento.fechaInicio, evento.fechaFin)}
          />
        </CardFooter>
      </Card>
    </div>
  )
}

function Volver() {
  return (
    <Button asChild variant="ghost" size="sm" className="self-start">
      <Link to="/">
        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
        Volver al listado
      </Link>
    </Button>
  )
}

/** `1500` → `$ 1.500,00`. El backend garantiza que no es null cuando el evento es arancelado. */
function formatArancel(monto: number | null): string {
  if (monto === null) return 'Arancelado'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)
}

/** `null` (evento viejo o sin estado) cae en el label de `INICIADO` para no mostrar nada raro. */
function estadoLabel(estado: EstadoPropuesta | null): string {
  return ESTADO_PROPUESTA_LABELS[estado ?? 'INICIADO']
}

function IdInvalido() {
  return (
    <div className="flex flex-col gap-4">
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
    <div className="flex flex-col gap-6">
      <Volver />
      {/* Mismo `role="status"` que la grilla: sin esto el estado de carga no es anunciable. */}
      <div role="status" aria-label="Cargando" className="flex flex-col gap-4 rounded-xl border p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Separator />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <span className="sr-only">Cargando…</span>
      </div>
    </div>
  )
}
