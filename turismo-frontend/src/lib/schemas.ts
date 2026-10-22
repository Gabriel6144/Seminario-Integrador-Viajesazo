import { z } from 'zod'

import {
  CATEGORIAS,
  DIAS_SEMANA,
  MODALIDADES,
  TIPOS_ACCESO,
  TIPOS_PROPUESTA,
  type ActividadRequest,
  type ActividadResponse,
  type Categoria,
  type DiaSemana,
  type EventoRequest,
  type Modalidad,
  type PublicadorRequest,
  type TipoAcceso,
  type TipoPropuesta,
  type TipoRegistro,
} from '@/types/api'

/**
 * Schemas de validación de los formularios.
 *
 * Los mensajes **son los mismos** que devuelve el backend, a propósito: si el usuario llega al
 * error por validación del cliente y por validación del servidor, lee lo mismo. La fuente de
 * verdad son los `@NotBlank` / `@NotNull` de `dto/request/` y los mensajes de
 * `EventoService.validateRange`.
 *
 * El backend aplana los errores de validación en un único string
 * (`"nombre: el nombre es obligatorio; fechaInicio: ..."`), así que del 400 no hay nada que
 * parsear para pintar campo por campo. Por eso la validación real vive acá y el mensaje del
 * servidor se muestra como error general del formulario.
 */

/** `yyyy-MM-dd`, el formato de `LocalDate` y el que devuelven los `<input type="date">`. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** `HH:mm` o `HH:mm:ss`. `LocalTime` de Java acepta las dos formas. */
const ISO_TIME = /^\d{2}:\d{2}(:\d{2})?$/

/**
 * Texto del formulario a texto del body: cadena vacía → `null`.
 *
 * Un input sin llenar es `""`, y `""` no es lo mismo que "sin valor": mandarlo produce un
 * `""` en la base en vez de un `NULL`. La conversión vive en un solo lugar para que ningún
 * request dependa de que un campo esté en la lista de opcionales.
 *
 * Medido contra la API real: Jackson **coerciona** `""` a `null` en `LocalDate` y `LocalTime`,
 * así que mandarlo no rompe —pero tampoco es la intención. En un `LocalTime` sin `@NotNull`
 * el alta se guarda con 201 y el horario queda vacío; en un `LocalDate` con validación lo agarra
 * el `@NotBlank` y responde `fechaInicio: la fecha de inicio es obligatoria`. El 400 genérico de
 * Jackson ("el cuerpo de la petición no es válido...") aparece con formatos **malformados**
 * (`"no-es-fecha"`, una categoría inexistente), no con cadenas vacías.
 */
function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

// ---------------------------------------------------------------------------
// Publicador
// ---------------------------------------------------------------------------

export const publicadorSchema = z.object({
  // Sin `trim()` en el schema a propósito: el mensaje tiene que distinguish "vacío" de
  // "solo espacios", y el backend trata los dos igual con @NotBlank.
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
  email: z.string().trim().min(1, 'El email es obligatorio.').email('El email no tiene un formato válido.'),
  telefono: z.string(),
})

export type PublicadorFormValues = z.infer<typeof publicadorSchema>

/**
 * `POST /api/publicadores`. El `telefono` vacío viaja como `null`, que es lo que el
 * `@NotBlank` ausente del record espera.
 */
export function toPublicadorRequest(values: PublicadorFormValues): PublicadorRequest {
  return {
    nombre: values.nombre.trim(),
    email: values.email.trim(),
    telefono: blankToNull(values.telefono),
  }
}

// ---------------------------------------------------------------------------
// Evento
// ---------------------------------------------------------------------------

/**
 * `categoria`, `tipoPropuesta` y `modalidad` arrancan en `''` mientras no se eligió nada en el
 * `<Select>`, igual que `publicadorId`, y son obligatorios al enviar el formulario.
 */
const categoriaSchema = z
  .string()
  .refine(
    (value) => (CATEGORIAS as readonly string[]).includes(value),
    'La categoría es obligatoria.',
  )

