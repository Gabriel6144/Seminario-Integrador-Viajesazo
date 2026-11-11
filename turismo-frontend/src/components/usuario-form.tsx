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
import { cn } from '@/lib/utils'
import { formatValidationMessage, usuarioSchema, type UsuarioFormValues } from '@/lib/schemas'
import { ROLES_USUARIO, type RolUsuario } from '@/types/api'

interface UsuarioFormProps {
  defaultValues: UsuarioFormValues
  onSubmit: (values: UsuarioFormValues) => void
  onCancel: () => void
  isPending: boolean
  serverError: string | null
}

const ROLE_META: Record<RolUsuario, { icon: string; desc: string; tone: string; ring: string }> = {
  TURISTA: {
    icon: 'travel_explore',
    desc: 'Explora y arma itinerarios.',
    tone: 'text-sky-700',
    ring: 'border-sky-500 bg-sky-50/60',
  },
  PUBLICADOR: {
    icon: 'campaign',
    desc: 'Carga y edita eventos oficiales.',
    tone: 'text-emerald-700',
    ring: 'border-emerald-500 bg-emerald-50/50',
  },
  ADMINISTRADOR: {
    icon: 'admin_panel_settings',
    desc: 'Control global de plataforma.',
    tone: 'text-purple-700',
    ring: 'border-purple-500 bg-purple-50/50',
  },
}

export function UsuarioForm({ defaultValues, onSubmit, onCancel, isPending, serverError }: UsuarioFormProps) {
  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
    defaultValues,
    mode: 'onSubmit',
  })
  const { register, formState, watch, setValue } = form
  const { errors } = formState

  const email = watch('email')
  const rol = watch('rol')
  const [dismissedServerError, setDismissedServerError] = useState<string | null>(null)

  useEffect(() => {
    setDismissedServerError(null)
  }, [serverError])

  const activeServerError =
    serverError !== null && serverError !== dismissedServerError ? serverError : null
  const esErrorEmailServidor = activeServerError !== null && /email/i.test(activeServerError)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const errorEmail =
    esErrorEmailServidor
      ? { type: 'server', message: formatValidationMessage(activeServerError) }
      : email.trim().length > 0 && !emailRegex.test(email.trim())
        ? { type: 'validate', message: 'El email no tiene un formato válido.' }
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
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field data-invalid={errors.nombre !== undefined}>
              <FieldLabel htmlFor="nombre">Nombre <span className="text-red-500">*</span></FieldLabel>
              <Input id="nombre" placeholder="Ej. Juan" aria-invalid={errors.nombre !== undefined} {...register('nombre')} />
              <FieldError>{errors.nombre?.message}</FieldError>
            </Field>
            <Field data-invalid={errors.apellido !== undefined}>
              <FieldLabel htmlFor="apellido">Apellido <span className="text-red-500">*</span></FieldLabel>
              <Input id="apellido" placeholder="Ej. Pérez" aria-invalid={errors.apellido !== undefined} {...register('apellido')} />
              <FieldError>{errors.apellido?.message}</FieldError>
            </Field>
          </div>

          <Field data-invalid={errorEmail !== undefined}>
            <FieldLabel htmlFor="email">Correo Electrónico <span className="text-red-500">*</span></FieldLabel>
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
            <p className="text-xs text-muted-foreground">
              Se enviará un correo para verificar y definir su contraseña de acceso.
            </p>
            <FieldError>{errorEmail?.message as string | undefined}</FieldError>
          </Field>

          <Field data-invalid={errors.rol !== undefined}>
            <FieldLabel>Rol de Usuario <span className="text-red-500">*</span></FieldLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Rol de usuario">
              {ROLES_USUARIO.map((r) => {
                const selected = rol === r
                const meta = ROLE_META[r]
                return (
                  <label
                    key={r}
                    className={cn(
                      'relative flex cursor-pointer flex-col rounded-xl border-2 p-4 text-left transition',
                      selected ? meta.ring : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60',
                    )}
                  >
                    <input
                      type="radio"
                      value={r}
                      className="sr-only"
                      {...register('rol')}
                      onChange={() => setValue('rol', r, { shouldValidate: true, shouldDirty: true })}
                    />
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn('material-symbols-outlined text-2xl', selected ? meta.tone : 'text-gray-500')}>{meta.icon}</span>
                      <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border-2', selected ? 'border-current ' + meta.tone : 'border-gray-300')}>
                        {selected ? <span className={cn('h-2 w-2 rounded-full', r === 'TURISTA' ? 'bg-sky-600' : r === 'PUBLICADOR' ? 'bg-emerald-600' : 'bg-purple-600')} /> : null}
                      </span>
                    </div>
                    <span className="font-heading text-sm font-bold text-gray-900">{r}</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">{meta.desc}</span>
                  </label>
                )
              })}
            </div>
            <FieldError>{errors.rol?.message}</FieldError>
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="flex items-start gap-3 rounded-xl border border-gray-200/80 bg-gray-50 p-3.5 text-xs text-muted-foreground">
        <span className="material-symbols-outlined mt-0.5 text-base text-sky-600">info</span>
        <span>
          El usuario recibirá estado <strong className="text-gray-700">Activo</strong> inmediatamente después del guardado. Podrá revocar accesos en cualquier momento.
        </span>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="w-full bg-[#5ab2e6] text-white hover:bg-[#4aa4d9] sm:w-auto">
          {isPending ? 'Guardando…' : 'Guardar Usuario'}
        </Button>
      </div>
    </form>
  )
}


