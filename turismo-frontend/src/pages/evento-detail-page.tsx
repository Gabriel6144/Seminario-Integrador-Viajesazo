import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  LandmarkIcon,
  MapPinIcon,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { useEvento } from '@/api/eventos'
import { CategoriaBadge } from '@/components/categoria-badge'
import { EventoActions } from '@/components/evento-actions'
import { EventoImagen } from '@/components/evento-imagen'
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

  return (
    <div className="flex flex-col gap-6">
      <Volver />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CategoriaBadge categoria={evento.categoria} />
          </div>
          {/*
            `CardTitle` de shadcn es un `div` fijo (no acepta `asChild`), así que el nombre del
            evento se compone como `<h2>` a mano. Sin esto la página no tendría ningún heading y
            el lector de pantalla no encontraría el título del contenido.
          */}
          <h2 className="text-2xl font-semibold tracking-tight">{evento.nombre}</h2>
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
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon aria-hidden className="text-muted-foreground" />
              <dt className="sr-only">Fechas</dt>
              <dd>{formatDateRange(evento.fechaInicio, evento.fechaFin)}</dd>
            </div>

            {horario === null ? null : (
              <div className="flex items-center gap-2">
                <ClockIcon aria-hidden className="text-muted-foreground" />
                <dt className="sr-only">Horario</dt>
                <dd>{horario}</dd>
              </div>
            )}

            {evento.localidad === null ? null : (
              <div className="flex items-center gap-2">
                <MapPinIcon aria-hidden className="text-muted-foreground" />
                <dt className="sr-only">Localidad</dt>
                <dd>{evento.localidad}</dd>
              </div>
            )}

            {evento.direccion === null ? null : (
              <div className="flex items-center gap-2">
                <LandmarkIcon aria-hidden className="text-muted-foreground" />
                <dt className="sr-only">Dirección</dt>
                <dd>{evento.direccion}</dd>
              </div>
            )}
          </dl>

          {evento.descripcion === null ? null : (
            <>
              <Separator />
              <p className="leading-relaxed">{evento.descripcion}</p>
            </>
          )}

          {evento.imagenes.length === 0 ? null : (
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
          <span className="text-sm text-muted-foreground">
            {formatLocalDate(evento.fechaInicio)} · evento #{evento.id}
          </span>
          <EventoActions
            id={evento.id}
            nombre={evento.nombre}
            publicadorId={evento.publicadorId}
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
        <ArrowLeftIcon data-icon="inline-start" aria-hidden />
        Volver al listado
      </Link>
    </Button>
  )
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
