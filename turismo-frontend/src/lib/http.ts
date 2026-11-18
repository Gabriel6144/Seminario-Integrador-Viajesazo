import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth-session'
import type { ApiErrorResponse, AuthTokenResponse } from '@/types/api'

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
    super(body?.message ?? body?.detail ?? `HTTP ${status}`)
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
    if (error.body?.detail) return error.body.detail
    return `No se pudo completar la petición (${error.status}).`
  }
  if (error instanceof TypeError) {
    // fetch solo tira TypeError cuando no hubo respuesta: backend caído o proxy roto.
    return 'No se pudo conectar con el servidor. ¿Está la API corriendo en el puerto 8080?'
  }
  return 'Ocurrió un error inesperado.'
}

/** Rutas de auth donde un 401 no debe disparar refresh (evitar bucles). */
function isAuthPath(path: string): boolean {
  return (
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/refresh') ||
    path.startsWith('/api/auth/logout')
  )
}

/** Header anti-CSRF para refresh/logout (cookie HttpOnly). El backend lo exige. */
export const VIAJESAZO_CSRF_HEADER = 'X-Viajesazo-CSRF'
export const VIAJESAZO_CSRF_VALUE = '1'

/** Single-flight: varios 401 concurrentes comparten un solo refresh. */
let refreshPromise: Promise<boolean> | null = null

async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshPromise !== null) return refreshPromise

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          [VIAJESAZO_CSRF_HEADER]: VIAJESAZO_CSRF_VALUE,
        },
      })
      if (!response.ok) {
        clearAccessToken()
        return false
      }
      const body = (await response.json()) as AuthTokenResponse
      setAccessToken(body.accessToken)
      return true
    } catch {
      clearAccessToken()
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function redirectToLogin(): void {
  const path = window.location.pathname
  if (path === '/login' || path === '/registro') return
  const search = window.location.search
  const next = encodeURIComponent(`${path}${search}`)
  window.location.assign(`/login?next=${next}`)
}

/**
 * Arma headers con Bearer. Para `FormData` solo se agrega `Authorization` si hay token y **no**
 * se setea `Content-Type` (el boundary lo pone el navegador). Evitar `new Headers()` con
 * multipart: undici/MSW en tests a veces falla al reparsear el body.
 */
function authHeaders(extra: HeadersInit | undefined, formData: boolean): HeadersInit | undefined {
  const token = getAccessToken()
  if (formData) {
    const headers: Record<string, string> = { [VIAJESAZO_CSRF_HEADER]: VIAJESAZO_CSRF_VALUE }
    if (token !== null) headers.Authorization = `Bearer ${token}`
    return headers
  }
  const headers = new Headers(extra)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (!headers.has(VIAJESAZO_CSRF_HEADER)) headers.set(VIAJESAZO_CSRF_HEADER, VIAJESAZO_CSRF_VALUE)
  if (token !== null) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

async function request<T>(
  path: string,
  init: RequestInit,
  alreadyRetried = false,
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  const headers = authHeaders(isFormData ? undefined : init.headers, isFormData)
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    ...(headers !== undefined ? { headers } : {}),
  })

  if (response.status === 401 && !alreadyRetried && !isAuthPath(path)) {
    const refreshed = await tryRefreshAccessToken()
    if (refreshed) {
      return request<T>(path, init, true)
    }
    clearAccessToken()
    redirectToLogin()
    throw new ApiError(401, await readErrorBody(response))
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorBody(response))
  }
  return readBody<T>(response)
}

/**
 * Cliente HTTP de la API.
 *
 * Todas las rutas son **relativas** a propósito: el proxy de Vite (`server.proxy` en
 * `vite.config.ts`) reenvía `/api` a `http://localhost:8080`, así que el navegador las ve como
 * same-origin y nunca dispara el chequeo de CORS. Por eso el backend no necesita
 * `@CrossOrigin` ni `CorsConfiguration` en desarrollo.
 *
 * Todas las requests llevan `credentials: 'include'` para la cookie HttpOnly de refresh.
 * El access token va solo en memoria (`auth-session`) como `Authorization: Bearer`.
 */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'GET', signal })
}

/** Verbos que escriben. `GET` queda aparte porque no lleva body ni `Content-Type`. */
type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

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
 * Baja. Por defecto el backend responde **204 sin cuerpo**, así que no se espera ningún valor: el
 * `null` de la firma está explícito para que no se intente leer nada de la respuesta. Algunas
 * bajas sí devuelven el recurso actualizado (por ejemplo, eliminar una parada del circuito), y
 * para esos casos se pasa el tipo de respuesta.
 */
export function apiDelete<TResponse = null>(path: string, signal?: AbortSignal): Promise<TResponse> {
  return write<TResponse>('DELETE', path, undefined, signal)
}

/**
 * Alta con `multipart/form-data` (subida de archivos).
 *
 * Va aparte de {@link write} a propósito: **no** se fija `Content-Type`. El navegador tiene que
 * ponerlo para incluir el `boundary` del multipart; si se setea `application/json` o un
 * `multipart/form-data` sin boundary, el servidor no puede parsear el body y responde 400.
 */
export function apiPostForm<TResponse>(
  path: string,
  formData: FormData,
  signal?: AbortSignal,
): Promise<TResponse> {
  return request<TResponse>(path, {
    method: 'POST',
    signal,
    body: formData,
  })
}

/** Actualización parcial. Útil para cambios de estado (ej. baja de usuario). */
export function apiPatch<TResponse, TRequest>(
  path: string,
  body: TRequest,
  signal?: AbortSignal,
): Promise<TResponse> {
  return write<TResponse>('PATCH', path, body, signal)
}

function write<TResponse>(
  method: WriteMethod,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<TResponse> {
  const hasBody = body !== undefined

  return request<TResponse>(path, {
    method,
    signal,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
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
