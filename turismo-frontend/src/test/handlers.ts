import { http, HttpResponse } from 'msw'

import { errorBody, page } from './fixtures'
import {
  allEventos,
  allPublicadores,
  createEvento,
  createPublicador,
  deleteEvento,
  findEvento,
  findPublicador,
  findPublicadorByEmail,
  updateEvento,
} from './store'
import type { EventoRequest, PublicadorRequest } from '@/types/api'

/**
 * Handlers de MSW que replican la API real.
 *
 * Las rutas son **relativas** a propósito, igual que las que arma `apiGet`: el cliente nunca
 * escribe `http://localhost:8080`. MSW las resuelve contra el `location` del jsdom, así que el
 * test ejercita exactamente la misma construcción de URL que el navegador.
 *
 * Los handlers de listado **pagan de verdad**: leen `?page` y `?size` y devuelven la porción
 * correspondiente. Si devolvieran la lista entera siempre, el test de paginación pasaría sin
 * verificar que la página 2 exista de verdad.
 *
 * Los de escritura leen y escriben el store, así que un alta o una baja se reflejan en los
 * listados siguientes. Es lo que permite testear el flujo completo —crear y ver el evento en la
 * grilla— en vez de solo que se haya hecho un POST.
 */
export const handlers = [
  http.get('/api/eventos', ({ request }) => {
    const { content, meta } = paginate(allEventos(), request.url)
    return HttpResponse.json(page(content, meta))
  }),

  http.get('/api/eventos/:id', ({ params }) => {
    const evento = findEvento(Number(params.id))
    if (evento === undefined) {
      return HttpResponse.json(
        errorBody(404, `No existe el evento con id ${String(params.id)}`),
        { status: 404 },
      )
    }
    return HttpResponse.json(evento)
  }),

  http.post('/api/eventos', async ({ request }) => {
    const body = await readJson<Partial<EventoRequest>>(request)
    const invalid = validateEvento(body)
    if (invalid !== null) {
      return HttpResponse.json(errorBody(400, invalid), { status: 400 })
    }

    return HttpResponse.json(createEvento(body as EventoRequest), { status: 201 })
  }),

  http.put('/api/eventos/:id', async ({ params, request }) => {
    const body = await readJson<Partial<EventoRequest>>(request)
    const invalid = validateEvento(body)
    if (invalid !== null) {
      return HttpResponse.json(errorBody(400, invalid), { status: 400 })
    }

    const actualizado = updateEvento(Number(params.id), body as EventoRequest)
    if (actualizado === undefined) {
      return HttpResponse.json(
        errorBody(404, `No existe el evento con id ${String(params.id)}`),
        { status: 404 },
      )
    }
    return HttpResponse.json(actualizado)
  }),

  http.delete('/api/eventos/:id', ({ params }) => {
    // **Sin cuerpo y con 204**, igual que el backend. Es el detalle que `apiDelete` tiene que
    // tolerar: un `response.json()` acá haría fallar el test por una razón que no es la que se
    // quiere verificar.
    if (!deleteEvento(Number(params.id))) {
      return HttpResponse.json(
        errorBody(404, `No existe el evento con id ${String(params.id)}`),
        { status: 404 },
      )
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/publicadores', ({ request }) => {
    const { content, meta } = paginate(allPublicadores(), request.url)
    return HttpResponse.json(page(content, meta))
  }),

  http.get('/api/publicadores/:id', ({ params }) => {
    const publicador = findPublicador(Number(params.id))
    if (publicador === undefined) {
      return HttpResponse.json(
        errorBody(404, `No existe el publicador con id ${String(params.id)}`),
        { status: 404 },
      )
    }
    return HttpResponse.json(publicador)
  }),

  http.get('/api/publicadores/:id/eventos', ({ params, request }) => {
    const delPublicador = allEventos().filter(
      (evento) => evento.publicadorId === Number(params.id),
    )
    const { content, meta } = paginate(delPublicador, request.url)
    return HttpResponse.json(page(content, meta))
  }),

  http.post('/api/publicadores', async ({ request }) => {
    const body = await readJson<Partial<PublicadorRequest>>(request)

    if (body.nombre === undefined || body.nombre.trim().length === 0) {
      return HttpResponse.json(errorBody(400, 'nombre: el nombre es obligatorio'), { status: 400 })
    }
    if (body.email === undefined || body.email.trim().length === 0) {
      return HttpResponse.json(errorBody(400, 'email: el email es obligatorio'), { status: 400 })
    }

    if (findPublicadorByEmail(body.email) !== undefined) {
      // Mismo mensaje que devuelve `PublicadorService` a través de `BusinessRuleException`.
      return HttpResponse.json(errorBody(400, 'ya existe un publicador con ese email'), {
        status: 400,
      })
    }

    return HttpResponse.json(createPublicador(body as PublicadorRequest), { status: 201 })
  }),

  http.get('/api/agenda/semanal', ({ request }) => {
    const { content, meta } = paginate(allEventos(), request.url)
    return HttpResponse.json(page(content, meta))
  }),
]

/**
 * El body llega como `unknown`: MSW no conoce el tipo que espera la API. El cast es explícito y
 * va seguido de la validación de `validateEvento`, que es la que revisa que los campos estén.
 */
async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T
}

/**
 * Validación mínima, en el formato que devuelve el backend.
 *
 * El backend aplana los errores de bean validation en un string
 * (`"campo: mensaje; campo: mensaje"`), así que el handler reproduce ese formato en vez de un
 * JSON con errores por campo. Es lo que obliga al frontend a no parsear la respuesta y a
 * validar por su cuenta.
 */
function validateEvento(body: Partial<EventoRequest>): string | null {
  const errores: string[] = []

  if (body.nombre === undefined || body.nombre.trim().length === 0) {
    errores.push('nombre: el nombre es obligatorio')
  }
  if (body.fechaInicio === undefined) {
    errores.push('fechaInicio: la fecha de inicio es obligatoria')
  }
  if (body.fechaFin === undefined) {
    errores.push('fechaFin: la fecha de finalización es obligatoria')
  }
  if (body.publicadorId === undefined) {
    errores.push('publicadorId: el publicador es obligatorio')
  }

  if (
    body.fechaInicio !== undefined &&
    body.fechaFin !== undefined &&
    body.fechaFin < body.fechaInicio
  ) {
    errores.push('la fecha de finalización no puede ser anterior a la de inicio')
  }

  return errores.length === 0 ? null : errores.join('; ')
}

const DEFAULT_SIZE = 12

function paginate<T>(items: T[], url: string) {
  const params = new URL(url).searchParams
  const size = Number(params.get('size') ?? DEFAULT_SIZE)
  const requested = Number(params.get('page') ?? 0)

  // Un `page` fuera de rango se clampea en vez de romper: así el modelo de la UI (que puede pedir
  // una página que quedó desactualizada) no recibe un error.
  const number = Math.min(Math.max(requested, 0), Math.max(0, Math.ceil(items.length / size) - 1))
  const content = items.slice(number * size, number * size + size)

  return {
    content,
    meta: { number, size, totalElements: items.length },
  }
}
