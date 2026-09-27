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
  localidad: string | null
  direccion: string | null
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
  localidad: string | null
  direccion: string | null
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
