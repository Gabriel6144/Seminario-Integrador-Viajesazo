import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Controller, useFieldArray, useForm, type FieldError as RhfFieldError, type FieldPath } from 'react-hook-form'
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
import { AgendaPublicadorModal } from '@/components/evento-form/agenda-publicador-modal'
import { FechaRangoCards } from '@/components/evento-form/fecha-rango-cards'
import { HoraRangoCards } from '@/components/evento-form/hora-rango-cards'
import {
  crearPropuestaSchema,
  formatValidationMessage,
  type EventoFormValues,
} from '@/lib/schemas'
import {
  CATEGORIA_LABELS,
  CATEGORIAS,
  CATEGORIA_DESCRIPCIONES,
  DIA_SEMANA_LABELS,
  DIAS_SEMANA,
  MODALIDAD_LABELS,
  MODALIDADES,
  TIPO_ACCESO_LABELS,
  TIPO_PROPUESTA_DESCRIPCIONES,
  TIPO_PROPUESTA_LABELS,
  TIPOS_ACCESO,
  TIPOS_PROPUESTA_ACTIVIDAD,
  TIPOS_PROPUESTA_EVENTO,
  type Categoria,
  type TipoPropuesta,
  type TipoRegistro,
} from '@/types/api'

interface EventoFormProps {
  defaultValues: EventoFormValues
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
    // Valida al salir de cada campo y luego en cada cambio: el usuario ve qué falta mientras
    // completa, sin que todo el formulario se marque en rojo desde el primer render.
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  const { register, control, formState, watch, setValue, getValues, clearErrors, trigger } = form
  const { errors } = formState
  const [seccionAbierta, setSeccionAbierta] = useState('datos')
  const [agendaAbierta, setAgendaAbierta] = useState(false)
  const { fields, append, remove } = useFieldArray({ control, name: 'imagenes' })
  const {
    fields: disponibilidadFields,
    append: appendDisponibilidad,
    remove: removeDisponibilidad,
  } = useFieldArray({ control, name: 'disponibilidades' })

  const tiposPropuestaOpciones = esActividad
    ? TIPOS_PROPUESTA_ACTIVIDAD
    : TIPOS_PROPUESTA_EVENTO

  const cambiarTipoRegistro = (nuevoTipo: TipoRegistro) => {
    setTipoRegistro(nuevoTipo)
    const opciones = nuevoTipo === 'ACTIVIDAD' ? TIPOS_PROPUESTA_ACTIVIDAD : TIPOS_PROPUESTA_EVENTO
    const actual = getValues('tipoPropuesta')
    if (actual !== '' && !(opciones as readonly string[]).includes(actual)) {
      setValue('tipoPropuesta', '')
    }
    clearErrors()
  }

  // El bloque de arancel solo se muestra (y solo se exige) cuando el evento es arancelado.
  const esDePago = watch('tipoAcceso') === 'DE_PAGO'
  const categoriaSeleccionada = watch('categoria')
  const tipoPropuestaSeleccionado = watch('tipoPropuesta')
  const nombreValor = watch('nombre')
  const descripcionValor = watch('descripcion')
  const lugarValor = watch('lugarRecinto')
  const localidadValor = watch('localidad')
  const direccionValor = watch('direccion')
  const tipoAccesoValor = watch('tipoAcceso')
  const montoEstimado = watch('montoEstimado')
  const sitioOficial = watch('sitioOficial')
  const fechaInicio = watch('fechaInicio')
  const fechaFin = watch('fechaFin')
  const horarioInicio = watch('horarioInicio')
  const horarioFin = watch('horarioFin')
  const duracionMinutos = watch('duracionMinutos') ?? ''
  const disponibilidades = watch('disponibilidades') ?? []
  const imagenesValor = watch('imagenes') ?? []

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

  const errorImagenesArray = imagenArrayError(errors.imagenes)

  const errorDuracionMinutos: RhfFieldError | undefined =
    esActividad &&
    duracionMinutos.trim().length > 0 &&
    (!/^\d+$/.test(duracionMinutos.trim()) || Number(duracionMinutos.trim()) <= 0)
      ? { type: 'validate', message: 'La duración de la actividad debe ser mayor a cero.' }
      : errors.duracionMinutos

  const generalServerError =
    activeServerError !== null &&
    !esErrorUbicacionServidor &&
    !esErrorImagenesServidor
      ? formatValidationMessage(activeServerError)
      : null

