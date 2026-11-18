import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useCrearActividad } from '@/api/actividades'
import { useCrearEvento } from '@/api/eventos'
import { useAuth } from '@/components/auth-provider'
import { EventoForm } from '@/components/evento-form'
import { ErrorState } from '@/components/query-state'
import { toUserMessage } from '@/lib/http'
import { EVENTO_FORM_DEFAULT, toActividadRequest, toEventoRequest } from '@/lib/schemas'
import type { PublicadorResponse } from '@/types/api'

/**
 * Alta de propuesta turística (`POST /api/eventos` o `POST /api/actividades`).
 *
 * El publicador no consulta `GET /api/publicadores` (solo guest/TURISTA): usa el publicador
 * vinculado a la sesión.
 */
export function EventoNuevoPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const crearEvento = useCrearEvento()
  const crearActividad = useCrearActividad()
  const [serverError, setServerError] = useState<string | null>(null)

  const publicadores = useMemo((): PublicadorResponse[] => {
    if (user?.publicadorId == null) return []
    return [
      {
        id: user.publicadorId,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
      },
    ]
  }, [user])

  const defaultValues = useMemo(() => {
    const base = { ...EVENTO_FORM_DEFAULT }
    if (user?.publicadorId != null) {
      base.publicadorId = String(user.publicadorId)
    }
    return base
  }, [user?.publicadorId])

  if (user?.publicadorId == null) {
    return (
      <ErrorState
        error={new Error('Tu cuenta no está vinculada a un publicador.')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Nueva propuesta turística</h2>
        <p className="text-sm text-muted-foreground">
          Primero elegí las fechas de agenda (desde hoy en adelante). Podés agendar más de una
          propuesta el mismo día. Después completá si es un evento o una actividad.
        </p>
      </div>

      <EventoForm
        defaultValues={defaultValues}
        publicadores={publicadores}
        submitLabel="Crear propuesta"
        cancelTo="/publicador"
        isPending={crearEvento.isPending || crearActividad.isPending}
        serverError={serverError}
        onSubmit={(values) => {
          setServerError(null)
          crearEvento.mutate(toEventoRequest(values), {
            onSuccess: () => {
              toast.success('Evento creado y agregado a tu agenda')
              navigate('/publicador/agenda')
            },
            onError: (error) => setServerError(toUserMessage(error)),
          })
        }}
        onSubmitActividad={(values) => {
          setServerError(null)
          crearActividad.mutate(toActividadRequest(values), {
            onSuccess: () => {
              toast.success('Actividad creada y agregada a tu agenda')
              navigate('/publicador/agenda')
            },
            onError: (error) => setServerError(toUserMessage(error)),
          })
        }}
      />
    </div>
  )
}
