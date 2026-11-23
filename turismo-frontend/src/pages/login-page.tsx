import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { useForgotPassword } from '@/api/auth'
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
import {
  forgotPasswordSchema,
  loginSchema,
  toLoginRequest,
  type ForgotPasswordFormValues,
  type LoginFormValues,
} from '@/lib/schemas'
import { cn } from 'cn'

const FORGOT_SUCCESS_MESSAGE =
  'Si el correo existe, recibirás un mail para restablecer tu contraseña.'

function safeNext(raw: string | null): string {
  if (raw === null || raw.length === 0) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

function homeForUser(roles: string[] | undefined): string {
  if (roles?.includes('ADMINISTRADOR')) return '/admin'
  if (roles?.includes('PUBLICADOR')) return '/publicador'
  return '/propuestas'
}

export function LoginPage() {
  const { login, isAuthenticated, isBootstrapping, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [view, setView] = useState<'login' | 'forgot'>('login')
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const forgotPassword = useForgotPassword()

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', contrasena: '' },
    mode: 'onSubmit',
  })

  const forgotForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  })

  if (isBootstrapping) return <GridSkeleton />
  if (isAuthenticated) {
    const next = searchParams.get('next')
    const target = next ? safeNext(next) : homeForUser(user?.roles)
    return <Navigate to={target} replace />
  }

  if (view === 'forgot') {
    const { register, formState, handleSubmit } = forgotForm
    const { errors, isSubmitting } = formState

    return (
      <AuthSplitLayout
        brandHeading="Recuperá el acceso"
        brandDescription="Te ayudamos a volver a planificar tu próximo viaje por Córdoba."
        formTitle="Recuperar contraseña"
        formSubtitle="Ingresá tu correo y te enviaremos instrucciones si la cuenta existe."
      >
        <form
          className="space-y-5"
          noValidate
          onSubmit={handleSubmit(async (values) => {
            setServerError(null)
            setForgotSuccess(false)
            try {
              await forgotPassword.mutateAsync({ email: values.email.trim() })
              setForgotSuccess(true)
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

          {forgotSuccess ? (
            <div
              role="status"
              className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-[#00658d]"
            >
              {FORGOT_SUCCESS_MESSAGE}
            </div>
          ) : null}

          <FieldSet>
            <FieldLegend className="sr-only">Email de recuperación</FieldLegend>
            <FieldGroup className="space-y-4">
              <Field data-invalid={errors.email !== undefined}>
                <FieldLabel htmlFor="forgot-email" className={authLabelClassName}>
                  Email
                </FieldLabel>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={errors.email !== undefined}
                  className={authInputClassName}
                  {...register('email')}
                />
                <FieldError>{errors.email?.message}</FieldError>
              </Field>
            </FieldGroup>
          </FieldSet>

          <Button
            type="submit"
            disabled={isSubmitting || forgotPassword.isPending}
            className="h-10 w-full bg-[#00658d] text-white hover:bg-[#65b7e8]"
          >
            {isSubmitting || forgotPassword.isPending ? 'Enviando…' : 'Enviar'}
          </Button>

          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-center gap-2 text-sm',
              authLinkClassName,
            )}
            onClick={() => {
              setView('login')
              setServerError(null)
              setForgotSuccess(false)
              forgotForm.reset()
            }}
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Volver al inicio de sesión
          </button>
        </form>
      </AuthSplitLayout>
    )
  }

  const { register, formState, handleSubmit } = loginForm
  const { errors, isSubmitting } = formState

  return (
    <AuthSplitLayout
      brandHeading="Tu viaje empieza acá"
      brandDescription="Entrá para planificar circuitos, guardar borradores y descubrir propuestas en Córdoba."
      formTitle="Iniciar sesión"
      formSubtitle="Usá tu email y contraseña para continuar."
      footer={
        <>
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className={authLinkClassName}>
            Registrate
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
            const logged = await login(toLoginRequest(values))
            const next = searchParams.get('next')
            navigate(next ? safeNext(next) : homeForUser(logged.roles), { replace: true })
          } catch (error) {
            setServerError(toUserMessage(error))
          }
        })}
      >
        {serverError === null ? null : (
          <div
            role="alert"
            className="rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200"
          >
            {serverError}
          </div>
        )}

        <FieldSet>
          <FieldLegend className="sr-only">Credenciales</FieldLegend>
          <FieldGroup className="space-y-4">
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

            <Field data-invalid={errors.contrasena !== undefined}>
              <FieldLabel htmlFor="contrasena" className={authLabelClassName}>
                Contraseña
              </FieldLabel>
              <div className="relative">
                <Input
                  id="contrasena"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={errors.contrasena !== undefined}
                  className={cn(authInputClassName, 'pr-10')}
                  {...register('contrasena')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-[#191c1e]"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" aria-hidden />
                  ) : (
                    <EyeIcon className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
              <FieldError>{errors.contrasena?.message}</FieldError>
            </Field>
          </FieldGroup>
        </FieldSet>

        <div className="flex justify-end">
          <button
            type="button"
            className={cn('text-sm', authLinkClassName)}
            onClick={() => {
              setView('forgot')
              setServerError(null)
              setForgotSuccess(false)
              forgotForm.reset({ email: loginForm.getValues('email') })
            }}
          >
            ¿Olvidó su contraseña?
          </button>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 w-full bg-[#00658d] text-white hover:bg-[#65b7e8]"
        >
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </AuthSplitLayout>
  )
}