  const seccionesFormulario = [
    {
      id: 'datos',
      label: 'Datos',
      ok:
        nombreValor.trim() !== '' &&
        descripcionValor.trim() !== '' &&
        categoriaSeleccionada !== '' &&
        tipoPropuestaSeleccionado !== '',
    },
    {
      id: 'fechas',
      label: 'Fechas',
      ok: fechaInicio !== '' && fechaFin !== '',
    },
    {
      id: 'horarios',
      label: 'Horarios',
      ok: esActividad
        ? (duracionMinutos ?? '').trim() !== ''
        : horarioInicio !== '' && horarioFin !== '',
    },
    {
      id: 'ubicacion',
      label: 'Ubicación',
      ok: lugarValor.trim() !== '' && localidadValor.trim() !== '' && direccionValor.trim() !== '',
    },
    {
      id: 'imagenes',
      label: 'Imágenes',
      ok: esActividad || imagenesValor.length > 0,
    },
    {
      id: 'acceso',
      label: 'Acceso',
      ok:
        tipoAccesoValor !== '' &&
        (tipoAccesoValor !== 'DE_PAGO' ||
          (montoEstimado.trim() !== '' && sitioOficial.trim() !== '')),
    },
  ]
  const completadas = seccionesFormulario.filter((seccion) => seccion.ok).length

  const camposPorSeccion: Record<string, FieldPath<EventoFormValues>[]> = {
    datos: ['nombre', 'descripcion', 'categoria', 'tipoPropuesta', 'modalidad'],
    fechas: ['fechaInicio', 'fechaFin'],
    horarios: esActividad
      ? ['duracionMinutos', 'disponibilidades']
      : ['horarioInicio', 'horarioFin'],
    ubicacion: ['lugarRecinto', 'localidad', 'direccion'],
    imagenes: ['imagenes'],
    acceso: ['tipoAcceso', 'montoEstimado', 'sitioOficial'],
  }
  const siguiente: Record<string, string> = {
    datos: 'fechas',
    fechas: 'horarios',
    horarios: 'ubicacion',
    ubicacion: 'imagenes',
    imagenes: 'acceso',
  }
  const continuarSeccion = async (id: string) => {
    const ok = await trigger(camposPorSeccion[id] ?? [])
    if (ok && siguiente[id] !== undefined) {
      setSeccionAbierta(siguiente[id])
    }
  }

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

      <FormProgress secciones={seccionesFormulario} completadas={completadas} />
      <FormSectionNav
        secciones={seccionesFormulario}
        activa={seccionAbierta}
        onSelect={setSeccionAbierta}
      />

