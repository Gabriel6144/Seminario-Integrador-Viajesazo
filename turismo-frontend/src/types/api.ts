/**
 * Espejo de los DTO del backend. Los campos van en español porque el JSON los usa en español:
 * los records de Java (`EventoResponse`, `PublicadorResponse`, `ErrorResponse`) definen las
 * claves, y Spring las serializa con el nombre exacto del componente del record.
 *
 * Fuente de verdad: `src/main/java/com/viajesazo/turismo_backend/dto/` y
 * `src/main/java/com/viajesazo/turismo_backend/exception/ErrorResponse.java`.
 */

/**
 * El enum `Categoria` del backend, en mayúsculas porque se persiste como `STRING`.
 * Se declara como const para tener una sola fuente de verdad: la lista y el tipo salen de acá.
 */
export const CATEGORIAS = [
  'GASTRONOMIA',
  'FAMILIA',
  'CULTURA',
  'NATURALEZA',
  'AVENTURA',
] as const

export type Categoria = (typeof CATEGORIAS)[number]

/**
 * `TipoAcceso` del backend: si el evento es gratuito o arancelado. Se persiste como `STRING`.
 */
export const TIPOS_ACCESO = ['GRATUITO', 'DE_PAGO'] as const

export type TipoAcceso = (typeof TIPOS_ACCESO)[number]

export const TIPO_ACCESO_LABELS: Record<TipoAcceso, string> = {
  GRATUITO: 'Gratuito',
  DE_PAGO: 'Arancelado',
}

/**
 * `EstadoPropuesta` del backend. Lo setea el backend al registrar el evento (`INICIADO`) y solo
 * cambia por reglas de negocio, así que **no** viaja en el `EventoRequest`.
 */
export const ESTADOS_PROPUESTA = ['INICIADO', 'REPROGRAMADO', 'CANCELADO', 'FINALIZADO'] as const

export type EstadoPropuesta = (typeof ESTADOS_PROPUESTA)[number]

export const ESTADO_PROPUESTA_LABELS: Record<EstadoPropuesta, string> = {
  INICIADO: 'Iniciado',
  REPROGRAMADO: 'Reprogramado',
  CANCELADO: 'Cancelado',
  FINALIZADO: 'Finalizado',
}

/**
 * Cómo se muestra cada categoría en la UI.
 *
 * El enum del backend se persiste en mayúsculas (`CULTURA`) porque así lo guarda `data.sql` y así
 * lo espera el `Select` al mandar el body. Mostrar esos nombres crudos en un formulario queda
 * raro, así que el valor que viaja y el texto que se ve están separados: se manda
 * `CATEGORIAS[i]` y se muestra `CATEGORIA_LABELS[CATEGORIAS[i]]`.
 */
export const CATEGORIA_LABELS: Record<Categoria, string> = {
  GASTRONOMIA: 'Gastronomía',
  FAMILIA: 'Familia',
  CULTURA: 'Cultura',
  NATURALEZA: 'Naturaleza',
  AVENTURA: 'Aventura',
}

/** `LocalDate` de Java serializado como `yyyy-MM-dd`, por ejemplo `"2026-10-01"`. */
export type LocalDate = string

/**
 * `LocalTime` de Java serializado por Jackson 3.
 *
 * Llega **siempre con segundos**, `"HH:mm:ss"`, aunque valgan cero: contra la API real se
 * verificó que `"20:00"` sale como `"20:00:00"`. No es un formato en el que se pueda confiar para
 * mostrar, así que la capa de presentación recorta a `HH:mm`.
 */
export type LocalTime = string

/**
 * Envoltura de `Page` de Spring Data 4.x (Boot 4).
 *
 * OJO: los metadatos van **anidados bajo `page`**, no en el nivel superior como en el `Page`
 * clásico. Es la diferencia que más confunde al integrar:
 *
 *   { "content": [...], "page": { "size", "number", "totalElements", "totalPages" } }
 */
export interface Page<T> {
  content: T[]
  page: {
    size: number
    number: number
    totalElements: number
    totalPages: number
  }
}

export interface EventoResponse {
  id: number
  nombre: string
  descripcion: string | null
  categoria: Categoria | null
  tipoAcceso: TipoAcceso | null
  /** Lo asigna el backend al registrar el evento; puede cambiar por reglas de negocio. */
  estadoPropuesta: EstadoPropuesta | null
  /** `BigDecimal` serializado como número, con dos decimales. Solo tiene sentido si es `DE_PAGO`. */
  montoEstimado: number | null
  descripcionArancel: string | null
  /** Link al sitio oficial del evento; obligatorio cuando es `DE_PAGO`. */
  sitioOficial: string | null
  lugarRecinto: string | null
  localidad: string | null
  direccion: string | null
  /** Coordenadas geocodificadas por el backend (Nominatim/OSM). Van juntas o ninguna. */
  latitud: number | null
  longitud: number | null
  fechaInicio: LocalDate
  fechaFin: LocalDate
  horarioInicio: LocalTime | null
  horarioFin: LocalTime | null
  /** Nunca `null` en las respuestas: el backend usa `@Builder.Default = new ArrayList<>()`. */
  imagenes: string[]
  /** Aplanados. En la entidad el origen es `publicador.id` / `publicador.nombre`. */
  publicadorId: number
  publicadorNombre: string
}

