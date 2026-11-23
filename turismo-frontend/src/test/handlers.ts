import { http, HttpResponse } from 'msw'

import {
  ADMIN_DASHBOARD,
  OPCIONES_SUSTITUCION,
  errorBody,
  NOMINATIM_REVERSE,
  NOMINATIM_SEARCH,
  page,
  PUBLICADOR_INSCRIPTOS,
} from './fixtures'
import {
  addSuggestedCircuitoItem,
  allBorradores,
  allEventos,
  allPublicadores,
  cancelarViaje,
  completeBorrador,
  createBorrador,
  createCircuito,
  createEvento,
  createPublicador,
  createViaje,
  deleteBorrador,
  deleteEvento,
  discardDiaAviso,
  findBorrador,
  findCircuito,
  findCircuitoItem,
  findCircuitoSeleccionado,
  findEvento,
  findPublicador,
  findPublicadorByEmail,
  findSugerenciasDia,
  hasAlternativaGeneradaItem,
  removeAlternativaGeneradaItem,
  removeCircuitoItem,
  replaceAlternativaGeneradaItem,
  diasAlternativaGenerada,
  sugerenciasDiaAlternativa,
  addSuggestedAlternativaItem,
  replaceCircuitoItem,
  allNotificaciones,
  allAgendaActividades,
  darMeGusta,
  getMeGusta,
  marcarNotificacionLeida,
  previewReprogramacion,
  quitarMeGusta,
  reprogramarActividad,
  reprogramarEvento,
  selectCircuito,
  updateBorrador,
  updateEvento,
} from './store'
import { CIRCUIT_STRATEGIES } from '@/types/api'
import type {
  AuthTokenResponse,
  EventoRequest,
  LoginRequest,
  PropuestaResumenResponse,
  PublicadorRequest,
  SeleccionCircuitoRequest,
  UsuarioRequest,
  UsuarioResponse,
  ViajeBorradorRequest,
  ViajeRequest,
} from '@/types/api'

const DEMO_USUARIO: UsuarioResponse = {
  id: 1,
  nombre: 'Turista Demo',
  email: 'turista@test.com',
  telefono: null,
  roles: ['TURISTA'],
  publicadorId: null,
}

const DEMO_PUBLICADOR: UsuarioResponse = {
  id: 2,
  nombre: 'Publicador Demo',
  email: 'publicador@test.com',
  telefono: null,
  roles: ['PUBLICADOR'],
  publicadorId: 1,
}

const DEMO_ADMIN: UsuarioResponse = {
  id: 3,
  nombre: 'Admin Demo',
  email: 'admin@test.com',
  telefono: null,
  roles: ['ADMINISTRADOR'],
  publicadorId: null,
}

const AUTH_USERS: Record<string, { contrasena: string; usuario: UsuarioResponse }> = {
  'turista@test.com': { contrasena: 'Turista123!', usuario: DEMO_USUARIO },
  'publicador@test.com': { contrasena: 'Publicador123!', usuario: DEMO_PUBLICADOR },
  'admin@test.com': { contrasena: 'Admin123!', usuario: DEMO_ADMIN },
}

