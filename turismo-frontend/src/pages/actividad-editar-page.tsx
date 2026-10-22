import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useActividad, useActualizarActividad } from '@/api/actividades'
import { PUBLICADORES_MAX_SIZE, usePublicadores } from '@/api/publicadores'
import { EventoForm } from '@/components/evento-form'
import { ErrorState } from '@/components/query-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toUserMessage } from '@/lib/http'
import { parseId } from '@/lib/parse-id'
import { toActividadFormValues, toActividadRequest } from '@/lib/schemas'

/**
 * Modificación de actividad turística — `PUT /api/actividades/{id}`.
 */
export function ActividadEditarPage() {
  const { id: rawId } = useParams()
  const id = parseId(rawId)
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const actividad = useActividad(id)
  const actualizar = useActualizarActividad()
  const publicadores = usePublicadores(0, PUBLICADORES_MAX_SIZE)

  if (id === null) return <IdInvalido />

  if (actividad.isPending || publicadores.isPending) return <FormSkeleton />

  if (actividad.isError) {
    return (
      <div className="flex flex-col gap-4">
        <Volver />
        <ErrorState error={actividad.error} />
      </div>
    )
  }

  if (publicadores.isError) {
    return (
      <div className="flex flex-col gap-4">
        <Volver />
        <ErrorState error={publicadores.error} />
      </div>
    )
  }

  if (publicadores.data.content.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Volver />
        <Alert>
          <AlertTitle>No hay publicadores cargados</AlertTitle>
          <AlertDescription>
            Sin publicadores no se puede guardar la actividad, porque el publicador es obligatorio.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const actual = actividad.data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Editar actividad</h2>
        <p className="text-sm text-muted-foreground">
          Modificando “{actual.nombre}”.
        </p>
      </div>

      <EventoForm
        defaultValues={toActividadFormValues(actual)}
        publicadores={publicadores.data.content}
        tipoFijo="ACTIVIDAD"
        submitLabel="Guardar cambios"
        cancelTo={`/actividades/${id}`}
        isPending={actualizar.isPending}
        serverError={serverError}
        ubicacionInicial={{ latitud: actual.latitud, longitud: actual.longitud }}
        onSubmit={(values) => {
          setServerError(null)
          actualizar.mutate(
            {
              id,
              request: toActividadRequest(values),
              previousPublicadorId: actual.publicadorId,
            },
            {
              onSuccess: (actualizada) => {
                toast.success('Cambios guardados')
                navigate(`/actividades/${actualizada.id}`)
              },
              onError: (error) => setServerError(toUserMessage(error)),
            },
          )
        }}
      />
    </div>
  )
}

function Volver() {
  return (
    <Button asChild variant="ghost" size="sm" className="self-start">
      <Link to="/">Volver al listado</Link>
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
          La dirección no corresponde a una actividad: el id tiene que ser un número entero.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div role="status" aria-label="Cargando" className="flex flex-col gap-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-1/2" />
        <span className="sr-only">Cargando…</span>
      </div>
    </div>
  )
}

