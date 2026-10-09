import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Controller, useFieldArray, useForm, type FieldError as RhfFieldError } from 'react-hook-form'
import { Link } from 'react-router-dom'
import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { eventoSchema, type EventoFormValues } from '@/lib/schemas'
import { CATEGORIA_LABELS, CATEGORIAS, type PublicadorResponse } from '@/types/api'

interface EventoFormProps {
  defaultValues: EventoFormValues
  publicadores: PublicadorResponse[]
  onSubmit: (values: EventoFormValues) => void
  isPending: boolean
  /** Error del backend para mostrar arriba del formulario; los de campo los pone zod. */
  serverError: string | null
  submitLabel: string
  cancelTo: string
}

/**
 * Formulario de alta y de modificación de evento.
 *
 * Es un solo componente para las dos operaciones a propósito: el contrato de `POST` y de `PUT` es
 * el mismo `EventoRequest`, así que duplicar el formulario garantiza que un día los dos no
 * diverjan. Lo único que cambia entre alta y edición son los `defaultValues`.
 *
 * Lo que **no** hace es armar el body: devuelve `EventoFormValues` y quien lo llama lo pasa por
 * `toEventoRequest`. Así la conversión de filas de imágenes a `string[]` y el `"" → null` de los
 * opcionales quedan en un solo lugar testeable, en vez de repartidos entre el submit del
 * formulario y el de cada página.
 */