      <FormSection
          id="fechas"
          open={seccionAbierta === 'fechas'}
          completed={seccionesFormulario[1].ok}
          onToggle={() => setSeccionAbierta('fechas')}
          onContinue={() => void continuarSeccion('fechas')}
          onBack={() => setSeccionAbierta('datos')}
          number={1}
          title="Agenda de la propuesta"
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
            Elegí el rango de fechas para agendar el evento o la actividad. Podés tener más de una
            propuesta el mismo día.
          </FieldDescription>
          <div className="flex flex-col gap-3">
            <FechaRangoCards
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              min={minFechaInicio}
              errorInicio={errorFechaInicio}
              errorFin={errorFechaFin}
              onChangeInicio={(value) =>
                setValue('fechaInicio', value, { shouldValidate: true, shouldDirty: true })
              }
              onChangeFin={(value) =>
                setValue('fechaFin', value, { shouldValidate: true, shouldDirty: true })
              }
            />
            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() => setAgendaAbierta(true)}
            >
              <span className="material-symbols-outlined text-lg">calendar_month</span>
              Ver mi agenda
            </Button>
          </div>
        </FormSection>

      {/* Sección 1: Datos Principales */}
      <FormSection
        id="datos"
        open={seccionAbierta === 'datos'}
        completed={seccionesFormulario[0].ok}
        onToggle={() => setSeccionAbierta('datos')}
        onContinue={() => void continuarSeccion('datos')}
        number={esAlta || esActividad ? 2 : 1}
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
            required
            error={errors.nombre}
            inputProps={register('nombre')}
          />

          <Field data-invalid={errors.descripcion !== undefined}>
            <FieldLabel htmlFor="descripcion">
              Descripción completa <span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="descripcion"
              rows={3}
              aria-label="Descripción completa"
              aria-required="true"
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
                <FieldLabel htmlFor="categoria">
                  Categoría turística <span className="text-destructive">*</span>
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="categoria"
                    aria-label="Categoría turística"
                    aria-required="true"
                    aria-invalid={errors.categoria !== undefined}
                  >
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
                {categoriaSeleccionada !== '' ? (
                  <FieldDescription>
                    {CATEGORIA_DESCRIPCIONES[categoriaSeleccionada as Categoria]}
                  </FieldDescription>
                ) : (
                  <FieldDescription>
                    Elegí la categoría que mejor describe la experiencia.
                  </FieldDescription>
                )}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="tipoPropuesta"
            render={({ field }) => (
              <Field data-invalid={errors.tipoPropuesta !== undefined}>
                <FieldLabel htmlFor="tipoPropuesta">
                  Tipo de propuesta <span className="text-destructive">*</span>
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="tipoPropuesta"
                    aria-label="Tipo de propuesta"
                    aria-required="true"
                    aria-invalid={errors.tipoPropuesta !== undefined}
                  >
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
                {tipoPropuestaSeleccionado !== '' ? (
                  <FieldDescription>
                    {TIPO_PROPUESTA_DESCRIPCIONES[tipoPropuestaSeleccionado as TipoPropuesta]}
                  </FieldDescription>
                ) : (
                  <FieldDescription>
                    {esActividad
                      ? 'Solo se ofrecen visitas guiadas y actividades deportivas.'
                      : 'Las visitas guiadas se cargan como Actividad.'}
                  </FieldDescription>
                )}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="modalidad"
            render={({ field }) => (
              <Field data-invalid={errors.modalidad !== undefined}>
                <FieldLabel htmlFor="modalidad">Modalidad (opcional)</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="modalidad"
                    aria-label="Modalidad"
                    aria-invalid={errors.modalidad !== undefined}
                  >
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
        id="acceso"
        open={seccionAbierta === 'acceso'}
        completed={seccionesFormulario[5].ok}
        onToggle={() => setSeccionAbierta('acceso')}
        onBack={() => setSeccionAbierta('imagenes')}
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
                required={esDePago}
                description="Obligatorio para un evento arancelado."
                error={errorMontoEstimado}
                inputProps={{ step: '0.01', min: '0', ...register('montoEstimado') }}
              />
              <TextField
                id="sitioOficial"
                label="Sitio oficial de la boletería o entradas"
                required={esDePago}
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
          id="ubicacion"
          open={seccionAbierta === 'ubicacion'}
          completed={seccionesFormulario[3].ok}
          onToggle={() => setSeccionAbierta('ubicacion')}
          onContinue={() => void continuarSeccion('ubicacion')}
          onBack={() => setSeccionAbierta('horarios')}
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
              required
              description="Ej.: Anfiteatro José Hernández, Plaza San Martín."
              error={errors.lugarRecinto ?? (errorUbicacionServidor ? { type: 'server', message: '' } : undefined)}
              inputProps={register('lugarRecinto', { onChange: dismissServerError })}
            />
            <TextField
              id="localidad"
              label="Ciudad / Localidad"
              required
              error={errors.localidad ?? (errorUbicacionServidor ? { type: 'server', message: '' } : undefined)}
              inputProps={register('localidad', { onChange: dismissServerError })}
            />
            <TextField
              id="direccion"
              label="Dirección exacta o referencia"
              required
              error={errors.direccion ?? errorUbicacionServidor}
              inputProps={register('direccion', { onChange: dismissServerError })}
            />
          </FieldGroup>
        </FormSection>
      </div>

      {/* Sección 4: Calendario y Horarios (Evento) o Duración y Disponibilidad Semanal (Actividad) */}
      {esActividad ? (
        <FormSection
          id="horarios"
          open={seccionAbierta === 'horarios'}
          completed={seccionesFormulario[2].ok}
          onToggle={() => setSeccionAbierta('horarios')}
          onContinue={() => void continuarSeccion('horarios')}
          onBack={() => setSeccionAbierta('fechas')}
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
              required
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
          id="horarios"
          open={seccionAbierta === 'horarios'}
          completed={seccionesFormulario[2].ok}
          onToggle={() => setSeccionAbierta('horarios')}
          onContinue={() => void continuarSeccion('horarios')}
          onBack={() => setSeccionAbierta('fechas')}
          number={3}
          title="Horarios del evento"
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
            <HoraRangoCards
              horarioInicio={horarioInicio}
              horarioFin={horarioFin}
              errorInicio={errors.horarioInicio}
              errorFin={errorHorarioFin}
              onChangeInicio={(value) =>
                setValue('horarioInicio', value, { shouldValidate: true, shouldDirty: true })
              }
              onChangeFin={(value) =>
                setValue('horarioFin', value, { shouldValidate: true, shouldDirty: true })
              }
            />
          </FieldGroup>
        </FormSection>
      )}

      {/* Sección 5: Imágenes */}
      <FormSection
        id="imagenes"
        open={seccionAbierta === 'imagenes'}
        completed={seccionesFormulario[4].ok}
        onToggle={() => setSeccionAbierta('imagenes')}
        onContinue={() => void continuarSeccion('imagenes')}
        onBack={() => setSeccionAbierta('ubicacion')}
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
          {esActividad
            ? 'Subí archivos o pegá URLs completas, una por fila. Para sacar todas, quitá las filas: una lista vacía las borra de la actividad.'
            : 'Obligatoria: cargá al menos una imagen. Podés subir archivos o pegar URLs completas, una por fila.'}
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

        {errorImagenesArray ? <FieldError>{errorImagenesArray}</FieldError> : null}

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

      <AgendaPublicadorModal
        open={agendaAbierta}
        onOpenChange={setAgendaAbierta}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onSelectInicio={(fecha) =>
          setValue('fechaInicio', fecha, { shouldValidate: true, shouldDirty: true })
        }
        onSelectFin={(fecha) =>
          setValue('fechaFin', fecha, { shouldValidate: true, shouldDirty: true })
        }
      />

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
function FormSectionNav({
  secciones,
  activa,
  onSelect,
}: {
  secciones: Array<{ id: string; label: string; ok: boolean }>
  activa: string
  onSelect: (id: string) => void
}) {
  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Secciones del formulario"
    >
      {secciones.map((seccion, index) => (
        <button
          key={seccion.id}
          type="button"
          onClick={() => onSelect(seccion.id)}
          aria-current={activa === seccion.id ? 'step' : undefined}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            seccion.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          } ${activa === seccion.id ? 'ring-2 ring-sky-300' : ''}`}
        >
          {index + 1}. {seccion.label}
        </button>
      ))}
    </nav>
  )
}

function FormProgress({
  secciones,
  completadas,
}: {
  secciones: Array<{ label: string; ok: boolean }>
  completadas: number
}) {
  return (
    <div
      className="rounded-xl border border-[#e0e3e5] bg-white p-3 shadow-sm"
      aria-label="Progreso del formulario"
    >
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>Progreso de la propuesta</span>
        <span className="text-[#00658d]">
          {completadas}/{secciones.length} secciones completas
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#00658d] transition-all"
          style={{ width: `${(completadas / secciones.length) * 100}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {secciones.map((seccion) => (
          <span
            key={seccion.label}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              seccion.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span className="material-symbols-outlined text-xs">
              {seccion.ok ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            {seccion.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function FormSection({
  id,
  number,
  title,
  icon,
  open,
  completed,
  onToggle,
  onContinue,
  onBack,
  children,
}: {
  id?: string
  number: number
  title: string
  icon: React.ReactNode
  open: boolean
  completed: boolean
  onToggle: () => void
  onContinue?: () => void
  onBack?: () => void
  children: React.ReactNode
}) {
  return (
    <FieldSet
      id={id}
      className="scroll-mt-24 rounded-xl bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      <div className="flex items-center gap-2 border-b border-[#e0e3e5] pb-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
            completed ? 'bg-emerald-600' : 'bg-[#00658d]'
          }`}
        >
          {completed ? '✓' : number}
        </span>
        <span className="text-[#00658d]">{icon}</span>
        <FieldLegend className="font-heading flex-1 text-lg font-bold text-[#191c1e]">
          {title}
        </FieldLegend>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            completed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {completed ? 'Completa' : 'Pendiente'}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? `Cerrar ${title}` : `Abrir ${title}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
        >
          <span className="material-symbols-outlined text-xl">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>
      <div className={open ? 'flex flex-col gap-4 pt-4' : 'hidden'}>{children}</div>
      {open && (onContinue !== undefined || onBack !== undefined) ? (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          {onBack ? (
            <Button type="button" variant="outline" onClick={onBack}>
              Volver
            </Button>
          ) : (
            <span />
          )}
          {onContinue ? (
            <Button type="button" onClick={onContinue}>
              Continuar
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Button>
          ) : null}
        </div>
      ) : null}
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
  required = false,
  inputProps,
}: {
  id: string
  label: string
  error: RhfFieldError | undefined
  description?: string
  type?: ComponentProps<typeof Input>['type']
  required?: boolean
  inputProps: ComponentProps<typeof Input>
}) {
  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        aria-label={label}
        aria-required={required}
        aria-invalid={error !== undefined}
        {...inputProps}
      />
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

/** Error del array completo, por ejemplo cuando no se cargó ninguna imagen. */
function imagenArrayError(errors: unknown): string | undefined {
  if (typeof errors !== 'object' || errors === null) return undefined
  const root = (errors as { root?: { message?: string } }).root
  if (root?.message) return root.message
  return (errors as { message?: string }).message
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
