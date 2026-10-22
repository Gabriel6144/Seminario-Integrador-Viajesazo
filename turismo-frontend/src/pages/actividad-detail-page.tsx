import { useState } from 'react'
import {
  ArrowLeftIcon,
  Building2Icon,
  CalendarDaysIcon,
  ClockIcon,
  LandmarkIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useActividad, useBorrarActividad } from '@/api/actividades'
import { CategoriaBadge } from '@/components/categoria-badge'
import { EventoImagen } from '@/components/evento-imagen'
import { EventoMapa } from '@/components/evento-mapa'
import { ErrorState } from '@/components/query-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import { formatTimeRange } from '@/lib/dates'
import { toUserMessage } from '@/lib/http'
import { parseId } from '@/lib/parse-id'
import {
  DIA_SEMANA_LABELS,
  ESTADO_PROPUESTA_LABELS,
  MODALIDAD_LABELS,
  TIPO_ACCESO_LABELS,
  TIPO_PROPUESTA_LABELS,
  type EstadoPropuesta,
  type EstadoPropuestaObj,
} from '@/types/api'

const ESTADO_DOT_COLORS: Record<EstadoPropuesta, string> = {
  INICIADO: 'bg-emerald-400',
  REPROGRAMADO: 'bg-amber-400',
  CANCELADO: 'bg-rose-400',
  FINALIZADO: 'bg-slate-400',
}