export function EventoForm({
  defaultValues,
  publicadores,
  onSubmit,
  isPending,
  serverError,
  submitLabel,
  cancelTo,
}: EventoFormProps) {
  const form = useForm<EventoFormValues>({
    resolver: zodResolver(eventoSchema),
    defaultValues,
    // Errores al enviar, y de ahí en adelante mientras se corrige. Validar en cada tecla desde
    // el arranque marca campos en rojo antes de que el usuario haya terminado de escribirlos.
    mode: 'onSubmit',
  })

  const { register, control, formState } = form
  const { errors } = formState
  const { fields, append, remove } = useFieldArray({ control, name: 'imagenes' })

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      {serverError === null ? null : (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      {/* Sección 1: Datos Principales */}
      <FormSection
        number={1}
        title="Datos Principales del Evento"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        }
      >
        <FieldGroup>
          <TextField
            id="nombre"
            label="Nombre del evento"
            error={errors.nombre}
            inputProps={register('nombre')}
          />

          <Field data-invalid={errors.descripcion !== undefined}>
            <FieldLabel htmlFor="descripcion">Descripción completa</FieldLabel>
            <Textarea
              id="descripcion"
              rows={3}
              aria-invalid={errors.descripcion !== undefined}
              {...register('descripcion')}
            />
            <FieldError>{errors.descripcion?.message}</FieldError>
          </Field>

          <Controller
            control={control}
            name="categoria"
            render={({ field }) => (
              <Field data-invalid={errors.categoria !== undefined}>
                <FieldLabel htmlFor="categoria">Categoría turística</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="categoria" aria-invalid={errors.categoria !== undefined}>
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>
                        {CATEGORIA_LABELS[categoria]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.categoria?.message}</FieldError>
              </Field>
            )}
          />
        </FieldGroup>
      </FormSection>

      {/* Sección 2: Ubicación */}
      <FormSection
        number={2}
        title="Ubicación en Córdoba"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        }
      >
        <FieldGroup>
          <TextField
            id="localidad"
            label="Localidad"
            error={errors.localidad}
            inputProps={register('localidad')}
          />
          <TextField
            id="direccion"
            label="Dirección exacta o referencia"
            error={errors.direccion}
            inputProps={register('direccion')}
          />
        </FieldGroup>
      </FormSection>

      {/* Sección 3: Calendario y Horarios */}
      <FormSection
        number={3}
        title="Calendario y Horarios"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        }
      >
        <FieldDescription>
          La fecha de finalización no puede ser anterior a la de inicio.
        </FieldDescription>
        <FieldGroup>
          <TextField
            id="fechaInicio"
            label="Fecha de inicio"
            type="date"
            error={errors.fechaInicio}
            inputProps={register('fechaInicio')}
          />
          <TextField
            id="fechaFin"
            label="Fecha de finalización"
            type="date"
            error={errors.fechaFin}
            inputProps={register('fechaFin')}
          />
          <TextField
            id="horarioInicio"
            label="Horario de inicio"
            type="time"
            description="Opcional."
            error={errors.horarioInicio}
            inputProps={register('horarioInicio')}
          />
          <TextField
            id="horarioFin"
            label="Horario de finalización"
            type="time"
            description="Opcional, y solo se compara si también cargás el de inicio."
            error={errors.horarioFin}
            inputProps={register('horarioFin')}
          />
        </FieldGroup>
      </FormSection>

      {/* Sección 4: Imágenes */}
      <FormSection
        number={4}
        title="Imágenes del Evento"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        }
      >
        <FieldDescription>
          URLs completas, una por fila. Para sacar todas, quitá las filas: una lista vacía las
          borra del evento.
        </FieldDescription>

        <FieldGroup>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin imágenes.</p>
          ) : (
            fields.map((field, index) => {
              const rowError = imagenError(errors.imagenes, index)

              return (
                <Field key={field.id} data-invalid={rowError !== undefined}>
                  <div className="flex items-start gap-2">
                    <Input
                      className="flex-1"
                      type="url"
                      placeholder="https://…"
                      aria-label={`URL de la imagen ${index + 1}`}
                      aria-invalid={rowError !== undefined}
                      {...register(`imagenes.${index}.url`)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar la imagen ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <FieldError>{rowError?.message}</FieldError>
                </Field>
              )
            })
          )}

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ url: '' })}
            >
              <PlusIcon data-icon="inline-start" aria-hidden />
              Agregar imagen
            </Button>
          </div>
        </FieldGroup>
      </FormSection>

      {/* Sección 5: Publicador */}
      <FormSection
        number={5}
        title="Publicador"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
          </svg>
        }
      >
        <FieldGroup>
          <Controller
            control={control}
            name="publicadorId"
            render={({ field }) => (
              <Field data-invalid={errors.publicadorId !== undefined}>
                <FieldLabel htmlFor="publicadorId">Publicador</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="publicadorId" aria-invalid={errors.publicadorId !== undefined}>
                    <SelectValue placeholder="Elegí un publicador" />
                  </SelectTrigger>
                  <SelectContent>
                    {publicadores.map((publicador) => (
                      <SelectItem key={publicador.id} value={String(publicador.id)}>
                        {publicador.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.publicadorId?.message}</FieldError>
              </Field>
            )}
          />
        </FieldGroup>
      </FormSection>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : submitLabel}
        </Button>
        <Button asChild variant="ghost">
          <Link to={cancelTo}>Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}

/**
 * Sección de formulario con número, icono y título.
 *
 * Diseño según prototipo Stitch: borde inferior, número circular y icono a la izquierda.
 */
function FormSection({
  number,
  title,
  icon,
  children,
}: {
  number: number
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <FieldSet className="rounded-xl bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sm:p-6">
      <div className="mb-4 flex items-center gap-2 border-b border-[#e0e3e5] pb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00658d] text-sm font-bold text-white">
          {number}
        </span>
        <span className="text-[#00658d]">{icon}</span>
        <FieldLegend className="font-heading text-lg font-bold text-[#191c1e]">
          {title}
        </FieldLegend>
      </div>
      {children}
    </FieldSet>
  )
}

/**
 * `Field` + `FieldLabel` + `Input` + error, que es la combinación que se repite en casi todos los
 * campos. Tenerla en un solo lugar es lo que garantiza que el `id`, el `htmlFor` y el
 * `aria-invalid` no se desincronicen entre campos.
 */
function TextField({
  id,
  label,
  error,
  description,
  type,
  inputProps,
}: {
  id: string
  label: string
  error: RhfFieldError | undefined
  description?: string
  type?: ComponentProps<typeof Input>['type']
  inputProps: ComponentProps<typeof Input>
}) {
  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} type={type} aria-invalid={error !== undefined} {...inputProps} />
      {description === undefined ? null : <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error?.message}</FieldError>
    </Field>
  )
}

/**
 * Error de una fila del `useFieldArray`.
 *
 * Con un array de objetos, RHF reparte los errores en `errors.imagenes[0].url`; el mensaje del
 * array entero, si lo hubiera, queda en `errors.imagenes.message`. El tipo de esa parte del
 * `FieldErrors` es una intersección de array y objeto, así que el acceso viene con casts: no hay
 * forma de que el indexado compile solo.
 */
function imagenError(
  errors: unknown,
  index: number,
): { message?: string } | undefined {
  const arrayErrors = errors as Array<Record<string, RhfFieldError> | undefined> | undefined

  return arrayErrors?.[index]?.url
}
