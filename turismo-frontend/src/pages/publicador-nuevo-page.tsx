import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useCrearPublicador } from '@/api/publicadores'
import { PublicadorForm } from '@/components/publicador-form'
import { toUserMessage } from '@/lib/http'
import { toPublicadorRequest } from '@/lib/schemas'

/**
 * Alta de publicador — `POST /api/publicadores`.
 *
 * El 400 del email duplicado es el error de negocio más probable de esta pantalla, y es el único
 * que el schema no puede anticipar: depende de lo que ya esté cargado en la base. Por eso el
 * `serverError` se muestra arriba del formulario en lugar de colgarlo de un campo.
 */
export function PublicadorNuevoPage() {
  const navigate = useNavigate()
  const crear = useCrearPublicador()
  const [serverError, setServerError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Nuevo publicador</h2>
        <p className="text-sm text-muted-foreground">
          El email identifica al publicador y no se puede repetir.
        </p>
      </div>

      <PublicadorForm
        defaultValues={{ nombre: '', email: '', telefono: '' }}
        isPending={crear.isPending}
        serverError={serverError}
        onSubmit={(values) => {
          setServerError(null)
          crear.mutate(toPublicadorRequest(values), {
            onSuccess: (publicador) => {
              toast.success('Publicador creado')
              navigate(`/publicadores/${publicador.id}`)
            },
            onError: (error) => setServerError(toUserMessage(error)),
          })
        }}
      />
    </div>
  )
}
