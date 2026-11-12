import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, type FieldError as RhfFieldError } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatValidationMessage, publicadorSchema, type PublicadorFormValues } from '@/lib/schemas'

interface PublicadorFormProps {
  defaultValues: PublicadorFormValues
  onSubmit: (values: PublicadorFormValues) => void
  isPending: boolean
  /**
   * Error del backend. El caso que de verdad importa acá es el 400 del email duplicado
   * (`"ya existe un publicador con ese email"`): el schema no puede detectarlo porque depende
   * de lo que ya está cargado en la base.
   */
  serverError: string | null
}

/**
 * Alta de publicador — `POST /api/publicadores`.
 *
 * Es solo un alta: el backend no expone `PUT` ni `DELETE` de publicadores, así que no hay
 * formulario de edición ni de baja para este recurso.
 */
export function PublicadorForm({ defaultValues, onSubmit, isPending, serverError }: PublicadorFormProps) {
  const form = useForm<PublicadorFormValues>({
    resolver: zodResolver(publicadorSchema),
    defaultValues,
    mode: 'onSubmit',
  })

  const { register, formState, watch } = form
  const { errors } = formState

  const email = watch('email')
  const [dismissedServerError, setDismissedServerError] = useState<string | null>(null)

  useEffect(() => {
    setDismissedServerError(null)
  }, [serverError])

  const activeServerError =
    serverError !== null && serverError !== dismissedServerError ? serverError : null

  const esErrorEmailServidor =
    activeServerError !== null && /email/i.test(activeServerError)

  const errorEmail: RhfFieldError | undefined = esErrorEmailServidor
    ? { type: 'server', message: formatValidationMessage(activeServerError) }
    : email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? { type: 'validate', message: 'El email no tiene un formato válido.' }
      : errors.email

  const generalServerError =
    activeServerError !== null && !esErrorEmailServidor
      ? formatValidationMessage(activeServerError)
      : null

  return (
    <form className="flex max-w-md flex-col gap-6" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      {generalServerError === null ? null : (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {generalServerError}
        </div>
      )}

      <FieldSet>
        <FieldLegend>Datos de contacto</FieldLegend>
        <FieldGroup>
          <Field data-invalid={errors.nombre !== undefined}>
            <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
            <Input id="nombre" aria-invalid={errors.nombre !== undefined} {...register('nombre')} />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>

          <Field data-invalid={errorEmail !== undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              aria-invalid={errorEmail !== undefined}
              {...register('email', {
                onChange: () => {
                  if (serverError !== null) setDismissedServerError(serverError)
                },
              })}
            />
            <FieldError>{errorEmail?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="telefono">Teléfono</FieldLabel>
            <Input id="telefono" type="tel" {...register('telefono')} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Crear publicador'}
        </Button>
        <Button asChild variant="ghost">
          <Link to="/publicadores">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