const tipoPropuestaSchema = z
  .string()
  .refine(
    (value) => (TIPOS_PROPUESTA as readonly string[]).includes(value),
    'El tipo de propuesta es obligatorio.',
  )

const modalidadSchema = z
  .string()
  .refine(
    (value) => (MODALIDADES as readonly string[]).includes(value),
    'La modalidad es obligatoria.',
  )

/**
 * `publicadorId` es **string** y no number porque el `<Select>` de Radix entrega
 * `onValueChange` un string. Parsearlo recién en el adapter evita tener que coercionar a
 * número en cada render.
 */
const publicadorIdSchema = z
  .string()
  .refine((value) => /^\d+$/.test(value) && Number(value) > 0, 'El publicador es obligatorio.')

const imagenSchema = z.object({
  // Una fila agregada y no llenada no se manda como `""` al backend (que la rechaza con
  // "las URLs de imagen no pueden estar vacías"): se frena acá con un mensaje que sí dice qué
  // hacer.
  url: z.string().trim().min(1, 'Ingresá la URL o quitá la fila.'),
})

export const disponibilidadSchema = z
  .object({
    diaSemana: z
      .string()
      .refine(
        (value) => (DIAS_SEMANA as readonly string[]).includes(value),
        'El día de la semana es obligatorio.',
      ),
    horaInicio: z
      .string()
      .trim()
      .min(1, 'La hora de inicio es obligatoria.')
      .regex(ISO_TIME, 'La hora de inicio no tiene un formato válido.'),
    horaFin: z
      .string()
      .trim()
      .min(1, 'La hora de fin es obligatoria.')
      .regex(ISO_TIME, 'La hora de fin no tiene un formato válido.'),
  })
  .refine(
    (item) =>
      item.horaInicio.length === 0 ||
      item.horaFin.length === 0 ||
      item.horaFin > item.horaInicio,
    {
      message: 'La hora de fin de una disponibilidad debe ser posterior a la de inicio.',
      path: ['horaFin'],
    },
  )

/**
 * `tipoAcceso` es `''` mientras no se eligió nada en el `<Select>` (como `categoria`). El adapter
 * lo traduce a `null`, y el backend aplica su default `GRATUITO`.
 */
const tipoAccesoSchema = z.union([
  z.literal(''),
  z.enum(TIPOS_ACCESO, { message: 'El tipo de acceso no es válido.' }),
])

/** Decimal con hasta dos decimales. El vacío es válido acá; la obligatoriedad se exige si es `DE_PAGO`. */
const montoEstimadoSchema = z
  .string()
  .trim()
  .refine(
    (value) => !/^-\d/.test(value),
    'El monto estimado no puede ser negativo.',
  )
  .refine(
    (value) => value.length === 0 || /^\d+(\.\d{1,2})?$/.test(value),
    'El monto estimado no tiene un formato válido.',
  )

/** `http(s)://...`, el mismo `@Pattern` del `EventoRequest`. Vacío se valida como obligatorio si es `DE_PAGO`. */
const sitioOficialSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || /^https?:\/\/.+/.test(value),
    'El link al sitio oficial debe ser una URL http(s).',
  )

