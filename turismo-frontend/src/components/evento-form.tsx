import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Controller, useFieldArray, useForm, type FieldError as RhfFieldError } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState, type ComponentProps } from 'react'

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
import { ImagenUploader } from '@/components/imagen-uploader'
import { UbicacionSelector } from '@/components/ubicacion-selector'
import {
  crearPropuestaSchema,
  formatValidationMessage,
  type EventoFormValues,
} from '@/lib/schemas'
import {
  CATEGORIA_LABELS,
  CATEGORIAS,
  DIA_SEMANA_LABELS,
  DIAS_SEMANA,
  MODALIDAD_LABELS,
  MODALIDADES,
  TIPO_ACCESO_LABELS,
  TIPO_PROPUESTA_LABELS,
  TIPOS_ACCESO,
  TIPOS_PROPUESTA,
  type PublicadorResponse,
  type TipoRegistro,
} from '@/types/api'

interface EventoFormProps {
  defaultValues: EventoFormValues
  publicadores: PublicadorResponse[]
  onSubmit: (values: EventoFormValues) => void
  /** Si se provee, habilita el selector "Evento / Actividad" para crear cualquiera de las dos propuestas. */
  onSubmitActividad?: (values: EventoFormValues) => void
  /** Si se fija, el formulario opera en ese modo sin mostrar el selector superior (ej: edición de actividad). */
  tipoFijo?: TipoRegistro
  isPending: boolean
  /** Error del backend para mostrar arriba del formulario; los de campo los pone zod. */
  serverError: string | null
  submitLabel: string
  cancelTo: string
  /** Coordenadas del evento en edición, para que el mapa del selector arranque centrado. */
  ubicacionInicial?: { latitud: number | null; longitud: number | null }
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
  onSubmitActividad,
  tipoFijo,
  isPending,
  serverError,
  submitLabel,
  cancelTo,
  ubicacionInicial,
}: EventoFormProps) {
  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>(tipoFijo ?? 'EVENTO')
  const esActividad =
    tipoFijo === 'ACTIVIDAD' || (onSubmitActividad !== undefined && tipoRegistro === 'ACTIVIDAD')

  const todayStr = (() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })()

  // En alta (sin fecha precargada) se exige que la fecha de inicio sea de hoy en adelante, igual que en Planificar.
  const esAlta = defaultValues.fechaInicio === ''
  const minFechaInicio = esAlta ? todayStr : undefined

  const form = useForm<EventoFormValues>({
    resolver: zodResolver(
      crearPropuestaSchema(esActividad ? 'ACTIVIDAD' : 'EVENTO', minFechaInicio),
    ),
    defaultValues,
    // Errores al enviar, y de ahí en adelante mientras se corrige. Validar en cada tecla desde
    // el arranque marca campos en rojo antes de que el usuario haya terminado de escribirlos.
    mode: 'onSubmit',
  })

  const { register, control, formState, watch, setValue, clearErrors } = form
  const { errors } = formState
  const { fields, append, remove } = useFieldArray({ control, name: 'imagenes' })
  const {
    fields: disponibilidadFields,
    append: appendDisponibilidad,
    remove: removeDisponibilidad,
  } = useFieldArray({ control, name: 'disponibilidades' })

  const tiposPropuestaOpciones = TIPOS_PROPUESTA

  const cambiarTipoRegistro = (nuevoTipo: TipoRegistro) => {
    setTipoRegistro(nuevoTipo)
    clearErrors()
  }

  // El bloque de arancel solo se muestra (y solo se exige) cuando el evento es arancelado.
  const esDePago = watch('tipoAcceso') === 'DE_PAGO'
  const montoEstimado = watch('montoEstimado')
  const sitioOficial = watch('sitioOficial')
  const fechaInicio = watch('fechaInicio')
  const fechaFin = watch('fechaFin')
  const horarioInicio = watch('horarioInicio')
  const horarioFin = watch('horarioFin')
  const duracionMinutos = watch('duracionMinutos') ?? ''
  const disponibilidades = watch('disponibilidades') ?? []

  const ubicacionRef = useRef<HTMLDivElement>(null)
  const [dismissedServerError, setDismissedServerError] = useState<string | null>(null)

  useEffect(() => {
    setDismissedServerError(null)
  }, [serverError])

  const activeServerError =
    serverError !== null && serverError !== dismissedServerError ? serverError : null

  const esErrorUbicacionServidor =
    activeServerError !== null &&
    /ubicaci[oó]n d(el evento|e la actividad|e la propuesta)|lugarRecinto|localidad|direcci[oó]n/i.test(
      activeServerError,
    )

  const esErrorImagenesServidor =
    activeServerError !== null && /im[aá]gen/i.test(activeServerError)

  const esErrorPublicadorServidor =
    activeServerError !== null && /publicador/i.test(activeServerError)

  useEffect(() => {
    if (
      esErrorUbicacionServidor &&
      ubicacionRef.current &&
      typeof ubicacionRef.current.scrollIntoView === 'function'
    ) {
      ubicacionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [esErrorUbicacionServidor])

  const dismissServerError = () => {
    if (serverError !== null) setDismissedServerError(serverError)
  }

  const errorMontoEstimado: RhfFieldError | undefined =
    esDePago && montoEstimado.trim().length > 0 && /^-\d/.test(montoEstimado.trim())
      ? { type: 'validate', message: 'El monto estimado no puede ser negativo.' }
      : esDePago &&
          montoEstimado.trim().length > 0 &&
          !/^\d+(\.\d{1,2})?$/.test(montoEstimado.trim())
        ? { type: 'validate', message: 'El monto estimado no tiene un formato válido.' }
        : errors.montoEstimado

  const errorSitioOficial: RhfFieldError | undefined =
    esDePago && sitioOficial.trim().length > 0 && !/^https?:\/\/.+/.test(sitioOficial.trim())
      ? { type: 'validate', message: 'El link al sitio oficial debe ser una URL http(s).' }
      : errors.sitioOficial

  const errorUbicacionServidor: RhfFieldError | undefined = esErrorUbicacionServidor
    ? { type: 'server', message: formatValidationMessage(activeServerError) }
    : undefined

  const errorFechaInicio: RhfFieldError | undefined =
    minFechaInicio && fechaInicio && fechaInicio < minFechaInicio
      ? { type: 'validate', message: 'La fecha de inicio no puede ser anterior a la fecha actual.' }
      : errors.fechaInicio

  const errorFechaFin: RhfFieldError | undefined =
    fechaInicio && fechaFin && fechaFin < fechaInicio
      ? { type: 'validate', message: 'La fecha de finalización no puede ser anterior a la de inicio.' }
      : errors.fechaFin

  const errorHorarioFin: RhfFieldError | undefined =
    horarioInicio && horarioFin && horarioFin <= horarioInicio
      ? { type: 'validate', message: 'El horario de finalización debe ser posterior al de inicio.' }
      : errors.horarioFin

  const errorDuracionMinutos: RhfFieldError | undefined =
    esActividad &&
    duracionMinutos.trim().length > 0 &&
    (!/^\d+$/.test(duracionMinutos.trim()) || Number(duracionMinutos.trim()) <= 0)
      ? { type: 'validate', message: 'La duración de la actividad debe ser mayor a cero.' }
      : errors.duracionMinutos

  const errorPublicador: RhfFieldError | undefined = esErrorPublicadorServidor
    ? { type: 'server', message: formatValidationMessage(activeServerError) }
    : errors.publicadorId

  const generalServerError =
    activeServerError !== null &&
    !esErrorUbicacionServidor &&
    !esErrorImagenesServidor &&
    !esErrorPublicadorServidor
      ? formatValidationMessage(activeServerError)
      : null

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        if (esActividad && onSubmitActividad) {
          onSubmitActividad(values)
        } else {
          onSubmit(values)
        }
      })}
    >
      {generalServerError === null ? null : (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {generalServerError}
        </div>
      )}

      {onSubmitActividad !== undefined ? (
        <div className="rounded-xl bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sm:p-6">
          <p className="mb-3 font-heading text-base font-bold text-[#191c1e]">
            ¿Qué tipo de propuesta turística vas a cargar?
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => cambiarTipoRegistro('EVENTO')}
              className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all ${
                !esActividad
                  ? 'border-[#00658d] bg-[#eaf6fc]/60 shadow-sm'
                  : 'border-[#e0e3e5] bg-white hover:border-slate-300'
              }`}
            >
              <span className="font-heading text-sm font-bold text-[#00658d]">
                Evento turístico
              </span>
              <span className="text-xs text-[#3f484e]">
                Tiene fechas puntuales de inicio y finalización (festivales, ferias, espectáculos, exposiciones…).
              </span>
            </button>
            <button
              type="button"
              onClick={() => cambiarTipoRegistro('ACTIVIDAD')}
              className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all ${
                esActividad
                  ? 'border-[#00658d] bg-[#eaf6fc]/60 shadow-sm'
                  : 'border-[#e0e3e5] bg-white hover:border-slate-300'
              }`}
            >
              <span className="font-heading text-sm font-bold text-[#00658d]">
                Actividad turística
              </span>
              <span className="text-xs text-[#3f484e]">
                Propuesta permanente o regular con duración en minutos y días/horarios de disponibilidad semanal.
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Sección 1: Datos Principales */}
      <FormSection
        number={1}
        title={esActividad ? 'Datos Principales de la Actividad' : 'Datos Principales del Evento'}
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
                    <SelectValue placeholder="Elegí una categoría" />
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

          <Controller
            control={control}
            name="tipoPropuesta"
            render={({ field }) => (
              <Field data-invalid={errors.tipoPropuesta !== undefined}>
                <FieldLabel htmlFor="tipoPropuesta">Tipo de propuesta</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tipoPropuesta" aria-invalid={errors.tipoPropuesta !== undefined}>
                    <SelectValue placeholder="Elegí un tipo de propuesta" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposPropuestaOpciones.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {TIPO_PROPUESTA_LABELS[tipo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.tipoPropuesta?.message}</FieldError>
              </Field>
            )}
          />

          <Controller
            control={control}
            name="modalidad"
            render={({ field }) => (
              <Field data-invalid={errors.modalidad !== undefined}>
                <FieldLabel htmlFor="modalidad">Modalidad</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="modalidad" aria-invalid={errors.modalidad !== undefined}>
                    <SelectValue placeholder="Elegí una modalidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALIDADES.map((modalidad) => (
                      <SelectItem key={modalidad} value={modalidad}>
                        {MODALIDAD_LABELS[modalidad]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.modalidad?.message}</FieldError>
              </Field>
            )}
          />
        </FieldGroup>
      </FormSection>

      {/* Sección 2: Acceso y Arancel */}
      <FormSection
        number={2}
        title="Tipo de Acceso y Arancel"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        }
      >
        <FieldGroup>
          <Controller
            control={control}
            name="tipoAcceso"
            render={({ field }) => (
              <Field data-invalid={errors.tipoAcceso !== undefined}>
                <FieldLabel htmlFor="tipoAcceso">Tipo de acceso</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tipoAcceso" aria-invalid={errors.tipoAcceso !== undefined}>
                    <SelectValue placeholder="Gratuito" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ACCESO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {TIPO_ACCESO_LABELS[tipo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.tipoAcceso?.message}</FieldError>
              </Field>
            )}
          />

          {esDePago && !esActividad ? (
            <>
              <TextField
                id="montoEstimado"
                label="Monto estimado"
                type="number"
                description="Obligatorio para un evento arancelado."
                error={errorMontoEstimado}
                inputProps={{ step: '0.01', min: '0', ...register('montoEstimado') }}
              />
              <TextField
                id="sitioOficial"
                label="Sitio oficial de la boletería o entradas"
                description="URL completa, con http:// o https://."
                error={errorSitioOficial}
                inputProps={{ type: 'url', ...register('sitioOficial') }}
              />
              <Field data-invalid={errors.descripcionArancel !== undefined}>
                <FieldLabel htmlFor="descripcionArancel">Detalle del arancel</FieldLabel>
                <Textarea
                  id="descripcionArancel"
                  rows={2}
                  placeholder="Ej.: entrada general $1500, menores gratis"
                  aria-invalid={errors.descripcionArancel !== undefined}
                  {...register('descripcionArancel')}
                />
                <FieldDescription>Opcional.</FieldDescription>
                <FieldError>{errors.descripcionArancel?.message}</FieldError>
              </Field>
            </>
          ) : null}
        </FieldGroup>
      </FormSection>

      {/* Sección 3: Ubicación */}
      <div ref={ubicacionRef}>
        <FormSection
          number={3}
          title="Ubicación en Córdoba"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          }
        >
          <UbicacionSelector
            onLugarRecintoChange={(value) => {
              dismissServerError()
              setValue('lugarRecinto', value)
            }}
            onLocalidadChange={(value) => {
              dismissServerError()
              setValue('localidad', value)
            }}
            onDireccionChange={(value) => {
              dismissServerError()
              setValue('direccion', value)
            }}
            latitudInicial={ubicacionInicial?.latitud ?? null}
            longitudInicial={ubicacionInicial?.longitud ?? null}
          />
          <FieldGroup>
            <TextField
              id="lugarRecinto"
              label="Lugar o recinto"
              description="Ej.: Anfiteatro José Hernández, Plaza San Martín."
              error={errors.lugarRecinto ?? (errorUbicacionServidor ? { type: 'server', message: '' } : undefined)}
              inputProps={register('lugarRecinto', { onChange: dismissServerError })}
            />
            <TextField
              id="localidad"
              label="Ciudad / Localidad"
              error={errors.localidad ?? (errorUbicacionServidor ? { type: 'server', message: '' } : undefined)}
              inputProps={register('localidad', { onChange: dismissServerError })}
            />
            <TextField
              id="direccion"
              label="Dirección exacta o referencia"
              error={errors.direccion ?? errorUbicacionServidor}
              inputProps={register('direccion', { onChange: dismissServerError })}
            />
          </FieldGroup>
        </FormSection>
      </div>

      {/* Sección 4: Calendario y Horarios (Evento) o Duración y Disponibilidad Semanal (Actividad) */}
      {esActividad ? (
        <FormSection
          number={4}
          title="Duración y Disponibilidad Semanal"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        >
          <FieldDescription>
            Indicá cuánto dura la actividad en minutos y en qué días y horarios de la semana está disponible.
          </FieldDescription>
          <FieldGroup>
            <TextField
              id="duracionMinutos"
              label="Duración estimada (en minutos)"
              type="number"
              description="Obligatorio. Debe ser un entero mayor a 0 (ej.: 90)."
              error={errorDuracionMinutos}
              inputProps={{
                min: '1',
                step: '1',
                placeholder: '90',
                ...register('duracionMinutos'),
              }}
            />

            <div className="flex flex-col gap-3">
              <FieldLabel>Franjas de disponibilidad semanal (opcional)</FieldLabel>
              {disponibilidadFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin franjas cargadas. Podés agregar los días y horarios en que funciona la actividad.
                </p>
              ) : (
                disponibilidadFields.map((item, index) => {
                  const rowValues = disponibilidades[index]
                  const rowServerErrors = disponibilidadError(errors.disponibilidades, index)
                  const liveHoraFinError: RhfFieldError | undefined =
                    rowValues?.horaInicio &&
                    rowValues?.horaFin &&
                    rowValues.horaFin <= rowValues.horaInicio
                      ? {
                          type: 'validate',
                          message:
                            'La hora de fin de una disponibilidad debe ser posterior a la de inicio.',
                        }
                      : rowServerErrors?.horaFin

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 items-start gap-3 rounded-xl border border-[#e0e3e5] bg-slate-50/60 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <Controller
                        control={control}
                        name={`disponibilidades.${index}.diaSemana`}
                        render={({ field: diaField }) => (
                          <Field data-invalid={rowServerErrors?.diaSemana !== undefined}>
                            <FieldLabel htmlFor={`diaSemana-${index}`}>Día</FieldLabel>
                            <Select value={diaField.value} onValueChange={diaField.onChange}>
                              <SelectTrigger
                                id={`diaSemana-${index}`}
                                aria-invalid={rowServerErrors?.diaSemana !== undefined}
                              >
                                <SelectValue placeholder="Elegí un día" />
                              </SelectTrigger>
                              <SelectContent>
                                {DIAS_SEMANA.map((dia) => (
                                  <SelectItem key={dia} value={dia}>
                                    {DIA_SEMANA_LABELS[dia]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FieldError>{rowServerErrors?.diaSemana?.message}</FieldError>
                          </Field>
                        )}
                      />

                      <TextField
                        id={`horaInicio-${index}`}
                        label="Hora de inicio"
                        type="time"
                        error={rowServerErrors?.horaInicio}
                        inputProps={register(`disponibilidades.${index}.horaInicio`)}
                      />

                      <TextField
                        id={`horaFin-${index}`}
                        label="Hora de fin"
                        type="time"
                        error={liveHoraFinError}
                        inputProps={register(`disponibilidades.${index}.horaFin`)}
                      />

                      <div className="pt-6">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Quitar disponibilidad ${index + 1}`}
                          onClick={() => removeDisponibilidad(index)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendDisponibilidad({ diaSemana: 'MONDAY', horaInicio: '09:00', horaFin: '12:00' })
                  }
                >
                  <PlusIcon data-icon="inline-start" aria-hidden />
                  Agregar franja horaria
                </Button>
              </div>
            </div>
          </FieldGroup>
        </FormSection>
      ) : (
        <FormSection
          number={4}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="fechaInicio"
                label="Fecha de inicio"
                type="date"
                error={errorFechaInicio}
                inputProps={{
                  min: minFechaInicio,
                  ...register('fechaInicio'),
                }}
              />
              <TextField
                id="fechaFin"
                label="Fecha de finalización"
                type="date"
                error={errorFechaFin}
                inputProps={{
                  min:
                    fechaInicio && (!minFechaInicio || fechaInicio >= minFechaInicio)
                      ? fechaInicio
                      : minFechaInicio,
                  ...register('fechaFin'),
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                error={errorHorarioFin}
                inputProps={register('horarioFin')}
              />
            </div>
          </FieldGroup>
        </FormSection>
      )}

      {/* Sección 5: Imágenes */}
      <FormSection
        number={5}
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
          Subí archivos o pegá URLs completas, una por fila. Para sacar todas, quitá las filas: una
          lista vacía las borra del evento.
        </FieldDescription>

        <ImagenUploader
          onUploaded={(url) => {
            dismissServerError()
            append({ url })
          }}
        />

        {esErrorImagenesServidor ? (
          <FieldError>{formatValidationMessage(activeServerError)}</FieldError>
        ) : null}

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
                      {...register(`imagenes.${index}.url`, { onChange: dismissServerError })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar la imagen ${index + 1}`}
                      onClick={() => {
                        dismissServerError()
                        remove(index)
                      }}
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
              onClick={() => {
                dismissServerError()
                append({ url: '' })
              }}
            >
              <PlusIcon data-icon="inline-start" aria-hidden />
              Agregar imagen
            </Button>
          </div>
        </FieldGroup>
      </FormSection>

      {/* Sección 6: Publicador */}
      <FormSection
        number={6}
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
              <Field data-invalid={errorPublicador !== undefined}>
                <FieldLabel htmlFor="publicadorId">Publicador</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(val) => {
                    dismissServerError()
                    field.onChange(val)
                  }}
                >
                  <SelectTrigger id="publicadorId" aria-invalid={errorPublicador !== undefined}>
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
                <FieldError>{errorPublicador?.message}</FieldError>
              </Field>
            )}
          />
        </FieldGroup>
      </FormSection>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? 'Guardando…'
            : esActividad && tipoFijo === undefined
              ? 'Crear actividad'
              : submitLabel}
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
      <div className="flex items-center gap-2 border-b border-[#e0e3e5] pb-2">
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

function disponibilidadError(
  errors: unknown,
  index: number,
):
  | {
      diaSemana?: RhfFieldError
      horaInicio?: RhfFieldError
      horaFin?: RhfFieldError
    }
  | undefined {
  const arrayErrors = errors as
    | Array<
        | {
            diaSemana?: RhfFieldError
            horaInicio?: RhfFieldError
            horaFin?: RhfFieldError
          }
        | undefined
      >
    | undefined

  return arrayErrors?.[index]
}