/** Detalle de una actividad turística — `GET /api/actividades/{id}`. */
export function ActividadDetailPage() {
  const { id: rawId } = useParams()
  const id = parseId(rawId)
  const query = useActividad(id)

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

  const actividad = query.data
  const imagen = actividad.imagenes[0]
  const tieneMapa = actividad.latitud !== null && actividad.longitud !== null

  return (
    <div className="flex flex-col gap-6">
      <Volver />

      {/* Hero image con overlay */}
      {imagen && (
        <div className="relative h-64 w-full overflow-hidden rounded-2xl shadow-sm sm:h-80 md:h-96">
          <img
            src={imagen}
            alt={`Imagen de ${actividad.nombre}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Badges flotantes */}
          <div className="absolute left-3 right-3 top-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[#00658d] px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-md">
                Actividad
              </span>
              {actividad.categoria ? (
                <CategoriaBadge categoria={actividad.categoria} />
              ) : (
                <span className="rounded-full bg-[#d7a73b] px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-md">
                  Sin categoría
                </span>
              )}
              <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#00658d] shadow-sm backdrop-blur-md">
                {TIPO_ACCESO_LABELS[actividad.tipoAcceso ?? 'GRATUITO']}
              </span>
            </div>
            <span className="rounded-full bg-[#eaf6fc] px-3 py-1 text-xs font-semibold text-[#00658d] shadow-sm backdrop-blur-md">
              Agenda Provincial Abierta
            </span>
          </div>

          {/* Título sobre la imagen */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-sm font-medium text-white/90">
              <MapPinIcon className="h-4 w-4" aria-hidden />
              <span>{actividad.localidad ?? 'Córdoba'}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-white">
                <span
                  className={`h-2 w-2 rounded-full ${ESTADO_DOT_COLORS[estadoKey(actividad.estadoPropuesta)]}`}
                  aria-hidden
                />
                {estadoLabel(actividad.estadoPropuesta)}
              </span>
            </div>
            <h2 className="font-heading text-2xl font-bold leading-tight drop-shadow-sm">
              {actividad.nombre}
            </h2>
          </div>
        </div>
      )}

      {/* Card principal */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#00658d] px-2.5 py-0.5 text-xs font-semibold text-white">
              Actividad
            </span>
            <CategoriaBadge categoria={actividad.categoria} />
            {actividad.tipoPropuesta && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-[#3f484e]">
                {TIPO_PROPUESTA_LABELS[actividad.tipoPropuesta]}
              </span>
            )}
            {actividad.modalidad && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-[#3f484e]">
                {MODALIDAD_LABELS[actividad.modalidad]}
              </span>
            )}
          </div>
          {!imagen && (
            <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
              {actividad.nombre}
            </h2>
          )}
          <CardDescription>
            Publicado por{' '}
            <Link
              to={`/publicadores/${actividad.publicadorId}`}
              className="underline-offset-4 hover:underline"
            >
              {actividad.publicadorNombre}
            </Link>
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Ficha de la actividad */}
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-[#00658d]" aria-hidden />
              <dt className="sr-only">Duración</dt>
              <dd className="font-medium text-[#191c1e]">
                Duración estimada: {actividad.duracionMinutos} minutos
              </dd>
            </div>

            {actividad.localidad !== null && (
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-[#bb0413]" aria-hidden />
                <dt className="sr-only">Localidad</dt>
                <dd className="text-[#3f484e]">{actividad.localidad}</dd>
              </div>
            )}

            {actividad.lugarRecinto !== null && (
              <div className="flex items-center gap-2">
                <LandmarkIcon className="h-4 w-4 text-[#3f484e]" aria-hidden />
                <dt className="sr-only">Lugar o recinto</dt>
                <dd className="text-[#3f484e]">{actividad.lugarRecinto}</dd>
              </div>
            )}

            {actividad.direccion !== null && (
              <div className="flex items-center gap-2">
                <Building2Icon className="h-4 w-4 text-[#3f484e]" aria-hidden />
                <dt className="sr-only">Dirección</dt>
                <dd className="text-[#3f484e]">{actividad.direccion}</dd>
              </div>
            )}
          </dl>

          {/* Disponibilidades semanales */}
          {actividad.disponibilidades.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 font-heading text-base font-bold text-[#191c1e]">
                <CalendarDaysIcon className="h-4 w-4 text-[#00658d]" aria-hidden />
                Disponibilidad semanal
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {actividad.disponibilidades.map((disp, index) => (
                  <li
                    key={`${disp.diaSemana}-${disp.horaInicio}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-[#e0e3e5] bg-[#f7f9fb] px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-[#191c1e]">
                      {DIA_SEMANA_LABELS[disp.diaSemana]}
                    </span>
                    <span className="text-[#3f484e]">
                      {formatTimeRange(disp.horaInicio, disp.horaFin)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tieneMapa && (
            <div className="flex flex-col gap-1.5">
              <h3 className="font-heading text-lg font-bold text-[#191c1e]">¿Dónde se hace?</h3>
              <EventoMapa
                nombre={actividad.nombre}
                lugar={
                  actividad.lugarRecinto ??
                  actividad.direccion ??
                  actividad.localidad ??
                  actividad.nombre
                }
                localidad={actividad.localidad}
                latitud={actividad.latitud as number}
                longitud={actividad.longitud as number}
              />
            </div>
          )}

          {actividad.descripcion !== null && (
            <>
              <Separator />
              <p className="leading-relaxed text-[#3f484e]">{actividad.descripcion}</p>
            </>
          )}

          {actividad.imagenes.length > 0 && (
            <>
              <Separator />
              <ul className="grid gap-3 sm:grid-cols-2">
                {actividad.imagenes.map((url) => (
                  <li key={url}>
                    <EventoImagen
                      src={url}
                      alt={`Imagen de ${actividad.nombre}`}
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
            Duración {actividad.duracionMinutos} min · actividad #{actividad.id} ·{' '}
            {estadoLabel(actividad.estadoPropuesta)}
          </span>
          <ActividadActions
            id={actividad.id}
            nombre={actividad.nombre}
            publicadorId={actividad.publicadorId}
            imagen={imagen}
            duracionMinutos={actividad.duracionMinutos}
          />
        </CardFooter>
      </Card>
    </div>
  )
}

function ActividadActions({
  id,
  nombre,
  publicadorId,
  imagen,
  duracionMinutos,
}: {
  id: number
  nombre: string
  publicadorId: number
  imagen?: string
  duracionMinutos: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const borrar = useBorrarActividad()

  function confirmarBaja() {
    borrar.mutate(
      { id, publicadorId },
      {
        onSuccess: () => {
          setIsOpen(false)
          toast.success('Actividad eliminada')
          navigate('/')
        },
        onError: (error) => {
          setIsOpen(false)
          toast.error(toUserMessage(error))
        },
      },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link to={`/actividades/${id}/editar`}>
          <PencilIcon data-icon="inline-start" aria-hidden />
          Editar
        </Link>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={borrar.isPending}>
            <Trash2Icon data-icon="inline-start" aria-hidden />
            Dar de baja
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="max-w-lg rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#ffdad6]/60">
                <svg className="h-6 w-6 text-[#ba1a1a]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="font-heading text-lg font-bold text-[#191c1e]">
                  Dar de baja actividad
                </AlertDialogTitle>
                <span className="mt-1 inline-block text-sm font-semibold text-[#ba1a1a]">
                  Acción destructiva permanente
                </span>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex items-center gap-3 rounded-lg border border-[#e0e3e5] bg-[#f2f4f6] p-3">
            {imagen && (
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[#d8dadc]">
                <img src={imagen} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-sm font-semibold text-[#00658d]">
                <span>Duración: {duracionMinutos} min</span>
              </div>
              <h4 className="mt-0.5 truncate text-sm font-bold text-[#191c1e]" title={nombre}>
                {nombre}
              </h4>
              <p className="truncate text-xs text-[#3f484e]">Turismo Córdoba Oficial</p>
            </div>
          </div>

          <div className="rounded-r-lg border-l-4 border-[#00658d] bg-[#ffdad6]/20 p-3">
            <p className="text-sm leading-relaxed text-[#191c1e]">
              ¿Está seguro de que desea dar de baja esta actividad? Esta acción quitará la actividad del listado de propuestas registradas.
            </p>
          </div>

          <AlertDialogFooter className="flex-col-reverse gap-2 border-t border-[#e0e3e5]/60 pt-4 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full rounded-xl border border-[#70787f]/40 px-6 py-3 font-semibold text-[#191c1e] hover:bg-[#e0e3e5] sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarBaja}
              disabled={borrar.isPending}
              className="w-full rounded-xl bg-[#00658d] px-6 py-3 font-bold text-white shadow-md hover:bg-[#65b7e8] sm:w-auto"
            >
              {borrar.isPending ? 'Borrando…' : 'Confirmar baja'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function estadoKey(estado: EstadoPropuesta | EstadoPropuestaObj | null): EstadoPropuesta {
  const key = typeof estado === 'object' && estado !== null ? estado.nombre : estado
  return key ?? 'INICIADO'
}

function estadoLabel(estado: EstadoPropuesta | EstadoPropuestaObj | null): string {
  return ESTADO_PROPUESTA_LABELS[estadoKey(estado)]
}

function IdInvalido() {
  return (
    <div className="flex flex-col gap-4">
      <Volver />
      <Alert variant="destructive">
        <AlertTitle>Identificador inválido</AlertTitle>
        <AlertDescription>
          La dirección no corresponde a una actividad: el id tiene que ser un número entero.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function DetalleSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Volver />
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