export const eventoSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
    descripcion: z.string(),
    categoria: categoriaSchema,
    tipoPropuesta: tipoPropuestaSchema,
    modalidad: modalidadSchema,
    tipoAcceso: tipoAccesoSchema,
    montoEstimado: montoEstimadoSchema,
    descripcionArancel: z.string(),
    sitioOficial: sitioOficialSchema,
    lugarRecinto: z.string().trim().min(1, 'El lugar o recinto es obligatorio.'),
    localidad: z.string().trim().min(1, 'La ciudad es obligatoria.'),
    direccion: z.string().trim().min(1, 'La dirección exacta es obligatoria.'),
    fechaInicio: z
      .string()
      .trim()
      .min(1, 'La fecha de inicio es obligatoria.')
      .regex(ISO_DATE, 'La fecha de inicio no tiene un formato válido.'),
    fechaFin: z
      .string()
      .trim()
      .min(1, 'La fecha de finalización es obligatoria.')
      .regex(ISO_DATE, 'La fecha de finalización no tiene un formato válido.'),
    horarioInicio: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || ISO_TIME.test(value), 'El horario de inicio no tiene un formato válido.'),
    horarioFin: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || ISO_TIME.test(value), 'El horario de finalización no tiene un formato válido.'),
    duracionMinutos: z.string().optional(),
    disponibilidades: z
      .array(
        z.object({
          diaSemana: z.string(),
          horaInicio: z.string(),
          horaFin: z.string(),
        }),
      )
      .optional(),
    imagenes: z.array(imagenSchema),
    publicadorId: publicadorIdSchema,
  })
  .refine((values) => values.fechaInicio.length === 0 || values.fechaFin.length === 0 || values.fechaFin >= values.fechaInicio, {
    message: 'La fecha de finalización no puede ser anterior a la de inicio.',
    path: ['fechaFin'],
  })
  .refine(
    (values) =>
      values.horarioInicio.length === 0 ||
      values.horarioFin.length === 0 ||
      values.horarioFin > values.horarioInicio,
    {
      message: 'El horario de finalización debe ser posterior al de inicio.',
      path: ['horarioFin'],
    },
  )
  /**
   * Un evento arancelado sin monto ni link no es una propuesta válida: el backend lo rechaza en
   * `EventoService.validateAcceso`. Se replica acá para que el usuario lo sepa antes de mandar.
   */
  .superRefine((values, ctx) => {
    if (values.tipoAcceso !== 'DE_PAGO') return

    if (values.montoEstimado.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El monto estimado es obligatorio para un evento arancelado.',
        path: ['montoEstimado'],
      })
    }
    if (values.sitioOficial.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El link al sitio oficial es obligatorio para un evento arancelado.',
        path: ['sitioOficial'],
      })
    }
  })

export type EventoFormValues = z.infer<typeof eventoSchema>

/**
 * Normaliza mensajes de validación (incluidos los que vienen en minúscula del backend) para que
 * comiencen con mayúscula y terminen con punto.
 */
