import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useActualizarEvento, useEvento } from '@/api/eventos'
import { PUBLICADORES_MAX_SIZE, usePublicadores } from '@/api/publicadores'
import { EventoForm } from '@/components/evento-form'
import { ErrorState } from '@/components/query-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toUserMessage } from '@/lib/http'
import { parseId } from '@/lib/parse-id'
import { toEventoFormValues, toEventoRequest } from '@/lib/schemas'

/**
 * Modificación de evento — `PUT /api/eventos/{id}`. US2.
 *
 * Los `defaultValues` salen del evento que ya está cargado, así que el formulario se monta
 * recién cuando la query resolvió: Montarlo antes dejaría todos los campos vacíos y el
 * `defaultValues` de RHF no volvería a aplicarse cuando llegaran los datos.
 */
export function EventoEditarPage() {
  const { id: rawId } = useParams()
  const id = parseId(rawId)
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const evento = useEvento(id)
  const actualizar = useActualizarEvento()
  const publicadores = usePublicadores(0, PUBLICADORES_MAX_SIZE)

  // Un id no numérico no llega al backend: pedírlo devolvería 500 en lugar de 400.
  if (id === null) return <IdInvalido />

  if (evento.isPending || publicadores.isPending) return <FormSkeleton />

  if (evento.isError) {
    return (
      <div className="flex flex-col gap-4">
        <Volver />
        <ErrorState error={evento.error} />
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
            Sin publicadores no se puede guardar el evento, porque el publicador es obligatorio.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const actual = evento.data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Editar evento</h2>
        <p className="text-sm text-muted-foreground">
          Modificando “{actual.nombre}”, evento #{actual.id}.
        </p>
      </div>

      <EventoForm
        defaultValues={toEventoFormValues(actual)}
        publicadores={publicadores.data.content}
        submitLabel="Guardar cambios"
        cancelTo={`/eventos/${id}`}
        isPending={actualizar.isPending}
        serverError={serverError}
        onSubmit={(values) => {
          setServerError(null)
          actualizar.mutate(
            {
              id,
              request: toEventoRequest(values),
              // El publicador puede haber cambiado: la grilla del publicador anterior también
              // quedó vieja y hay que invalidarla, no solo la del nuevo.
              previousPublicadorId: actual.publicadorId,
            },
            {
              onSuccess: (actualizado) => {
                toast.success('Cambios guardados')
                navigate(`/eventos/${actualizado.id}`)
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
      <Link to="/">
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
