import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PUBLICADORES_MAX_SIZE, usePublicadores } from '@/api/publicadores'
import { useCrearEvento } from '@/api/eventos'
import { EventoForm } from '@/components/evento-form'
import { ErrorState, GridSkeleton } from '@/components/query-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toUserMessage } from '@/lib/http'
import { EVENTO_FORM_DEFAULT, toEventoRequest } from '@/lib/schemas'

/**
 * Alta de evento — `POST /api/eventos`. US1.
 *
 * La página arma el body con `toEventoRequest` y deja la conversión a la API en el schema, no acá.
 * También maneja el toast y la navegación; el hook de la mutación solo se ocupa de la caché.
 */
export function EventoNuevoPage() {
  const navigate = useNavigate()
  const crear = useCrearEvento()
  const [serverError, setServerError] = useState<string | null>(null)

  // Se piden hasta el tope que acepta la API porque el `<Select>` de publicadores necesita todos:
  // el backend no tiene endpoint de opciones ni de búsqueda, solo el listado paginado.
  const publicadores = usePublicadores(0, PUBLICADORES_MAX_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Nuevo evento</h2>
        <p className="text-sm text-muted-foreground">
          Los campos de nombre, fechas y publicador son obligatorios.
        </p>
      </div>

      {publicadores.isPending ? <GridSkeleton /> : null}
      {publicadores.isError ? <ErrorState error={publicadores.error} /> : null}

      {/*
        Sin publicadores cargados el `publicadorId` no se puede completar y el formulario sería
        un callejón sin salida: se dice qué hacer en vez de dejar que se envíe y falle.
      */}
      {publicadores.isSuccess && publicadores.data.content.length === 0 ? (
        <Alert>
          <AlertTitle>No hay publicadores cargados</AlertTitle>
          <AlertDescription>
            <p>
              Un evento necesita un publicador, así que primero hay que crear al menos uno.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/publicadores/nuevo">Crear publicador</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {publicadores.isSuccess && publicadores.data.content.length > 0 ? (
        <EventoForm
          defaultValues={EVENTO_FORM_DEFAULT}
          publicadores={publicadores.data.content}
          submitLabel="Crear evento"
          cancelTo="/"
          isPending={crear.isPending}
          serverError={serverError}
          onSubmit={(values) => {
            setServerError(null)
            crear.mutate(toEventoRequest(values), {
              onSuccess: (evento) => {
                toast.success('Evento creado')
                navigate(`/eventos/${evento.id}`)
              },
              onError: (error) => setServerError(toUserMessage(error)),
            })
          }}
        />
      ) : null}
    </div>
  )
}
