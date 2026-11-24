import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from 'cn'

import { useCrearUsuario } from '@/api/usuarios'
import {
  authInputClassName,
  authLabelClassName,
  authLinkClassName,
} from '@/components/auth/auth-form-panel'
import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { useAuth } from '@/components/auth-provider'
import { GridSkeleton } from '@/components/query-state'
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
import { toUserMessage } from '@/lib/http'
import { registroSchema, toUsuarioRequest, type RegistroFormValues } from '@/lib/schemas'

export function RegistroPage() {
  const { isAuthenticated, isBootstrapping, login, hasRole } = useAuth()
  const crear = useCrearUsuario()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<RegistroFormValues>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      nombre: '',
      email: '',
      telefono: '',
      rol: 'TURISTA',
      contrasena: '',
      confirmarContrasena: '',
    },
    mode: 'onSubmit',
  })

  if (isBootstrapping) return <GridSkeleton />
  if (isAuthenticated) {
    if (hasRole('ADMINISTRADOR')) return <Navigate to="/admin" replace />
    if (hasRole('PUBLICADOR')) return <Navigate to="/publicador" replace />
    return <Navigate to="/descubrir" replace />
  }

  const { register, control, formState, handleSubmit } = form
  const { errors, isSubmitting } = formState
  const pending = isSubmitting || crear.isPending

  return (
    <AuthSplitLayout
      brandHeading="Creá tu cuenta"
      brandDescription="Unite como turista o publicador y empezá a explorar Córdoba con Viajesazo."
      formTitle="Crear cuenta"
      formSubtitle="Elegí el tipo de cuenta y completá tus datos. Cada cuenta tiene un solo rol."
      footer={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className={authLinkClassName}>
            Iniciá sesión
          </Link>
        </>
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setServerError(null)
          try {
            await crear.mutateAsync(toUsuarioRequest(values))
            await login({ email: values.email.trim(), contrasena: values.contrasena })
            toast.success(
              values.rol === 'PUBLICADOR'
                ? '¡Cuenta de publicador creada!'
                : '¡Cuenta creada! Ya podés planificar tu viaje.',
            )
            navigate(values.rol === 'PUBLICADOR' ? '/publicador' : '/descubrir', { replace: true })
          } catch (error) {
            setServerError(toUserMessage(error))
          }
        })}
      >
        {serverError === null ? null : (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {serverError}
          </div>
        )}

        <FieldSet>
          <FieldLegend className="sr-only">Datos de registro</FieldLegend>
          <FieldGroup className="space-y-4">
            <Field data-invalid={errors.rol !== undefined}>
              <FieldLabel className={authLabelClassName}>Tipo de cuenta</FieldLabel>
              <Controller
                control={control}
                name="rol"
                render={({ field }) => (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => field.onChange('TURISTA')}
                      className={cn(
                        'rounded-xl border-2 p-3 text-left text-sm transition-all',
                        field.value === 'TURISTA'
                          ? 'border-[#00658d] bg-sky-50 font-semibold text-[#00658d]'
                          : 'border-slate-200 text-[#3f484e] hover:border-slate-300',
                      )}
                    >
                      Turista
                      <span className="mt-1 block text-xs font-normal text-slate-500">
                        Planificar viajes y consultar agenda turística.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('PUBLICADOR')}
                      className={cn(
                        'rounded-xl border-2 p-3 text-left text-sm transition-all',
                        field.value === 'PUBLICADOR'
                          ? 'border-[#00658d] bg-sky-50 font-semibold text-[#00658d]'
                          : 'border-slate-200 text-[#3f484e] hover:border-slate-300',
                      )}
                    >
                      Publicador
                      <span className="mt-1 block text-xs font-normal text-slate-500">
                        Publicar eventos/actividades y ver tu agenda.
                      </span>
                    </button>
                  </div>
                )}
              />
              <FieldError>{errors.rol?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.nombre !== undefined}>
              <FieldLabel htmlFor="nombre" className={authLabelClassName}>
                Nombre
              </FieldLabel>
              <Input
                id="nombre"
                autoComplete="name"
                aria-invalid={errors.nombre !== undefined}
                className={authInputClassName}
                {...register('nombre')}
              />
              <FieldError>{errors.nombre?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.email !== undefined}>
              <FieldLabel htmlFor="email" className={authLabelClassName}>
                Email
              </FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email !== undefined}
                className={authInputClassName}
                {...register('email')}
              />
              <FieldError>{errors.email?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.telefono !== undefined}>
              <FieldLabel htmlFor="telefono" className={authLabelClassName}>
                Teléfono (opcional)
              </FieldLabel>
              <Input
                id="telefono"
                type="tel"
                autoComplete="tel"
                aria-invalid={errors.telefono !== undefined}
                className={authInputClassName}
                {...register('telefono')}
              />
              <FieldError>{errors.telefono?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.contrasena !== undefined}>
              <FieldLabel htmlFor="contrasena" className={authLabelClassName}>
                Contraseña
              </FieldLabel>
              <Input
                id="contrasena"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.contrasena !== undefined}
                className={authInputClassName}
                {...register('contrasena')}
              />
              <FieldError>{errors.contrasena?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.confirmarContrasena !== undefined}>
              <FieldLabel htmlFor="confirmarContrasena" className={authLabelClassName}>
                Confirmar contraseña
              </FieldLabel>
              <Input
                id="confirmarContrasena"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.confirmarContrasena !== undefined}
                className={authInputClassName}
                {...register('confirmarContrasena')}
              />
              <FieldError>{errors.confirmarContrasena?.message}</FieldError>
            </Field>
          </FieldGroup>
        </FieldSet>

        <Button
          type="submit"
          disabled={pending}
          className="h-10 w-full bg-[#00658d] text-white hover:bg-[#65b7e8]"
        >
          {pending ? 'Registrando…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthSplitLayout>
  )
}
