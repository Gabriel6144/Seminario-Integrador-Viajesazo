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

      <FieldSet>
        <FieldLegend>Datos</FieldLegend>
        <FieldGroup>
          <TextField
            id="nombre"
            label="Nombre"
            error={errors.nombre}
            inputProps={register('nombre')}
          />

          <Field data-invalid={errors.descripcion !== undefined}>
            <FieldLabel htmlFor="descripcion">Descripción</FieldLabel>
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
                <FieldLabel htmlFor="categoria">Categoría</FieldLabel>
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
      </FieldSet>

      <FieldSet>
        <FieldLegend>Cuándo</FieldLegend>
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
      </FieldSet>

      <FieldSet>
        <FieldLegend>Dónde</FieldLegend>
        <FieldGroup>
          <TextField
            id="localidad"
            label="Localidad"
            error={errors.localidad}
            inputProps={register('localidad')}
          />
          <TextField
            id="direccion"
            label="Dirección"
            error={errors.direccion}
            inputProps={register('direccion')}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Clasificación</FieldLegend>
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
      </FieldSet>

      <FieldSet>
        <FieldLegend>Imágenes</FieldLegend>
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
      </FieldSet>

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
