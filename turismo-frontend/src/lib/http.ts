import type { ApiErrorResponse } from '@/types/api'

/**
 * Error normalizado de la API. Envuelve el cuerpo que devuelve `GlobalExceptionHandler`.
 *
 * El catch-all del backend devuelve un mensaje genérico a propósito, así que para un 500 este
 * error no trae nada útil en `message`: ver `toUserMessage`.
 */
export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorResponse | null

  constructor(status: number, body: ApiErrorResponse | null) {
    super(body?.message ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

const GENERIC_MESSAGE = 'Ocurrió un error inesperado en el servidor.'

/**
 * Mensaje para mostrar en pantalla.
 *
 * El backend filtra el detalle de los 500 a propósito (el catch-all no devuelve
 * `ex.getMessage()`), así que para 500 no hay nada mejor que un texto genérico. Para 404 y 400
 * el `message` sí es específico y viene en español, listo para pintar.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status >= 500) return GENERIC_MESSAGE
    if (error.body?.message) return error.body.message
    return `No se pudo completar la petición (${error.status}).`
  }
  if (error instanceof TypeError) {
    // fetch solo tira TypeError cuando no hubo respuesta: backend caído o proxy roto.
    return 'No se pudo conectar con el servidor. ¿Está la API corriendo en el puerto 8080?'
  }
  return 'Ocurrió un error inesperado.'
}

/**
 * Cliente HTTP de la API.
 *
 * Todas las rutas son **relativas** a propósito: el proxy de Vite (`server.proxy` en
 * `vite.config.ts`) reenvía `/api` a `http://localhost:8080`, así que el navegador las ve como
 * same-origin y nunca dispara el chequeo de CORS. Por eso el backend no necesita
 * `@CrossOrigin` ni `CorsConfiguration` en desarrollo.
 */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorBody(response))
  }
  return readBody<T>(response)
}

/** Verbos que escriben. `GET` queda aparte porque no lleva body ni `Content-Type`. */
type WriteMethod = 'POST' | 'PUT' | 'DELETE'

/** Alta. La respuesta es el recurso creado, con el id que le asignó la base. */
export function apiPost<TResponse, TRequest>(
  path: string,
  body: TRequest,
  signal?: AbortSignal,
): Promise<TResponse> {
  return write<TResponse>('POST', path, body, signal)
}

/** Modificación. El backend reemplaza el recurso entero salvo las imágenes. */
export function apiPut<TResponse, TRequest>(
  path: string,
  body: TRequest,
  signal?: AbortSignal,
): Promise<TResponse> {
  return write<TResponse>('PUT', path, body, signal)
}

/**
 * Baja. El backend responde **204 sin cuerpo**, así que no se espera ningún valor: el
 * `null` de la firma está explícito para que no se intente leer nada de la respuesta.
 */
export function apiDelete(path: string, signal?: AbortSignal): Promise<null> {
  return write<null>('DELETE', path, undefined, signal)
}

function write<TResponse>(
  method: WriteMethod,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<TResponse> {
  const hasBody = body !== undefined

  return fetch(path, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      // Un DELETE sin body no lleva Content-Type: mandarlo vacío hace que algunos proxies
      // descarten la request.
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  }).then(async (response) => {
    if (!response.ok) {
      throw new ApiError(response.status, await readErrorBody(response))
    }
    return readBody<TResponse>(response)
  })
}

/**
 * Lee el cuerpo de una respuesta, tolerando que no haya.
 *
 * `response.json()` no sirve acá: contra un 204 —que es lo que devuelve el `DELETE` de
 * eventos— tira `SyntaxError: Unexpected end of JSON input`, que el usuario vería como un error
 * de red en vez de una baja exitosa. Se lee como texto primero y solo se parsea si hay algo.
 */
async function readBody<T>(response: Response): Promise<T> {
  if (response.status === 204) return null as T

  const text = await response.text()
  if (text.length === 0) return null as T

  return JSON.parse(text) as T
}

/**
 * El cuerpo de error puede no ser JSON (por ejemplo, un 502 del proxy, o una página de error del
 * contenedor). Por eso va protegido: si no se puede parsear, igual hay que propagar el status.
 */
async function readErrorBody(response: Response): Promise<ApiErrorResponse | null> {
  try {
    return (await response.json()) as ApiErrorResponse
  } catch {
    return null
  }
}
