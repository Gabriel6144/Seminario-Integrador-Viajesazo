import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useCrearActividad } from '@/api/actividades'
import { PUBLICADORES_MAX_SIZE, usePublicadores } from '@/api/publicadores'
import { useCrearEvento } from '@/api/eventos'
import { EventoForm } from '@/components/evento-form'
import { ErrorState, GridSkeleton } from '@/components/query-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toUserMessage } from '@/lib/http'
import { EVENTO_FORM_DEFAULT, toActividadRequest, toEventoRequest } from '@/lib/schemas'

/**
 * Alta de propuesta turística (`POST /api/eventos` o `POST /api/actividades`).
 */
export function EventoNuevoPage() {
  const navigate = useNavigate()
  const crearEvento = useCrearEvento()
  const crearActividad = useCrearActividad()
  const [serverError, setServerError] = useState<string | null>(null)

  // Se piden hasta el tope que acepta la API porque el `<Select>` de publicadores necesita todos:
  // el backend no tiene endpoint de opciones ni de búsqueda, solo el listado paginado.
  const publicadores = usePublicadores(0, PUBLICADORES_MAX_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Nueva propuesta turística</h2>
        <p className="text-sm text-muted-foreground">
          Elegí si vas a publicar un evento con fechas puntuales o una actividad con disponibilidad semanal.
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
              Una propuesta turística necesita un publicador, así que primero hay que crear al menos uno.
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
          isPending={crearEvento.isPending || crearActividad.isPending}
          serverError={serverError}
          onSubmit={(values) => {
            setServerError(null)
            crearEvento.mutate(toEventoRequest(values), {
              onSuccess: (evento) => {
                toast.success('Evento creado')
                navigate(`/eventos/${evento.id}`)
              },
              onError: (error) => setServerError(toUserMessage(error)),
            })
          }}
          onSubmitActividad={(values) => {
            setServerError(null)
            crearActividad.mutate(toActividadRequest(values), {
              onSuccess: (actividad) => {
                toast.success('Actividad creada')
                navigate(`/actividades/${actividad.id}`)
              },
              onError: (error) => setServerError(toUserMessage(error)),
            })
          }}
        />
      ) : null}
    </div>
  )
}