function tokenResponse(usuario: UsuarioResponse, accessToken = 'test-access-token'): AuthTokenResponse {
  return {
    accessToken,
    tokenType: 'Bearer',
    expiresInSeconds: 900,
    usuario,
  }
}

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
  http.post('/api/auth/login', async ({ request }) => {
    const body = await readJson<Partial<LoginRequest>>(request)
    const email = (body.email ?? '').trim().toLowerCase()
    const entry = AUTH_USERS[email]
    if (entry === undefined || entry.contrasena !== body.contrasena) {
      return HttpResponse.json(errorBody(400, 'email o contraseña incorrectos'), { status: 400 })
    }
    return HttpResponse.json(tokenResponse(entry.usuario), {
      headers: {
        'Set-Cookie': 'refresh_token=test-refresh; Path=/api/auth; HttpOnly',
      },
    })
  }),

  http.post('/api/auth/refresh', ({ request }) => {
    const cookie = request.headers.get('cookie') ?? ''
    if (!cookie.includes('refresh_token=')) {
      return HttpResponse.json(errorBody(401, 'refresh token ausente o inválido'), { status: 401 })
    }
    return HttpResponse.json(tokenResponse(DEMO_USUARIO, 'refreshed-access-token'), {
      headers: {
        'Set-Cookie': 'refresh_token=test-refresh-rotated; Path=/api/auth; HttpOnly',
      },
    })
  }),

  http.post('/api/auth/logout', () => {
    return new HttpResponse(null, {
      status: 204,
      headers: {
        'Set-Cookie': 'refresh_token=; Path=/api/auth; Max-Age=0; HttpOnly',
      },
    })
  }),

  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = await readJson<{ email?: string }>(request)
    if (!body.email?.trim()) {
      return HttpResponse.json(errorBody(400, 'el email es obligatorio'), { status: 400 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/auth/me', ({ request }) => {
    const auth = request.headers.get('authorization') ?? ''
    if (!auth.startsWith('Bearer ')) {
      return HttpResponse.json(errorBody(401, 'no autenticado'), { status: 401 })
    }
    return HttpResponse.json(DEMO_USUARIO)
  }),

  http.get('/api/admin/dashboard', () => {
    return HttpResponse.json(ADMIN_DASHBOARD)
  }),

  http.get('/api/publicador/inscriptos', () => {
    return HttpResponse.json(PUBLICADOR_INSCRIPTOS)
  }),

  http.get('/api/usuarios', ({ request }) => {
    const users = Object.values(AUTH_USERS).map((entry) => entry.usuario)
    const searchParams = new URL(request.url).searchParams
    const q = (searchParams.get('q') ?? '').trim().toLowerCase()
    const rol = searchParams.get('rol')
    const filtrados = users.filter((u) => {
      if (rol && !u.roles.includes(rol as UsuarioResponse['roles'][number])) return false
      if (q.length === 0) return true
      return `${u.nombre} ${u.email}`.toLowerCase().includes(q)
    })
    const { content, meta } = paginate(filtrados, request.url)
    return HttpResponse.json(page(content, meta))
  }),

  http.post('/api/usuarios', async ({ request }) => {
    const body = await readJson<Partial<UsuarioRequest>>(request)
    if (!body.nombre?.trim() || !body.email?.trim() || !body.contrasena) {
      return HttpResponse.json(errorBody(400, 'datos de registro incompletos'), { status: 400 })
    }
    if ((body.contrasena?.length ?? 0) < 8) {
      return HttpResponse.json(
        errorBody(400, 'contrasena: la contraseña debe tener entre 8 y 72 caracteres'),
        { status: 400 },
      )
    }
    const email = body.email.trim().toLowerCase()
    if (AUTH_USERS[email] !== undefined) {
      return HttpResponse.json(errorBody(400, 'ya existe un usuario con ese email'), { status: 400 })
    }
    if ((body.rol as string | undefined) === 'ADMINISTRADOR') {
      return HttpResponse.json(
        errorBody(400, 'el registro público solo admite los roles TURISTA o PUBLICADOR'),
        { status: 400 },
      )
    }
    const rol = body.rol === 'PUBLICADOR' ? 'PUBLICADOR' : 'TURISTA'
    const created: UsuarioResponse = {
      id: 99,
      nombre: body.nombre.trim(),
      email: body.email.trim(),
      telefono: body.telefono ?? null,
      roles: [rol],
      publicadorId: rol === 'PUBLICADOR' ? 99 : null,
    }
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get('/api/publicador/dashboard', () => {
    return HttpResponse.json({
      totalEventos: 2,
      totalActividades: 1,
      totalPropuestas: 3,
      proximas7d: 1,
      inscriptosPorPropuesta: PUBLICADOR_INSCRIPTOS,
    })
  }),

  http.get('/api/propuestas/:id/me-gusta', ({ params }) => {
    const id = Number(params.id)
    return HttpResponse.json(getMeGusta(id))
  }),

  http.post('/api/propuestas/:id/me-gusta', ({ params }) => {
    const id = Number(params.id)
    return HttpResponse.json(darMeGusta(id), { status: 201 })
  }),

  http.delete('/api/propuestas/:id/me-gusta', ({ params }) => {
    const id = Number(params.id)
    quitarMeGusta(id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/publicador/agenda', () => {
    // Eventos + actividades del publicador (alineado al backend listarAgenda).
    const eventos = allEventos().map((evento) => ({
      propuestaId: evento.id,
      nombre: evento.nombre,
      tipo: 'EVENTO' as const,
      fechaInicio: evento.fechaInicio,
      fechaFin: evento.fechaFin,
      modalidad: evento.modalidad,
      imagenUrl: evento.imagenes[0] ?? null,
      horarioInicio: evento.horarioInicio,
      horarioFin: evento.horarioFin,
      descripcion: evento.descripcion,
    }))
    return HttpResponse.json([...eventos, ...allAgendaActividades()])
  }),

  http.patch('/api/actividades/:id/reprogramar', async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as { fechaInicio?: string }
    if (!body.fechaInicio) {
      return HttpResponse.json(
        { status: 400, message: 'la fecha de inicio es obligatoria' },
        { status: 400 },
      )
    }
    const today = new Date()
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (body.fechaInicio < todayIso) {
      return HttpResponse.json(
        { status: 400, message: 'no se puede reprogramar a un día anterior a hoy' },
        { status: 400 },
      )
    }
    const actualizado = reprogramarActividad(id, body.fechaInicio)
    if (!actualizado) {
      return HttpResponse.json(
        { status: 404, message: `No existe la actividad con id ${id}` },
        { status: 404 },
      )
    }
    return HttpResponse.json(actualizado)
  }),

  http.get('/api/eventos/:id/reprogramar/preview', ({ params, request }) => {
    const id = Number(params.id)
    const url = new URL(request.url)
    const fechaInicio = url.searchParams.get('fechaInicio')
    if (!fechaInicio) {
      return HttpResponse.json(
        { status: 400, message: 'la fecha de inicio es obligatoria' },
        { status: 400 },
      )
    }
    const preview = previewReprogramacion(id, fechaInicio)
    if (!preview) {
      return HttpResponse.json({ status: 404, message: `No existe el evento con id ${id}` }, { status: 404 })
    }
    return HttpResponse.json(preview)
  }),

  http.patch('/api/eventos/:id/reprogramar', async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as { fechaInicio?: string }
    if (!body.fechaInicio) {
      return HttpResponse.json(
        { status: 400, message: 'la fecha de inicio es obligatoria' },
        { status: 400 },
      )
    }
    const today = new Date()
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (body.fechaInicio < todayIso) {
      return HttpResponse.json(
        { status: 400, message: 'no se puede reprogramar a un día anterior a hoy' },
        { status: 400 },
      )
    }
    const actualizado = reprogramarEvento(id, body.fechaInicio)
    if (!actualizado) {
      return HttpResponse.json({ status: 404, message: `No existe el evento con id ${id}` }, { status: 404 })
    }
    return HttpResponse.json(actualizado)
  }),

  http.get('/api/notificaciones', () => {
    // MSW /auth/me siempre es DEMO_USUARIO (id 1)
    return HttpResponse.json(allNotificaciones(1))
  }),

  http.patch('/api/notificaciones/:id/leida', ({ params }) => {
    const id = Number(params.id)
    const updated = marcarNotificacionLeida(id, 1)
    if (!updated) {
      return HttpResponse.json(
        { status: 404, message: `No existe la notificación con id ${id}` },
        { status: 404 },
      )
    }
    return HttpResponse.json(updated)
  }),

  http.get('/api/publicador/fechas-ocupadas', () => {
    const fechas = new Set<string>()
    for (const evento of allEventos()) {
      const [ys, ms, ds] = evento.fechaInicio.split('-').map(Number)
      const [ye, me, de] = evento.fechaFin.split('-').map(Number)
      const cur = new Date(ys, ms - 1, ds)
      const end = new Date(ye, me - 1, de)
      while (cur <= end) {
        const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
        fechas.add(iso)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return HttpResponse.json([...fechas].sort())
  }),

  http.get('/api/propuestas', ({ request }) => {
    const searchParams = new URL(request.url).searchParams
    const filtradas = filtrarPropuestas(searchParams)
    const { content, meta } = paginate(filtradas, request.url)
    return HttpResponse.json(page(content, meta))
  }),

  http.get('/api/propuestas/resumen', ({ request }) => {
    const searchParams = new URL(request.url).searchParams
    const filtradas = filtrarPropuestas(searchParams, { conTipo: false })
    return HttpResponse.json({
      total: filtradas.length,
      eventos: filtradas.filter((p) => p.tipo !== 'ACTIVIDAD').length,
      actividades: filtradas.filter((p) => p.tipo === 'ACTIVIDAD').length,
    })
  }),

  http.get('/api/propuestas/zonas', ({ request }) => {
    const searchParams = new URL(request.url).searchParams
    const publicadorId = searchParams.get('publicadorId')
    const incluirCanceladas = searchParams.get('incluirCanceladas') === 'true'
    const filtradas = propuestasMock().filter((p) => {
      if (publicadorId && p.publicadorId !== Number(publicadorId)) return false
      if (!incluirCanceladas && estadoNombre(p.estadoPropuesta) === 'CANCELADO') return false
      return true
    })
    const unicas = new Map<string, { ciudad: string | null; localidad: string | null }>()
    for (const p of filtradas) {
      const key = `${p.ciudad ?? ''}|${p.localidad ?? ''}`
      if (!unicas.has(key)) unicas.set(key, { ciudad: p.ciudad, localidad: p.localidad })
    }
    const zonas = [...unicas.values()].sort(
      (a, b) =>
        (a.ciudad ?? '').localeCompare(b.ciudad ?? '') ||
        (a.localidad ?? '').localeCompare(b.localidad ?? ''),
    )
    return HttpResponse.json(zonas)
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

  http.get('/api/viajes', ({ request }) => {
    // El JWT identifica al turista; MSW no valida auth y devuelve todos los del store.
    const { content, meta } = paginate(allBorradores(), request.url)
    return HttpResponse.json(page(content, meta))
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

  http.get('/api/viajes/:id', ({ params }) => {
    if (params.id === 'borradores') return
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    return HttpResponse.json(viaje)
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

  http.delete('/api/viajes/:id', ({ params }) => {
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    if (viaje.estado === 'EN_CURSO' || viaje.estado === 'FINALIZADO') {
      return HttpResponse.json(
        errorBody(400, 'el estado actual del viaje no permite cancelarlo'),
        { status: 400 },
      )
    }
    if (viaje.estado === 'CANCELADO') {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    if (!cancelarViaje(Number(params.id))) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/viajes', async ({ request }) => {
    const body = await readJson<Partial<ViajeRequest>>(request)
    if (body.nombre === undefined || body.nombre.trim().length === 0) {
      return HttpResponse.json(errorBody(400, 'nombre: el nombre es obligatorio'), { status: 400 })
    }
    if (!Array.isArray(body.intereses) || body.intereses.length === 0) {
      return HttpResponse.json(
        errorBody(400, 'intereses: La lista de intereses de categoría no puede estar vacía'),
        { status: 400 },
      )
    }
    return HttpResponse.json(createViaje(body as ViajeRequest), { status: 201 })
  }),

  http.get('/api/viajes/:id/circuito/seleccionado', ({ params }) => {
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    const circuito = findCircuitoSeleccionado(viaje.id)
    if (circuito === undefined) {
      return HttpResponse.json(
        errorBody(404, 'El circuito del viaje todavía no tiene una alternativa seleccionada'),
        { status: 404 },
      )
    }
    return HttpResponse.json(circuito)
  }),

  http.delete('/api/viajes/:id/circuito/seleccionado/items/:itemId', ({ params, request }) => {
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    const circuito = findCircuitoSeleccionado(viaje.id)
    if (circuito === undefined) {
      return HttpResponse.json(
        errorBody(404, 'El circuito del viaje todavía no tiene una alternativa seleccionada'),
        { status: 404 },
      )
    }
    const itemId = Number(params.itemId)
    const exists = circuito.dias.some((dia) => dia.items.some((item) => item.itemId === itemId))
    if (!exists) {
      return HttpResponse.json(
        errorBody(404, `No existe la parada con id ${String(params.itemId)} en el circuito seleccionado`),
        { status: 404 },
      )
    }
    const confirmar = new URL(request.url).searchParams.get('confirmar') === 'true'
    if (!confirmar) {
      return HttpResponse.json(
        errorBody(
          409,
          'la eliminación de la parada requiere confirmación; confirmá con confirmar=true',
        ),
        { status: 409 },
      )
    }
    removeCircuitoItem(viaje.id, itemId)
    return HttpResponse.json(circuito)
  }),

  http.get('/api/viajes/:id/circuito/seleccionado/items/:itemId/alternativas', ({ params }) => {
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    const circuito = findCircuitoSeleccionado(viaje.id)
    if (circuito === undefined) {
      return HttpResponse.json(
        errorBody(404, 'El circuito del viaje todavía no tiene una alternativa seleccionada'),
        { status: 404 },
      )
    }
    const itemId = Number(params.itemId)
    const item = findCircuitoItem(viaje.id, itemId)
    if (item === undefined) {
      return HttpResponse.json(
        errorBody(
          404,
          `No existe la parada con id ${String(params.itemId)} en el circuito seleccionado`,
        ),
        { status: 404 },
      )
    }
    if (itemId === 101) return HttpResponse.json(OPCIONES_SUSTITUCION)
    return HttpResponse.json({
      ...OPCIONES_SUSTITUCION,
      opciones: [],
      noEntran: [],
      mensaje: 'No hay propuestas disponibles para reemplazar esta parada.',
    })
  }),

  http.put('/api/viajes/:id/circuito/seleccionado/items/:itemId', async ({ params, request }) => {
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    const circuito = findCircuitoSeleccionado(viaje.id)
    if (circuito === undefined) {
      return HttpResponse.json(
        errorBody(404, 'El circuito del viaje todavía no tiene una alternativa seleccionada'),
        { status: 404 },
      )
    }
    const item = findCircuitoItem(viaje.id, Number(params.itemId))
    if (item === undefined) {
      return HttpResponse.json(
        errorBody(
          404,
          `No existe la parada con id ${String(params.itemId)} en el circuito seleccionado`,
        ),
        { status: 404 },
      )
    }
    const body = await readJson<Partial<{ propuestaId: number }>>(request)
    if (typeof body.propuestaId !== 'number') {
      return HttpResponse.json(errorBody(400, 'La propuesta de reemplazo es obligatoria'), {
        status: 400,
      })
    }
    const alternativa = OPCIONES_SUSTITUCION.opciones.find(
      (candidate) => candidate.propuestaId === body.propuestaId,
    )
    if (alternativa === undefined) {
      return HttpResponse.json(
        errorBody(422, 'La propuesta elegida no puede reemplazar a esta parada'),
        { status: 422 },
      )
    }
    replaceCircuitoItem(viaje.id, item.itemId, alternativa)
    return HttpResponse.json(circuito)
  }),

  http.get('/api/viajes/:id/circuito/seleccionado/dias/:fecha/sugerencias', ({ params }) => {
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    const circuito = findCircuitoSeleccionado(viaje.id)
    if (circuito === undefined) {
      return HttpResponse.json(
        errorBody(404, 'El circuito del viaje todavía no tiene una alternativa seleccionada'),
        { status: 404 },
      )
    }
    const response = findSugerenciasDia(viaje.id, String(params.fecha))
    if (response === undefined) {
      return HttpResponse.json(
        errorBody(404, `No existe el día ${String(params.fecha)} en el circuito seleccionado`),
        { status: 404 },
      )
    }
    return HttpResponse.json(response)
  }),

  http.post(
    '/api/viajes/:id/circuito/seleccionado/dias/:fecha/items',
    async ({ params, request }) => {
      const viaje = findBorrador(Number(params.id))
      if (viaje === undefined) {
        return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
          status: 404,
        })
      }
      if (findCircuitoSeleccionado(viaje.id) === undefined) {
        return HttpResponse.json(
          errorBody(404, 'El circuito del viaje todavía no tiene una alternativa seleccionada'),
          { status: 404 },
        )
      }
      const body = await readJson<Partial<{ propuestaId: number }>>(request)
      if (typeof body.propuestaId !== 'number') {
        return HttpResponse.json(errorBody(400, 'La propuesta sugerida es obligatoria'), {
          status: 400,
        })
      }
      const result = addSuggestedCircuitoItem(viaje.id, String(params.fecha), body.propuestaId)
      if (result === 'not-found') {
        return HttpResponse.json(
          errorBody(404, `No existe el día ${String(params.fecha)} en el circuito seleccionado`),
          { status: 404 },
        )
      }
      if (result === 'invalid') {
        return HttpResponse.json(
          errorBody(422, 'la propuesta elegida ya no es una sugerencia válida para este día'),
          { status: 422 },
        )
      }
      return HttpResponse.json(result)
    },
  ),

  http.put('/api/viajes/:id/circuito/seleccionado/dias/:fecha/aviso', async ({ params, request }) => {
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    if (findCircuitoSeleccionado(viaje.id) === undefined) {
      return HttpResponse.json(
        errorBody(404, 'El circuito del viaje todavía no tiene una alternativa seleccionada'),
        { status: 404 },
      )
    }
    const body = await readJson<Partial<{ descartado: boolean }>>(request)
    if (body.descartado !== true) {
      return HttpResponse.json(errorBody(400, 'descartado debe ser true'), { status: 400 })
    }
    const updated = discardDiaAviso(viaje.id, String(params.fecha))
    if (updated === undefined) {
      return HttpResponse.json(
        errorBody(404, `No existe el día ${String(params.fecha)} en el circuito seleccionado`),
        { status: 404 },
      )
    }
    return HttpResponse.json(updated)
  }),

  http.get('/api/viajes/:id/circuito', ({ params }) => {
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    const circuito = findCircuito(viaje.id)
    if (circuito !== undefined) {
      return HttpResponse.json(circuito)
    }
    const seleccionado = findCircuitoSeleccionado(viaje.id)
    if (seleccionado !== undefined) {
      return HttpResponse.json({
        generadoEn: seleccionado.generadoEn,
        estrategiaSeleccionada: seleccionado.estrategia,
        distanciasEstimadas: seleccionado.distanciasEstimadas,
        advertencia: seleccionado.advertencia,
        alternativas: [
          {
            estrategia: seleccionado.estrategia,
            distanciaTotalKm: 0,
            afinidadIntereses: 0,
            categoriasCubiertas: [],
            advertencia: seleccionado.advertencia,
            propuestas: seleccionado.dias.flatMap((dia) =>
              dia.items.map((item, index) => ({
                itemId: item.itemId,
                propuestaId: item.propuestaId,
                propuestaNombre: item.propuestaNombre,
                descripcion: null,
                categoria: item.categoria,
                tipo: item.tipo,
                fecha: dia.fecha,
                orden: index + 1,
                horaInicio: item.horaInicio,
                horaFin: item.horaFin,
                trasladoKm: 0,
                trasladoMinutos: 0,
                disponible: true,
                motivoNoDisponible: null,
                imagenes: [],
                ciudad: item.ciudad,
                localidad: item.localidad,
                direccion: item.direccion,
                lugarRecinto: null,
                latitud: null,
                longitud: null,
                tipoAcceso: null,
                montoEstimado: null,
                descripcionArancel: null,
                sitioOficial: null,
                duracionMinutos: item.duracionMinutos,
              })),
            ),
          },
        ],
      })
    }
    return HttpResponse.json(errorBody(404, 'El viaje todavía no tiene un circuito generado'), {
      status: 404,
    })
  }),

  http.post('/api/viajes/:id/circuito', ({ params, request }) => {
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    const existente = findCircuito(viaje.id)
    const reemplazar = new URL(request.url).searchParams.get('reemplazar') === 'true'
    if (existente !== undefined && !reemplazar) {
      return HttpResponse.json(
        errorBody(
          409,
          'el circuito del viaje ya fue generado; confirmá con reemplazar=true para regenerarlo',
        ),
        { status: 409 },
      )
    }
    return HttpResponse.json(createCircuito(viaje.id), {
      status: existente === undefined ? 201 : 200,
    })
  }),

  // Antes de confirmar: sustituir / eliminar paradas de una alternativa sin elegir.
  http.get(
    '/api/viajes/:id/circuito/alternativas/:estrategia/items/:itemId/alternativas',
    ({ params }) => {
      const circuito = findCircuito(Number(params.id))
      if (circuito === undefined) {
        return HttpResponse.json(errorBody(404, 'El viaje todavía no tiene un circuito generado'), {
          status: 404,
        })
      }
      if (circuito.estrategiaSeleccionada !== null) {
        return HttpResponse.json(
          errorBody(400, 'el circuito ya tiene una alternativa elegida'),
          { status: 400 },
        )
      }
      if (!hasAlternativaGeneradaItem(Number(params.id), String(params.estrategia), Number(params.itemId))) {
        return HttpResponse.json(errorBody(404, 'No existe la parada en la alternativa'), {
          status: 404,
        })
      }
      return HttpResponse.json(OPCIONES_SUSTITUCION)
    },
  ),

  http.put(
    '/api/viajes/:id/circuito/alternativas/:estrategia/items/:itemId',
    async ({ params, request }) => {
      const body = await readJson<Partial<{ propuestaId: number }>>(request)
      const reemplazo = OPCIONES_SUSTITUCION.opciones.find(
        (candidate) => candidate.propuestaId === body.propuestaId,
      )
      if (reemplazo === undefined) {
        return HttpResponse.json(
          errorBody(422, 'la propuesta elegida no es un reemplazo válido para esta parada'),
          { status: 422 },
        )
      }
      const circuito = replaceAlternativaGeneradaItem(
        Number(params.id),
        String(params.estrategia),
        Number(params.itemId),
        reemplazo,
      )
      if (circuito === undefined) {
        return HttpResponse.json(errorBody(404, 'No existe la parada en la alternativa'), {
          status: 404,
        })
      }
      return HttpResponse.json(circuito)
    },
  ),

  http.delete('/api/viajes/:id/circuito/alternativas/:estrategia/items/:itemId', ({ params, request }) => {
    if (new URL(request.url).searchParams.get('confirmar') !== 'true') {
      return HttpResponse.json(
        errorBody(409, 'la eliminación de la parada requiere confirmación; confirmá con confirmar=true'),
        { status: 409 },
      )
    }
    const circuito = removeAlternativaGeneradaItem(
      Number(params.id),
      String(params.estrategia),
      Number(params.itemId),
    )
    if (circuito === undefined) {
      return HttpResponse.json(errorBody(404, 'No existe la parada en la alternativa'), {
        status: 404,
      })
    }
    return HttpResponse.json(circuito)
  }),

  // Antes de confirmar: completar días incompletos de una alternativa sin elegir.
  http.get('/api/viajes/:id/circuito/alternativas/:estrategia/dias', ({ params }) => {
    const circuito = findCircuito(Number(params.id))
    if (circuito?.estrategiaSeleccionada != null) {
      return HttpResponse.json(errorBody(400, 'el circuito ya tiene una alternativa elegida'), {
        status: 400,
      })
    }
    const dias = diasAlternativaGenerada(Number(params.id), String(params.estrategia))
    if (dias === undefined) {
      return HttpResponse.json(errorBody(404, 'No existe la alternativa en el circuito generado'), {
        status: 404,
      })
    }
    return HttpResponse.json(dias)
  }),

  http.get(
    '/api/viajes/:id/circuito/alternativas/:estrategia/dias/:fecha/sugerencias',
    ({ params }) => {
      const response = sugerenciasDiaAlternativa(
        Number(params.id),
        String(params.estrategia),
        String(params.fecha),
      )
      if (response === undefined) {
        return HttpResponse.json(
          errorBody(404, `No existe el día ${String(params.fecha)} en el circuito seleccionado`),
          { status: 404 },
        )
      }
      return HttpResponse.json(response)
    },
  ),

  http.post(
    '/api/viajes/:id/circuito/alternativas/:estrategia/dias/:fecha/items',
    async ({ params, request }) => {
      const body = await readJson<Partial<{ propuestaId: number }>>(request)
      if (typeof body.propuestaId !== 'number') {
        return HttpResponse.json(errorBody(400, 'La propuesta sugerida es obligatoria'), {
          status: 400,
        })
      }
      const result = addSuggestedAlternativaItem(
        Number(params.id),
        String(params.estrategia),
        String(params.fecha),
        body.propuestaId,
      )
      if (result === 'not-found') {
        return HttpResponse.json(
          errorBody(404, `No existe el día ${String(params.fecha)} en el circuito seleccionado`),
          { status: 404 },
        )
      }
      if (result === 'invalid') {
        return HttpResponse.json(
          errorBody(422, 'la propuesta elegida ya no es una sugerencia válida para este día'),
          { status: 422 },
        )
      }
      return HttpResponse.json(result)
    },
  ),

  http.post('/api/viajes/:id/circuito/seleccion', async ({ params, request }) => {
    const viaje = findBorrador(Number(params.id))
    if (viaje === undefined) {
      return HttpResponse.json(errorBody(404, `No existe el viaje con id ${String(params.id)}`), {
        status: 404,
      })
    }
    const body = await readJson<Partial<SeleccionCircuitoRequest>>(request)
    if (body.estrategia === undefined || !CIRCUIT_STRATEGIES.includes(body.estrategia)) {
      return HttpResponse.json(errorBody(400, 'la estrategia del circuito no es válida'), {
        status: 400,
      })
    }
    const circuito = findCircuito(viaje.id)
    if (circuito === undefined) {
      return HttpResponse.json(errorBody(404, 'El viaje todavía no tiene un circuito generado'), {
        status: 404,
      })
    }
    if (circuito.estrategiaSeleccionada !== null) {
      return HttpResponse.json(
        errorBody(400, 'el circuito del viaje ya tiene una alternativa seleccionada'),
        { status: 400 },
      )
    }
    if (!circuito.alternativas.some((alternativa) => alternativa.estrategia === body.estrategia)) {
      return HttpResponse.json(
        errorBody(400, 'la alternativa seleccionada no existe en el circuito generado'),
        { status: 400 },
      )
    }
    const seleccionado = selectCircuito(viaje.id, body.estrategia)
    return HttpResponse.json(seleccionado)
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

  // OSRM FOSSGIS (geometría a pie del mapa de consulta).
  http.get('https://routing.openstreetmap.de/routed-foot/route/v1/driving/:coords', () =>
    HttpResponse.json({
      code: 'Ok',
      routes: [
        {
          geometry: {
            type: 'LineString',
            coordinates: [
              [-64.18, -31.42],
              [-64.183, -31.413],
            ],
          },
        },
      ],
    }),
  ),
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

/**
 * El catálogo real devuelve `localidad`, no `ciudad`; el mock deriva una ciudad razonable para
 * poder ejercitar el filtro sin inventar un campo en el contrato público.
 */
const CIUDAD_POR_LOCALIDAD: Record<string, string> = {
  'Jesús María': 'Jesús María',
  'Río Ceballos': 'Río Ceballos',
  'Córdoba Capital': 'Córdoba',
}

type PropuestaMock = PropuestaResumenResponse & { ciudad: string | null }

function ciudadDe(localidad: string | null): string | null {
  if (localidad === null) return null
  return CIUDAD_POR_LOCALIDAD[localidad] ?? localidad
}

function estadoNombre(value: PropuestaResumenResponse['estadoPropuesta']): string | null {
  if (value === null) return null
  return typeof value === 'object' ? value.nombre : value
}

function propuestasMock(): PropuestaMock[] {
  return allEventos().map((evento) => ({
    ...evento,
    tipo: 'EVENTO' as const,
    duracionMinutos: null,
    ciudad: ciudadDe(evento.localidad),
  }))
}

/** Réplica del filtrado server-side de `/api/propuestas` para que los tests usen la URL real. */
function filtrarPropuestas(
  searchParams: URLSearchParams,
  { conTipo = true }: { conTipo?: boolean } = {},
): PropuestaMock[] {
  const tipo = conTipo ? searchParams.get('tipo') : null
  const publicadorId = searchParams.get('publicadorId')
  const q = searchParams.get('q')
  const ciudad = searchParams.get('ciudad')
  const localidad = searchParams.get('localidad')
  const estado = searchParams.get('estado')
  const tipoPropuesta = searchParams.get('tipoPropuesta')
  const categoria = searchParams.get('categoria')
  const fechaDesde = searchParams.get('fechaDesde')
  const fechaHasta = searchParams.get('fechaHasta')
  const incluirCanceladas = searchParams.get('incluirCanceladas') === 'true'

  return propuestasMock().filter((p) => {
    if (tipo && p.tipo !== tipo) return false
    if (publicadorId && p.publicadorId !== Number(publicadorId)) return false
    if (ciudad && normalizeText(p.ciudad ?? '') !== normalizeText(ciudad)) return false
    if (localidad && normalizeText(p.localidad ?? '') !== normalizeText(localidad)) return false
    if (estado && estadoNombre(p.estadoPropuesta) !== estado) return false
    if (tipoPropuesta && p.tipoPropuesta !== tipoPropuesta) return false
    if (categoria && p.categoria !== categoria) return false
    if (!incluirCanceladas && estado === null && estadoNombre(p.estadoPropuesta) === 'CANCELADO') {
      return false
    }
    if (q) {
      const texto = normalizeText(
        [p.nombre, p.descripcion ?? '', p.lugarRecinto ?? '', p.localidad ?? ''].join(' '),
      )
      if (!texto.includes(normalizeText(q))) return false
    }
    if (fechaDesde || fechaHasta) {
      const inicio = p.fechaInicio
      const fin = p.fechaFin ?? p.fechaInicio
      if (inicio === null || fin === null) return false
      if (fechaDesde && fin < fechaDesde) return false
      if (fechaHasta && inicio > fechaHasta) return false
    }
    return true
  })
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