export interface PublicadorResponse {
  id: number
  nombre: string
  email: string
  telefono: string | null
}

/**
 * Respuesta de `POST /api/imagenes`. Espejo de `dto/response/ImagenResponse.java`.
 *
 * Solo trae la URL con la que queda servida la imagen subida; esa URL es la que se agrega al
 * `imagenes` del evento. El backend la devuelve relativa (`/api/imagenes/{uuid}.{ext}`) para que
 * pase por el proxy de Vite como el resto de la API.
 */
export interface ImagenResponse {
  url: string
}

/**
 * Cuerpo de escritura de un evento. Es un tipo **distinto** de `EventoResponse` y no un
 * `Partial` de este: lo manda el cliente, así que no lleva `id` ni `publicadorNombre`, y el
 * publicador viene referenciado por `publicadorId`.
 *
 * Espejo de `dto/request/EventoRequest.java`.
 */
export interface EventoRequest {
  nombre: string
  descripcion: string | null
  categoria: Categoria | null
  /** `null` deja que el backend aplique el default `GRATUITO`. */
  tipoAcceso: TipoAcceso | null
  /** Obligatorio si `tipoAcceso` es `DE_PAGO`; el backend responde 400 si falta. */
  montoEstimado: number | null
  descripcionArancel: string | null
  /** Obligatorio si `tipoAcceso` es `DE_PAGO`. Debe ser una URL `http(s)`. */
  sitioOficial: string | null
  lugarRecinto: string
  localidad: string
  direccion: string
  fechaInicio: LocalDate
  fechaFin: LocalDate
  horarioInicio: LocalTime | null
  horarioFin: LocalTime | null
  /**
   * `null` en un PUT **conserva** las imágenes que ya tiene el evento; `[]` las borra. Es la
   * única excepción a que el PUT reemplace todo: el mapper ignora los nulos de este campo
   * (`NullValuePropertyMappingStrategy.IGNORE`).
   */
  imagenes: string[] | null
  publicadorId: number
}

/**
 * Cuerpo de alta de un publicador. Espejo de `dto/request/PublicadorRequest.java`.
 *
 * El `email` es único en el backend: si ya está cargado, el alta responde 400 con
 * `"ya existe un publicador con ese email"`.
 */
export interface PublicadorRequest {
  nombre: string
  email: string
  telefono: string | null
}

/**
 * Cuerpo de error del `GlobalExceptionHandler`. Es la única parte de la API con las claves en
 * inglés: `message` se llama así, pero su **valor** sigue siendo texto en español.
 */
export interface ApiErrorResponse {
  status: number
  error: string
  message: string
  timestamp: string
}

export const TIPOS_RITMO = ['TRANQUILO', 'EQUILIBRADO', 'INTENSIVO'] as const
export type TipoRitmo = (typeof TIPOS_RITMO)[number]

export const ESTADOS_VIAJE = ['BORRADOR', 'PLANIFICADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO'] as const
export type EstadoViaje = (typeof ESTADOS_VIAJE)[number]

export const INTERESES_CATEGORIA = [
  'NATURALEZA',
  'GASTRONOMIA',
  'CULTURA',
  'HISTORIA',
  'AVENTURA',
  'VIDA_NOCTURNA',
  'MUSICA',
  'COMPRAS',
  'FAMILIAR_Y_RELAX',
] as const
export type InteresCategoria = (typeof INTERESES_CATEGORIA)[number]

export interface UbicacionRequest {
  ciudad: string
  localidad: string | null
  latitud: number
  longitud: number
}

export interface UbicacionResponse {
  nombre: string
  localidad: string | null
  ciudad: string
  latitud: number
  longitud: number
}

export interface ViajeBorradorRequest {
  nombre: string | null
  ubicacion: UbicacionRequest | null
  rangoInteresKm: number | null
  fechaInicio: LocalDate | null
  fechaFin: LocalDate | null
  ritmo: TipoRitmo | null
  interesesCategoria: InteresCategoria[] | null
  pasoActual: number | null
  usuario: string
}

export interface ViajeResponse {
  id: number
  nombre: string | null
  ubicacion: UbicacionResponse | null
  rangoInteresKm: number | null
  fechaInicio: LocalDate | null
  fechaFin: LocalDate | null
  ritmo: TipoRitmo | null
  /** Nunca `null` en las respuestas; el backend usa `@Builder.Default`. */
  interesesCategoria: InteresCategoria[]
  estado: EstadoViaje
  pasoActual: number | null
  usuario: string
}

export interface ViajeRequest {
  nombre: string
  ubicacion: UbicacionRequest
  rangoInteresKm: number
  fechaInicio: LocalDate
  fechaFin: LocalDate
  ritmo: TipoRitmo
  interesesCategoria: InteresCategoria[]
  usuario: string
}
