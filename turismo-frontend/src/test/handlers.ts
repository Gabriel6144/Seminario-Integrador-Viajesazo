import { http, HttpResponse } from 'msw'

import { errorBody, NOMINATIM_REVERSE, NOMINATIM_SEARCH, page } from './fixtures'
import {
  allBorradores,
  allEventos,
  allPublicadores,
  completeBorrador,
  createBorrador,
  createEvento,
  createPublicador,
  deleteBorrador,
  deleteEvento,
  findBorrador,
  findEvento,
  findPublicador,
  findPublicadorByEmail,
  updateBorrador,
  updateEvento,
} from './store'
import type { EventoRequest, PublicadorRequest, ViajeBorradorRequest } from '@/types/api'

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
  http.get('/api/propuestas', ({ request }) => {
    const searchParams = new URL(request.url).searchParams
    const tipo = searchParams.get('tipo')
    const publicadorId = searchParams.get('publicadorId')
    const propuestas = allEventos().map((evento) => ({
      ...evento,
      tipo: 'EVENTO' as const,
      duracionMinutos: null,
    }))
    const filtradas = propuestas.filter((p) => {
      if (tipo && p.tipo !== tipo) return false
      if (publicadorId && p.publicadorId !== Number(publicadorId)) return false
      return true
    })
    const { content, meta } = paginate(filtradas, request.url)
    return HttpResponse.json(page(content, meta))
  }),

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

  http.get('/api/viajes/borradores', ({ request }) => {
    const { content, meta } = paginate(allBorradores(), request.url)
    return HttpResponse.json(page(content, meta))
  }),

  http.get('/api/viajes/borradores/:id', ({ params }) => {
    const borrador = findBorrador(Number(params.id))
    if (borrador === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el borrador con id ${String(params.id)}`), { status: 404 })
    }
    return HttpResponse.json(borrador)
  }),

  http.post('/api/viajes/borradores', async ({ request }) => {
    const body = await readJson<Partial<ViajeBorradorRequest>>(request)
    return HttpResponse.json(createBorrador(body as ViajeBorradorRequest), { status: 201 })
  }),

  http.put('/api/viajes/borradores/:id', async ({ params, request }) => {
    const body = await readJson<Partial<ViajeBorradorRequest>>(request)
    const actualizado = updateBorrador(Number(params.id), body as ViajeBorradorRequest)
    if (actualizado === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el borrador con id ${String(params.id)}`), { status: 404 })
    }
    return HttpResponse.json(actualizado)
  }),

  http.post('/api/viajes/borradores/:id/completar', ({ params }) => {
    const completado = completeBorrador(Number(params.id))
    if (completado === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el borrador con id ${String(params.id)}`), { status: 404 })
    }
    return HttpResponse.json(completado)
  }),

  http.delete('/api/viajes/borradores/:id', ({ params }) => {
    if (!deleteBorrador(Number(params.id))) {
      return HttpResponse.json(errorBody(404, `No existe el borrador con id ${String(params.id)}`), { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/agenda', ({ request }) => {
    const params = new URL(request.url).searchParams
    const tipoPropuesta = params.get('tipoPropuesta')
    const categoria = params.get('categoria')
    const tipoAcceso = params.get('tipoAcceso')
    const ubicacion = normalizeText(params.get('ubicacion') ?? '')
    const fechaDesde = params.get('fechaDesde')
    const fechaHasta = params.get('fechaHasta')

    const eventos = allEventos()
      .filter((evento) => {
        // La agenda solo muestra eventos vigentes: ni cancelados ni terminados antes del rango.
        const estado =
          typeof evento.estadoPropuesta === 'object'
            ? evento.estadoPropuesta?.nombre
            : evento.estadoPropuesta
        if (estado === 'CANCELADO') return false
        if (fechaDesde !== null && evento.fechaFin < fechaDesde) return false
        if (fechaHasta !== null && evento.fechaInicio > fechaHasta) return false
        if (tipoPropuesta !== null && evento.tipoPropuesta !== tipoPropuesta) return false
        if (categoria !== null && evento.categoria !== categoria) return false
        if (tipoAcceso !== null && evento.tipoAcceso !== tipoAcceso) return false
        if (ubicacion !== '') {
          const camposUbicacion = normalizeText(
            [evento.localidad ?? '', evento.lugarRecinto ?? '', evento.direccion ?? ''].join(' '),
          )
          if (!camposUbicacion.includes(ubicacion)) return false
        }
        return true
      })
      .map((evento) => ({ ...evento, tipo: 'EVENTO' as const, duracionMinutos: null }))
      .sort((a, b) => {
        const cmpFecha = a.fechaInicio.localeCompare(b.fechaInicio)
        if (cmpFecha !== 0) return cmpFecha
        return (a.horarioInicio ?? '99:99:99').localeCompare(b.horarioInicio ?? '99:99:99')
      })

    const { content, meta } = paginate(eventos, request.url)
    return HttpResponse.json(page(content, meta))
  }),

  /**
   * Subida de imágenes. Devuelve una **URL fija** para que el test compruebe que esa URL es la que
   * viaja después en el `imagenes` del evento.
   *
   * No deriva del `archivo.name` a propósito: en jsdom el `File` es de otro realm que el `fetch` de
   * Node (undici), que al serializar el `FormData` lo trata como un `Blob` anónimo y pierde el
   * filename (queda `"blob"`). En el navegador real el nombre se preserva; el componente igual no
   * lo usa, lo resuelve el backend.
   *
   * Tampoco valida el contenido (el backend lo hace por firma de bytes): alcanza con rechazar la
   * parte faltante y el archivo vacío, que son los dos errores que el componente sabe mostrar.
   */
  http.post('/api/imagenes', async ({ request }) => {
    const formData = await request.formData()
    const archivo = formData.get('archivo')

    if (archivo === null || typeof archivo === 'string') {
      return HttpResponse.json(errorBody(400, 'falta el archivo a subir'), { status: 400 })
    }
    if (archivo.size === 0) {
      return HttpResponse.json(errorBody(400, 'no se recibió ningún archivo de imagen'), {
        status: 400,
      })
    }

    return HttpResponse.json({ url: '/api/archivos/subida.png' }, { status: 201 })
  }),

  // Nominatim (OpenStreetMap) para el buscador de ubicación del formulario. Rutas relativas como
  // las de la API: el frontend las pide por el proxy de Vite, nunca al dominio absoluto.
  http.get('/nominatim/search', () => HttpResponse.json(NOMINATIM_SEARCH)),

  http.get('/nominatim/reverse', () => HttpResponse.json(NOMINATIM_REVERSE)),
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
  if (body.lugarRecinto === undefined || body.lugarRecinto.trim().length === 0) {
    errores.push('lugarRecinto: el lugar o recinto es obligatorio')
  }
  if (body.localidad === undefined || body.localidad.trim().length === 0) {
    errores.push('localidad: la ciudad es obligatoria')
  }
  if (body.direccion === undefined || body.direccion.trim().length === 0) {
    errores.push('direccion: la dirección exacta es obligatoria')
  }

  // Misma regla de `EventoService.validateAcceso`: un evento arancelado exige monto y link.
  if (body.tipoAcceso === 'DE_PAGO') {
    if (body.montoEstimado === undefined || body.montoEstimado === null) {
      errores.push('montoEstimado: el monto estimado es obligatorio para un evento arancelado')
    }
    if (body.sitioOficial === undefined || (body.sitioOficial ?? '').trim().length === 0) {
      errores.push('sitioOficial: el link al sitio oficial es obligatorio para un evento arancelado')
    }
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

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

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
