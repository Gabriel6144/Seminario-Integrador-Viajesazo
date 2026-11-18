import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

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
import { formatValidationMessage, registroSchema, type RegistroFormValues } from '@/lib/schemas'

interface UsuarioFormProps {
  defaultValues: RegistroFormValues
  onSubmit: (values: RegistroFormValues) => void
  onCancel: () => void
  isPending: boolean
  serverError: string | null
  submitLabel?: string
}

export function UsuarioForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  serverError,
  submitLabel = 'Guardar usuario',
}: UsuarioFormProps) {
  const form = useForm<RegistroFormValues>({
    resolver: zodResolver(registroSchema),
    defaultValues,
    mode: 'onSubmit',
  })
  const { register, formState } = form
  const { errors } = formState

  const [dismissedServerError, setDismissedServerError] = useState<string | null>(null)

  useEffect(() => {
    setDismissedServerError(null)
  }, [serverError])

  const activeServerError =
    serverError !== null && serverError !== dismissedServerError ? serverError : null
  const esErrorEmailServidor = activeServerError !== null && /email/i.test(activeServerError)

  const errorEmail = esErrorEmailServidor
    ? { type: 'server', message: formatValidationMessage(activeServerError) }
    : errors.email

  const generalServerError =
    activeServerError !== null && !esErrorEmailServidor
      ? formatValidationMessage(activeServerError)
      : null

  return (
    <form className="space-y-6" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      {generalServerError === null ? null : (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {generalServerError}
        </div>
      )}

      <FieldSet>
        <FieldLegend className="sr-only">Datos del usuario</FieldLegend>
        <FieldGroup className="space-y-5">
          <input type="hidden" {...register('rol')} />
          <Field data-invalid={errors.nombre !== undefined}>
            <FieldLabel htmlFor="nombre">
              Nombre <span className="text-red-500">*</span>
            </FieldLabel>
            <Input
              id="nombre"
              placeholder="Ej. Ana Pérez"
              aria-invalid={errors.nombre !== undefined}
              {...register('nombre')}
            />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>

          <Field data-invalid={errorEmail !== undefined}>
            <FieldLabel htmlFor="email">
              Correo electrónico <span className="text-red-500">*</span>
            </FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="usuario@email.com"
              aria-invalid={errorEmail !== undefined}
              {...register('email', {
                onChange: () => {
                  if (serverError !== null) setDismissedServerError(serverError)
                },
              })}
            />
            <FieldError>{errorEmail?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.telefono !== undefined}>
            <FieldLabel htmlFor="telefono">Teléfono (opcional)</FieldLabel>
            <Input
              id="telefono"
              type="tel"
              placeholder="351-5551234"
              aria-invalid={errors.telefono !== undefined}
              {...register('telefono')}
            />
            <FieldError>{errors.telefono?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.contrasena !== undefined}>
            <FieldLabel htmlFor="contrasena">
              Contraseña <span className="text-red-500">*</span>
            </FieldLabel>
            <Input
              id="contrasena"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.contrasena !== undefined}
              {...register('contrasena')}
            />
            <FieldError>{errors.contrasena?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.confirmarContrasena !== undefined}>
            <FieldLabel htmlFor="confirmarContrasena">
              Confirmar contraseña <span className="text-red-500">*</span>
            </FieldLabel>
            <Input
              id="confirmarContrasena"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.confirmarContrasena !== undefined}
              {...register('confirmarContrasena')}
            />
            <FieldError>{errors.confirmarContrasena?.message}</FieldError>
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="flex items-start gap-3 rounded-xl border border-gray-200/80 bg-gray-50 p-3.5 text-xs text-muted-foreground">
        <span className="material-symbols-outlined mt-0.5 text-base text-sky-600">info</span>
        <span>
          El registro público crea una cuenta con rol <strong className="text-gray-700">Turista</strong>.
          Un administrador puede asignar otros roles después.
        </span>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#5ab2e6] text-white hover:bg-[#4aa4d9] sm:w-auto"
        >
          {isPending ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
