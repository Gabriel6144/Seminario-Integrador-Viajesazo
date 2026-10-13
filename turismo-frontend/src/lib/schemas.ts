import { z } from 'zod'

import {
  CATEGORIAS,
  TIPOS_ACCESO,
  type Categoria,
  type EventoRequest,
  type PublicadorRequest,
  type TipoAcceso,
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
  nombre: z.string().trim().min(1, 'el nombre es obligatorio'),
  email: z.string().trim().min(1, 'el email es obligatorio').email('el email no tiene un formato válido'),
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
 * `categoria` es `''` mientras no se eligió nada en el `<Select>`, que es como un `<select>`
 * HTML representa "sin valor". La alternativa sería un string separado con un valor centinela,
 * pero el `''` ya cumple el papel y evita un estado más.
 */
const categoriaSchema = z.union([
  z.literal(''),
  z.enum(CATEGORIAS, { message: 'la categoría no es válida' }),
])

/**
 * `publicadorId` es **string** y no number porque el `<Select>` de Radix entrega
 * `onValueChange` un string. Parsearlo recién en el adapter evita tener que coercionar a
 * número en cada render.
 */
const publicadorIdSchema = z
  .string()
  .refine((value) => /^\d+$/.test(value) && Number(value) > 0, 'el publicador es obligatorio')

const imagenSchema = z.object({
  // Una fila agregada y no llenada no se manda como `""` al backend (que la rechaza con
  // "las URLs de imagen no pueden estar vacías"): se frena acá con un mensaje que sí dice qué
  // hacer.
  url: z.string().trim().min(1, 'Ingresá la URL o quitá la fila.'),
})

/**
 * `tipoAcceso` es `''` mientras no se eligió nada en el `<Select>` (como `categoria`). El adapter
 * lo traduce a `null`, y el backend aplica su default `GRATUITO`.
 */
const tipoAccesoSchema = z.union([
  z.literal(''),
  z.enum(TIPOS_ACCESO, { message: 'el tipo de acceso no es válido' }),
])

/** Decimal con hasta dos decimales. El vacío es válido acá; la obligatoriedad se exige si es `DE_PAGO`. */
const montoEstimadoSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || /^\d+(\.\d{1,2})?$/.test(value),
    'el monto estimado no tiene un formato válido',
  )

/** `http(s)://...`, el mismo `@Pattern` del `EventoRequest`. Vacío se valida como obligatorio si es `DE_PAGO`. */
const sitioOficialSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || /^https?:\/\/.+/.test(value),
    'el link al sitio oficial debe ser una URL http(s)',
  )

export const eventoSchema = z
  .object({
    nombre: z.string().trim().min(1, 'el nombre es obligatorio'),
    descripcion: z.string(),
    categoria: categoriaSchema,
    tipoAcceso: tipoAccesoSchema,
    montoEstimado: montoEstimadoSchema,
    descripcionArancel: z.string(),
    sitioOficial: sitioOficialSchema,
    lugarRecinto: z.string().trim().min(1, 'el lugar o recinto es obligatorio'),
    localidad: z.string().trim().min(1, 'la ciudad es obligatoria'),
    direccion: z.string().trim().min(1, 'la dirección exacta es obligatoria'),
    fechaInicio: z
      .string()
      .trim()
      .min(1, 'la fecha de inicio es obligatoria')
      .regex(ISO_DATE, 'la fecha de inicio no tiene un formato válido'),
    fechaFin: z
      .string()
      .trim()
      .min(1, 'la fecha de finalización es obligatoria')
      .regex(ISO_DATE, 'la fecha de finalización no tiene un formato válido'),
    horarioInicio: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || ISO_TIME.test(value), 'el horario de inicio no tiene un formato válido'),
    horarioFin: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || ISO_TIME.test(value), 'el horario de finalización no tiene un formato válido'),
    imagenes: z.array(imagenSchema),
    publicadorId: publicadorIdSchema,
  })
  .refine((values) => values.fechaInicio.length === 0 || values.fechaFin.length === 0 || values.fechaFin >= values.fechaInicio, {
    message: 'la fecha de finalización no puede ser anterior a la de inicio',
    path: ['fechaFin'],
  })
  .refine(
    (values) =>
      values.horarioInicio.length === 0 ||
      values.horarioFin.length === 0 ||
      values.horarioFin > values.horarioInicio,
    {
      message: 'el horario de finalización debe ser posterior al de inicio',
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
        message: 'el monto estimado es obligatorio para un evento arancelado',
        path: ['montoEstimado'],
      })
    }
    if (values.sitioOficial.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'el link al sitio oficial es obligatorio para un evento arancelado',
        path: ['sitioOficial'],
      })
    }
  })

export type EventoFormValues = z.infer<typeof eventoSchema>

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
    imagenes: evento.imagenes.map((url) => ({ url })),
    publicadorId: String(evento.publicadorId),
  }
}