export function formatValidationMessage(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return trimmed
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`
}

/**
 * Extiende `eventoSchema` para exigir una fecha mínima de inicio (por ejemplo, hoy en el alta de
 * un evento nuevo) sin afectar la edición de eventos históricos.
 */
export function crearEventoSchema(minFechaInicio?: string) {
  if (!minFechaInicio) return eventoSchema
  return eventoSchema.refine(
    (values) => values.fechaInicio.length === 0 || values.fechaInicio >= minFechaInicio,
    {
      message: 'La fecha de inicio no puede ser anterior a la fecha actual.',
      path: ['fechaInicio'],
    },
  )
}

/**
 * Schema para el alta de una `Actividad` (`POST /api/actividades`), usando los mismos campos
 * base de `EventoFormValues` para que cambiar entre Evento y Actividad en el formulario conserve
 * todo lo que el usuario ya completó.
 */
export const actividadSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
  descripcion: z.string(),
  categoria: categoriaSchema,
  tipoPropuesta: tipoPropuestaSchema,
  modalidad: modalidadSchema,
  tipoAcceso: tipoAccesoSchema,
  montoEstimado: z.string(),
  descripcionArancel: z.string(),
  sitioOficial: z.string(),
  lugarRecinto: z.string().trim().min(1, 'El lugar o recinto es obligatorio.'),
  localidad: z.string().trim().min(1, 'La ciudad es obligatoria.'),
  direccion: z.string().trim().min(1, 'La dirección exacta es obligatoria.'),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  horarioInicio: z.string(),
  horarioFin: z.string(),
  duracionMinutos: z
    .string()
    .optional()
    .refine((value) => (value ?? '').trim().length > 0, 'La duración en minutos es obligatoria.')
    .refine(
      (value) => {
        const trimmed = (value ?? '').trim()
        return trimmed.length === 0 || (/^\d+$/.test(trimmed) && Number(trimmed) > 0)
      },
      'La duración de la actividad debe ser mayor a cero.',
    ),
  disponibilidades: z.array(disponibilidadSchema).optional(),
  imagenes: z.array(imagenSchema),
  publicadorId: publicadorIdSchema,
})

export function crearPropuestaSchema(tipoRegistro: TipoRegistro, minFechaInicio?: string) {
  if (tipoRegistro === 'ACTIVIDAD') return actividadSchema
  return crearEventoSchema(minFechaInicio)
}

export function toActividadRequest(values: EventoFormValues): ActividadRequest {
  return {
    nombre: values.nombre.trim(),
    descripcion: blankToNull(values.descripcion),
    categoria: values.categoria === '' ? null : (values.categoria as Categoria),
    modalidad: values.modalidad === '' ? null : (values.modalidad as Modalidad),
    tipoPropuesta: values.tipoPropuesta === '' ? null : (values.tipoPropuesta as TipoPropuesta),
    tipoAcceso: values.tipoAcceso === '' ? null : (values.tipoAcceso as TipoAcceso),
    lugarRecinto: values.lugarRecinto.trim(),
    localidad: values.localidad.trim(),
    direccion: values.direccion.trim(),
    duracionMinutos: Number((values.duracionMinutos ?? '0').trim()),
    disponibilidades: (values.disponibilidades ?? []).map((item) => ({
      diaSemana: item.diaSemana as DiaSemana,
      horaInicio: item.horaInicio.trim(),
      horaFin: item.horaFin.trim(),
    })),
    imagenes: values.imagenes.map((imagen) => imagen.url.trim()),
    publicadorId: Number(values.publicadorId),
  }
}

/**
 * `POST /api/eventos` y `PUT /api/eventos/{id}`.
 *
 * Las imágenes son el único campo que se transforma de forma: el formulario las maneja como
 * filas `{ url }` para poder agregar y quitar una a una, y acá se aplanan a `string[]`.
 *
 * El `[]` final es importante. Mandar `null` en un PUT le dice al mapper "conservá lo que hay",
 * así que una lista vacía terminaría **sin** borrar las imágenes que ya tenía el evento.
 */
export function toEventoRequest(values: EventoFormValues): EventoRequest {
  const esDePago = values.tipoAcceso === 'DE_PAGO'

  return {
    nombre: values.nombre.trim(),
    descripcion: blankToNull(values.descripcion),
    categoria: values.categoria === '' ? null : (values.categoria as Categoria),
    tipoPropuesta: values.tipoPropuesta === '' ? null : (values.tipoPropuesta as TipoPropuesta),
    modalidad: values.modalidad === '' ? null : (values.modalidad as Modalidad),
    tipoAcceso: values.tipoAcceso === '' ? null : (values.tipoAcceso as TipoAcceso),
    // Los campos de arancel solo viajan si el evento es arancelado: si el usuario cambia a
    // "Gratuito", se limpian para no dejar un monto colgado en la base.
    montoEstimado: esDePago ? Number(values.montoEstimado.trim()) : null,
    descripcionArancel: esDePago ? blankToNull(values.descripcionArancel) : null,
    sitioOficial: esDePago ? blankToNull(values.sitioOficial) : null,
    lugarRecinto: values.lugarRecinto.trim(),
    localidad: values.localidad.trim(),
    direccion: values.direccion.trim(),
    fechaInicio: values.fechaInicio.trim(),
    fechaFin: values.fechaFin.trim(),
    horarioInicio: blankToNull(values.horarioInicio),
    horarioFin: blankToNull(values.horarioFin),
    imagenes: values.imagenes.map((imagen) => imagen.url.trim()),
    publicadorId: Number(values.publicadorId),
  }
}

/** Valores vacíos de `EventoFormValues`, para el alta. */
export const EVENTO_FORM_DEFAULT: EventoFormValues = {
  nombre: '',
  descripcion: '',
  categoria: '',
  tipoPropuesta: '',
  modalidad: '',
  tipoAcceso: 'GRATUITO',
  montoEstimado: '',
  descripcionArancel: '',
  sitioOficial: '',
  lugarRecinto: '',
  localidad: '',
  direccion: '',
  fechaInicio: '',
  fechaFin: '',
  horarioInicio: '',
  horarioFin: '',
  duracionMinutos: '',
  disponibilidades: [],
  imagenes: [],
  publicadorId: '',
}

/**
 * Convierte un `EventoResponse` en los valores del formulario, para precargar la edición.
 *
 * Es la inversa de `toEventoRequest` salvo en las imágenes: la respuesta trae `string[]` y el
 * formulario necesita filas `{ url }`.
 *
 * `categoria` y `publicadorId` vuelven como string porque es lo que espera el `<Select>`, y el
 * `??` de los opcionales es justamente el `null` que el formulario representa como `''`.
 */
export function toEventoFormValues(evento: {
  nombre: string
  descripcion: string | null
  categoria: Categoria | null
  tipoPropuesta?: TipoPropuesta | null
  modalidad?: Modalidad | null
  tipoAcceso: TipoAcceso | null
  montoEstimado: number | null
  descripcionArancel: string | null
  sitioOficial: string | null
  lugarRecinto: string | null
  localidad: string | null
  direccion: string | null
  fechaInicio: string
  fechaFin: string
  horarioInicio: string | null
  horarioFin: string | null
  imagenes: string[]
  publicadorId: number
}): EventoFormValues {
  return {
    nombre: evento.nombre,
    descripcion: evento.descripcion ?? '',
    categoria: evento.categoria ?? '',
    tipoPropuesta: evento.tipoPropuesta ?? '',
    modalidad: evento.modalidad ?? '',
    tipoAcceso: evento.tipoAcceso ?? 'GRATUITO',
    // El backend serializa `BigDecimal` como número (`1500.00`); el input necesita string.
    montoEstimado: evento.montoEstimado === null ? '' : String(evento.montoEstimado),
    descripcionArancel: evento.descripcionArancel ?? '',
    sitioOficial: evento.sitioOficial ?? '',
    lugarRecinto: evento.lugarRecinto ?? '',
    localidad: evento.localidad ?? '',
    direccion: evento.direccion ?? '',
    fechaInicio: evento.fechaInicio,
    fechaFin: evento.fechaFin,
    // La API devuelve "20:00:00" y el <input type="time"> no acepta segundos: sin este recorte
    // el input quedaría en blanco y la edición perdería el horario.
    horarioInicio: (evento.horarioInicio ?? '').slice(0, 5),
    horarioFin: (evento.horarioFin ?? '').slice(0, 5),
    duracionMinutos: '',
    disponibilidades: [],
    imagenes: evento.imagenes.map((url) => ({ url })),
    publicadorId: String(evento.publicadorId),
  }
}

/**
 * Convierte un `ActividadResponse` en los valores del formulario, para precargar la edición de una actividad.
 */
export function toActividadFormValues(actividad: ActividadResponse): EventoFormValues {
  return {
    nombre: actividad.nombre,
    descripcion: actividad.descripcion ?? '',
    categoria: actividad.categoria ?? '',
    tipoPropuesta: actividad.tipoPropuesta ?? '',
    modalidad: actividad.modalidad ?? '',
    tipoAcceso: actividad.tipoAcceso ?? 'GRATUITO',
    montoEstimado: '',
    descripcionArancel: '',
    sitioOficial: '',
    lugarRecinto: actividad.lugarRecinto ?? '',
    localidad: actividad.localidad ?? '',
    direccion: actividad.direccion ?? '',
    fechaInicio: '',
    fechaFin: '',
    horarioInicio: '',
    horarioFin: '',
    duracionMinutos: String(actividad.duracionMinutos),
    disponibilidades: (actividad.disponibilidades ?? []).map((item) => ({
      diaSemana: item.diaSemana,
      horaInicio: (item.horaInicio ?? '').slice(0, 5),
      horaFin: (item.horaFin ?? '').slice(0, 5),
    })),
    imagenes: actividad.imagenes.map((url) => ({ url })),
    publicadorId: String(actividad.publicadorId),
  }
}
