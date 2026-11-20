import {
  BORRADORES,
  CIRCUITO,
  CIRCUITO_SELECCIONADO,
  EVENTOS,
  PUBLICADORES,
  SUGERENCIAS_DIA,
} from './fixtures'
import type {
  ActividadResponse,
  AlternativaItemResponse,
  CircuitStrategy,
  CircuitoSeleccionadoResponse,
  EventoRequest,
  EventoResponse,
  GeneracionCircuitoResponse,
  OpcionSustitucionResponse,
  NotificacionResponse,
  PublicadorAgendaItemResponse,
  PublicadorRequest,
  PublicadorResponse,
  ResumenDiaAlternativaResponse,
  ResumenDiaCircuito,
  SugerenciaDiaResponse,
  SugerenciasDiaResponse,
  ViajeBorradorRequest,
  ViajeRequest,
  ViajeResponse,
} from '@/types/api'

/** Notificación en memoria con destinatario (solo para MSW). */
export interface StoredNotificacion extends NotificacionResponse {
  usuarioId: number
}

/**
 * Base de datos en memoria para los tests.
 *
 * Los handlers de MSW necesitan leer y **escribir** estado: si un test crea un evento y después
 * consulta el listado, tiene que aparecer. Con un array de fixtures constante eso no pasa, y un
 * test que "crea" y no comprueba nada más es un test que no verifica el comportamiento.
 *
 * El store arranca con una copia de los fixtures y se reinicia con `resetStore()` en el
 * `beforeEach` de los tests que escriben. La copia es profunda justamente para que mutar un
 * evento del store no ensucie el fixture, que es compartido por los siete archivos de test
 * existentes.
 */

let eventos: EventoResponse[] = []
let publicadores: PublicadorResponse[] = []
let borradores: ViajeResponse[] = []
let notificaciones: StoredNotificacion[] = []
/** Actividades del publicador demo para Mi Agenda (MSW). */
let agendaActividades: PublicadorAgendaItemResponse[] = []
let circuitos = new Map<number, GeneracionCircuitoResponse>()
let circuitosSeleccionados = new Map<number, CircuitoSeleccionadoResponse>()
let nextEventoId = 0
let nextPublicadorId = 0
let nextBorradorId = 0
let nextNotificacionId = 1
let nextCircuitoItemId = 400
/** Fuerza lista vacía en sugerencias (tests de mensaje vacío / 422). */
let sugerenciasVacias = false
/** Paradas que el turista sumó con sugerencias antes de confirmar (por itemId). */
let agregadasAntesDeConfirmar = new Set<number>()

/** Mock de inscriptos por propuesta para preview / notify en tests. */
const MOCK_INSCRIPTOS_POR_PROPUESTA = 2
const MOCK_TURISTA_ID = 1

function buildGeneradoFromSeleccionado(
  seleccionado: CircuitoSeleccionadoResponse,
): GeneracionCircuitoResponse {
  return {
    generadoEn: seleccionado.generadoEn,
    estrategiaSeleccionada: seleccionado.estrategia,
    distanciasEstimadas: seleccionado.distanciasEstimadas,
    advertencia: seleccionado.advertencia,
    alternativas: [
      {
        estrategia: seleccionado.estrategia,
        distanciaTotalKm: 0,
        afinidadIntereses: 0.87,
        categoriasCubiertas: ['CULTURA', 'MUSICA'],
        advertencia: seleccionado.advertencia,
        propuestas: seleccionado.dias.flatMap((dia) =>
          dia.items.map((item, index) => ({
            itemId: item.itemId,
            propuestaId: item.propuestaId,
            propuestaNombre: item.propuestaNombre,
            descripcion:
              item.propuestaNombre === 'Festival de Doma y Folklore de Jesús María'
                ? 'La mayor fiesta de la tradición gaucha y música folklórica.'
                : item.propuestaNombre === 'Circuito Peatonal Histórico Córdoba Jesuítica'
                  ? 'Recorrido patrimonial guiado por templos y museos fundacionales.'
                  : 'Experiencia sugerida para tu recorrido.',
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
            imagenes: ['https://example.com/circuito.jpg'],
            ciudad: item.ciudad,
            localidad: item.localidad,
            direccion: item.direccion,
            lugarRecinto: item.localidad ?? 'Centro',
            latitud: -31.42,
            longitud: -64.18,
            tipoAcceso: 'GRATUITO',
            montoEstimado: null,
            descripcionArancel: null,
            sitioOficial: null,
            duracionMinutos: item.duracionMinutos,
          })),
        ),
      },
    ],
  }
}

/** Estado de me gusta por propuesta (demo MSW: un turista de sesión). */
let meGustas = new Map<number, { meGusta: boolean; total: number }>()

export function resetStore(): void {
  eventos = structuredClone(EVENTOS)
  publicadores = structuredClone(PUBLICADORES)
  borradores = structuredClone(BORRADORES)
  notificaciones = []
  meGustas = new Map()
  // Ids altos para no chocar con eventos del fixture.
  agendaActividades = [
    {
      propuestaId: 9001,
      nombre: 'Trekking Sierras',
      tipo: 'ACTIVIDAD',
      fechaInicio: '2026-10-10',
      fechaFin: '2026-10-10',
      modalidad: 'PEDESTRE',
      imagenUrl: null,
      horarioInicio: null,
      horarioFin: null,
      descripcion: 'Caminata por senderos de las sierras.',
    },
    {
      propuestaId: 9002,
      nombre: 'Taller de cocina',
      tipo: 'ACTIVIDAD',
      fechaInicio: '2026-10-15',
      fechaFin: '2026-10-16',
      modalidad: null,
      imagenUrl: null,
      horarioInicio: null,
      horarioFin: null,
      descripcion: 'Aprende recetas regionales.',
    },
  ]
  const seleccionadoViaje2 = structuredClone(CIRCUITO_SELECCIONADO)
  circuitosSeleccionados = new Map([[2, seleccionadoViaje2]])
  circuitos = new Map([[2, buildGeneradoFromSeleccionado(seleccionadoViaje2)]])
  // Los fixtures ya traen ids 1..3 y 1..7, así que los siguientes arrancan por arriba.
  nextEventoId = Math.max(0, ...EVENTOS.map((evento) => evento.id)) + 1
  nextPublicadorId = Math.max(0, ...PUBLICADORES.map((publicador) => publicador.id)) + 1
  nextBorradorId = Math.max(0, ...BORRADORES.map((borrador) => borrador.id)) + 1
  nextNotificacionId = 1
  nextCircuitoItemId = 400
  sugerenciasVacias = false
  agregadasAntesDeConfirmar = new Set()
}

function refreshDiaResumen(
  resumen: ResumenDiaCircuito | null | undefined,
  extras: Partial<ResumenDiaCircuito>,
): ResumenDiaCircuito {
  const base: ResumenDiaCircuito = resumen ?? {
    asignadas: 0,
    minimo: 2,
    agregadasPorUsuario: 0,
    avisoDescartado: false,
    mensaje: null,
    pendiente: false,
    puedeCompletar: false,
  }
  const next = { ...base, ...extras }
  const cubiertas = next.asignadas + next.agregadasPorUsuario
  const pendiente =
    next.minimo > 0 && cubiertas < next.minimo && !next.avisoDescartado
  next.pendiente = pendiente
  next.puedeCompletar = pendiente
  if (pendiente && !next.mensaje) {
    next.mensaje = `Se asignaron ${next.asignadas} de ${next.minimo} paradas pedidas para este día. La generación no rellena sola: podés completar con sugerencias.`
  }
  if (!pendiente) {
    next.mensaje = null
  }
  return next
}

/** Tests: fuerza `sugerencias: []` en el GET de sugerencias. */
export function setSugerenciasVacias(value: boolean): void {
  sugerenciasVacias = value
}

export function findSugerenciasDia(
  viajeId: number,
  fecha: string,
): SugerenciasDiaResponse | undefined {
  const circuito = circuitosSeleccionados.get(viajeId)
  if (circuito === undefined) return undefined
  const dia = circuito.dias.find((candidate) => candidate.fecha === fecha)
  if (dia === undefined) return undefined
  if (!dia.resumen?.pendiente || sugerenciasVacias) {
    return {
      sugerencias: [],
      mensaje: 'No encontramos propuestas para completar este día',
    }
  }
  const usadas = new Set(
    circuito.dias.flatMap((d) => d.items.map((item) => item.propuestaId)),
  )
  const sugerencias = SUGERENCIAS_DIA.sugerencias.filter(
    (s) => !usadas.has(s.propuestaId),
  )
  return {
    sugerencias,
    mensaje:
      sugerencias.length === 0
        ? 'No encontramos propuestas para completar este día'
        : null,
  }
}

export function addSuggestedCircuitoItem(
  viajeId: number,
  fecha: string,
  propuestaId: number,
): CircuitoSeleccionadoResponse | 'not-found' | 'invalid' {
  const circuito = circuitosSeleccionados.get(viajeId)
  if (circuito === undefined) return 'not-found'
  const dia = circuito.dias.find((candidate) => candidate.fecha === fecha)
  if (dia === undefined) return 'not-found'
  const available = findSugerenciasDia(viajeId, fecha)
  const sugerencia = available?.sugerencias.find((s) => s.propuestaId === propuestaId)
  if (sugerencia === undefined) return 'invalid'

  const item: AlternativaItemResponse = {
    itemId: nextCircuitoItemId++,
    propuestaId: sugerencia.propuestaId,
    propuestaNombre: sugerencia.nombre,
    tipo: sugerencia.tipo,
    categoria: sugerencia.categoria,
    ciudad: sugerencia.ciudad,
    localidad: sugerencia.localidad,
    direccion: sugerencia.direccion,
    horaInicio: sugerencia.horaInicio,
    horaFin: sugerencia.horaFin,
    duracionMinutos: sugerencia.duracionMinutos,
    origen: 'SUGERENCIA_ACEPTADA',
  }
  dia.items.push(item)
  dia.items.sort((a, b) => (a.horaInicio ?? '').localeCompare(b.horaInicio ?? ''))
  dia.resumen = refreshDiaResumen(dia.resumen, {
    agregadasPorUsuario: (dia.resumen?.agregadasPorUsuario ?? 0) + 1,
  })
  syncGeneradoFromSeleccionado(viajeId)
  return circuito
}

export function discardDiaAviso(
  viajeId: number,
  fecha: string,
): CircuitoSeleccionadoResponse | undefined {
  const circuito = circuitosSeleccionados.get(viajeId)
  if (circuito === undefined) return undefined
  const dia = circuito.dias.find((candidate) => candidate.fecha === fecha)
  if (dia === undefined) return undefined
  dia.resumen = refreshDiaResumen(dia.resumen, { avisoDescartado: true })
  return circuito
}

/** Expone una sugerencia del fixture para armar respuestas de error en handlers. */
export function findSugerenciaFixture(
  propuestaId: number,
): SugerenciaDiaResponse | undefined {
  return SUGERENCIAS_DIA.sugerencias.find((s) => s.propuestaId === propuestaId)
}

export function getMeGusta(propuestaId: number): { meGusta: boolean; total: number } {
  return meGustas.get(propuestaId) ?? { meGusta: false, total: 0 }
}

export function darMeGusta(propuestaId: number): { meGusta: boolean; total: number } {
  const prev = getMeGusta(propuestaId)
  const next = {
    meGusta: true,
    total: prev.meGusta ? prev.total : prev.total + 1,
  }
  meGustas.set(propuestaId, next)
  return next
}

export function quitarMeGusta(propuestaId: number): { meGusta: boolean; total: number } {
  const prev = getMeGusta(propuestaId)
  const next = {
    meGusta: false,
    total: prev.meGusta ? Math.max(0, prev.total - 1) : prev.total,
  }
  meGustas.set(propuestaId, next)
  return next
}

export function allEventos(): EventoResponse[] {
  return eventos
}

export function allAgendaActividades(): PublicadorAgendaItemResponse[] {
  return agendaActividades
}

/** Reprograma una actividad de agenda (MSW); devuelve un ActividadResponse mínimo. */
export function reprogramarActividad(
  id: number,
  fechaInicio: string,
): ActividadResponse | undefined {
  const item = agendaActividades.find((a) => a.propuestaId === id)
  if (item === undefined) return undefined

  const [ys, ms, ds] = item.fechaInicio.split('-').map(Number)
  const [ye, me, de] = item.fechaFin.split('-').map(Number)
  const offsetDays = Math.round(
    (new Date(ye, me - 1, de).getTime() - new Date(ys, ms - 1, ds).getTime()) /
      (24 * 60 * 60 * 1000),
  )
  const [y, m, d] = fechaInicio.split('-').map(Number)
  const fin = new Date(y, m - 1, d + offsetDays)
  const fechaFin = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`

  const actualizado: PublicadorAgendaItemResponse = {
    ...item,
    fechaInicio,
    fechaFin,
  }
  agendaActividades[agendaActividades.indexOf(item)] = actualizado

  return {
    id,
    tipo: 'ACTIVIDAD',
    nombre: actualizado.nombre,
    descripcion: null,
    tipoPropuesta: 'VISITA_GUIADA',
    categoria: null,
    modalidad: actualizado.modalidad,
    tipoAcceso: 'GRATUITO',
    estadoPropuesta: 'INICIADO',
    lugarRecinto: null,
    localidad: null,
    direccion: null,
    latitud: null,
    longitud: null,
    duracionMinutos: 60,
    fechaInicio,
    fechaFin,
    disponibilidades: [],
    imagenes: [],
    publicadorId: 1,
    publicadorNombre: 'Turismo Córdoba',
  }
}

export function allPublicadores(): PublicadorResponse[] {
  return publicadores
}

export function allBorradores(): ViajeResponse[] {
  return borradores
}

export function findBorrador(id: number): ViajeResponse | undefined {
  return borradores.find((borrador) => borrador.id === id)
}

export function createBorrador(request: ViajeBorradorRequest): ViajeResponse {
  const created: ViajeResponse = {
    id: nextBorradorId++,
    nombre: request.nombre ?? null,
    ubicacion: request.ubicacion
      ? {
          nombre: request.ubicacion.ciudad,
          localidad: request.ubicacion.localidad,
          ciudad: request.ubicacion.ciudad,
          latitud: request.ubicacion.latitud,
          longitud: request.ubicacion.longitud,
        }
      : null,
    rangoInteresKm: request.rangoInteresKm ?? null,
    fechaInicio: request.fechaInicio ?? null,
    fechaFin: request.fechaFin ?? null,
    ritmo: request.ritmo ?? null,
    interesesCategoria: request.interesesCategoria ?? [],
    diasPlan: request.diasPlan ?? [],
    estado: 'BORRADOR',
    pasoActual: request.pasoActual ?? null,
    usuarioId: 1,
    usuarioEmail: 'turista@test.com',
  }
  borradores.push(created)
  return created
}

export function updateBorrador(id: number, request: ViajeBorradorRequest): ViajeResponse | undefined {
  const borrador = findBorrador(id)
  if (borrador === undefined) return undefined
  if (request.nombre !== undefined) borrador.nombre = request.nombre
  if (request.ubicacion) {
    borrador.ubicacion = {
      nombre: request.ubicacion.ciudad,
      localidad: request.ubicacion.localidad,
      ciudad: request.ubicacion.ciudad,
      latitud: request.ubicacion.latitud,
      longitud: request.ubicacion.longitud,
    }
  }
  if (request.rangoInteresKm !== undefined) borrador.rangoInteresKm = request.rangoInteresKm
  if (request.fechaInicio !== undefined) borrador.fechaInicio = request.fechaInicio
  if (request.fechaFin !== undefined) borrador.fechaFin = request.fechaFin
  if (request.ritmo !== undefined) borrador.ritmo = request.ritmo
  if (request.interesesCategoria) borrador.interesesCategoria = request.interesesCategoria
  if (request.diasPlan !== undefined && request.diasPlan !== null) borrador.diasPlan = request.diasPlan
  if (request.pasoActual !== undefined) borrador.pasoActual = request.pasoActual
  return borrador
}

export function completeBorrador(id: number): ViajeResponse | undefined {
  const borrador = findBorrador(id)
  if (borrador === undefined) return undefined
  borrador.estado = 'PLANIFICADO'
  borrador.pasoActual = 8
  return borrador
}

/** `POST /api/viajes`: el viaje queda persistido antes de pedir el circuito. */
export function createViaje(request: ViajeRequest): ViajeResponse {
  const created = createBorrador({
    nombre: request.nombre,
    ubicacion: request.ubicacion,
    rangoInteresKm: request.rangoInteresKm,
    fechaInicio: request.fechaInicio,
    fechaFin: request.fechaFin,
    ritmo: request.ritmo,
    interesesCategoria: request.intereses,
    pasoActual: 8,
    diasPlan: request.diasPlan ?? [],
  })
  created.estado = 'PLANIFICADO'
  return created
}

export function findCircuito(viajeId: number): GeneracionCircuitoResponse | undefined {
  return circuitos.get(viajeId)
}

export function findCircuitoSeleccionado(
  viajeId: number,
): CircuitoSeleccionadoResponse | undefined {
  return circuitosSeleccionados.get(viajeId)
}

export function findCircuitoItem(
  viajeId: number,
  itemId: number,
): AlternativaItemResponse | undefined {
  const circuito = circuitosSeleccionados.get(viajeId)
  if (circuito === undefined) return undefined
  for (const dia of circuito.dias) {
    const item = dia.items.find((candidate) => candidate.itemId === itemId)
    if (item !== undefined) return item
  }
  return undefined
}

function syncGeneradoFromSeleccionado(viajeId: number): void {
  const seleccionado = circuitosSeleccionados.get(viajeId)
  if (seleccionado !== undefined) {
    circuitos.set(viajeId, buildGeneradoFromSeleccionado(seleccionado))
  }
}

/** VZ-28: pisa los datos de la parada con la propuesta elegida, como el backend. */
export function replaceCircuitoItem(
  viajeId: number,
  itemId: number,
  alternativa: OpcionSustitucionResponse,
): boolean {
  const item = findCircuitoItem(viajeId, itemId)
  if (item === undefined) return false
  item.propuestaId = alternativa.propuestaId
  item.propuestaNombre = alternativa.propuestaNombre
  item.tipo = alternativa.tipo
  item.categoria = alternativa.categoria
  item.ciudad = alternativa.ciudad
  item.localidad = alternativa.localidad
  item.direccion = alternativa.direccion
  item.horaInicio = alternativa.horaInicio
  item.horaFin = alternativa.horaFin
  item.duracionMinutos = alternativa.duracionMinutos
  syncGeneradoFromSeleccionado(viajeId)
  return true
}

/** VZ-29: quita la parada del día y renumera lo que queda, como el backend. */
export function removeCircuitoItem(viajeId: number, itemId: number): boolean {
  const circuito = circuitosSeleccionados.get(viajeId)
  if (circuito === undefined) return false
  for (const dia of circuito.dias) {
    const index = dia.items.findIndex((item) => item.itemId === itemId)
    if (index === -1) continue
    dia.items.splice(index, 1)
    syncGeneradoFromSeleccionado(viajeId)
    return true
  }
  return false
}

function eachIsoDateInclusive(from: string, to: string): string[] {
  if (!from || !to || from > to) return from ? [from] : []
  const dates: string[] = []
  const cursor = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  while (cursor <= end) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

const AUTO_RHYTHM_DAILY_LIMIT: Record<string, number> = {
  TRANQUILO: 2,
  EQUILIBRADO: 4,
  INTENSIVO: 5,
}

export function createCircuito(viajeId: number): GeneracionCircuitoResponse {
  const created = structuredClone(CIRCUITO)
  // Alinea las fechas del snapshot con el viaje: el view-model filtra paradas por día del
  // viaje, y el fixture CIRCUITO usa fechas fijas que no coinciden con isoDate(+N) de los tests.
  const viaje = findBorrador(viajeId)
  const fecha = viaje?.fechaInicio
  const fechaFin = viaje?.fechaFin ?? fecha
  const ritmo = viaje?.ritmo ?? null

  const templates = created.alternativas.flatMap((alt) => alt.propuestas)
  const eventTemplates = templates.filter((item) => item.tipo === 'EVENTO')
  const activityTemplates = templates.filter((item) => item.tipo === 'ACTIVIDAD')
  const activityPool =
    activityTemplates.length > 0
      ? activityTemplates
      : eventTemplates.map((item) => ({ ...item, tipo: 'ACTIVIDAD' as const }))
  const mixedPool = [...eventTemplates, ...activityPool]

  const fillTypedPlan = (
    planDias: Array<{ fecha: string; cantidadEventos: number; cantidadActividades: number }>,
  ) => {
    for (const alternativa of created.alternativas) {
      const propuestas: typeof alternativa.propuestas = []
      let nextItemId =
        alternativa.estrategia === 'CERCANIA' ? 300 : alternativa.estrategia === 'INTERESES' ? 100 : 200
      let nextPropuestaId = 1000 + nextItemId
      let eventCursor = 0
      let activityCursor = 0
      for (const dia of planDias) {
        let orden = 1
        for (let i = 0; i < dia.cantidadEventos; i++) {
          if (eventTemplates.length === 0) break
          const eventTemplate = eventTemplates[eventCursor % eventTemplates.length]
          eventCursor++
          propuestas.push({
            ...structuredClone(eventTemplate),
            itemId: nextItemId++,
            propuestaId: nextPropuestaId++,
            tipo: 'EVENTO',
            fecha: dia.fecha,
            orden: orden++,
            propuestaNombre: `${eventTemplate.propuestaNombre} (${alternativa.estrategia})`,
          })
        }
        for (let i = 0; i < dia.cantidadActividades; i++) {
          if (activityPool.length === 0) break
          const activityTemplate = activityPool[activityCursor % activityPool.length]
          activityCursor++
          propuestas.push({
            ...structuredClone(activityTemplate),
            itemId: nextItemId++,
            propuestaId: nextPropuestaId++,
            tipo: 'ACTIVIDAD',
            fecha: dia.fecha,
            orden: orden++,
            propuestaNombre: `${activityTemplate.propuestaNombre} (${alternativa.estrategia})`,
          })
        }
      }
      alternativa.propuestas = propuestas
    }
  }

  const fillMixedDailyLimit = (dates: string[], dailyLimit: number) => {
    for (const alternativa of created.alternativas) {
      const propuestas: typeof alternativa.propuestas = []
      let nextItemId =
        alternativa.estrategia === 'CERCANIA' ? 300 : alternativa.estrategia === 'INTERESES' ? 100 : 200
      let nextPropuestaId = 1000 + nextItemId
      let poolCursor = 0
      for (const diaFecha of dates) {
        let orden = 1
        for (let i = 0; i < dailyLimit; i++) {
          if (mixedPool.length === 0) break
          const template = mixedPool[poolCursor % mixedPool.length]
          poolCursor++
          propuestas.push({
            ...structuredClone(template),
            itemId: nextItemId++,
            propuestaId: nextPropuestaId++,
            tipo: template.tipo,
            fecha: diaFecha,
            orden: orden++,
            propuestaNombre: `${template.propuestaNombre} (${alternativa.estrategia})`,
          })
        }
      }
      alternativa.propuestas = propuestas
    }
  }

  if (ritmo === 'MANUAL' && viaje && viaje.diasPlan.length > 0) {
    fillTypedPlan(viaje.diasPlan)
  } else if (ritmo && AUTO_RHYTHM_DAILY_LIMIT[ritmo] && fecha && fechaFin) {
    fillMixedDailyLimit(eachIsoDateInclusive(fecha, fechaFin), AUTO_RHYTHM_DAILY_LIMIT[ritmo])
  } else if (fecha) {
    for (const alternativa of created.alternativas) {
      for (const item of alternativa.propuestas) {
        item.fecha = fecha
      }
    }
  }
  circuitos.set(viajeId, created)
  return created
}

/** Antes de confirmar: parada de una alternativa todavía sin elegir. */
function findAlternativaGeneradaItem(
  viajeId: number,
  estrategia: string,
  itemId: number,
) {
  const circuito = circuitos.get(viajeId)
  const alternativa = circuito?.alternativas.find((alt) => alt.estrategia === estrategia)
  const item = alternativa?.propuestas.find((candidate) => candidate.itemId === itemId)
  if (circuito === undefined || alternativa === undefined || item === undefined) return undefined
  return { circuito, alternativa, item }
}

export function hasAlternativaGeneradaItem(
  viajeId: number,
  estrategia: string,
  itemId: number,
): boolean {
  return findAlternativaGeneradaItem(viajeId, estrategia, itemId) !== undefined
}

/** Como el backend: quita la parada, renumera el día y devuelve todas las alternativas. */
export function removeAlternativaGeneradaItem(
  viajeId: number,
  estrategia: string,
  itemId: number,
): GeneracionCircuitoResponse | undefined {
  const found = findAlternativaGeneradaItem(viajeId, estrategia, itemId)
  if (found === undefined) return undefined
  const { circuito, alternativa, item } = found
  alternativa.propuestas = alternativa.propuestas.filter((candidate) => candidate !== item)
  alternativa.propuestas
    .filter((candidate) => candidate.fecha === item.fecha)
    .forEach((candidate, index) => {
      candidate.orden = index + 1
    })
  return circuito
}

export function replaceAlternativaGeneradaItem(
  viajeId: number,
  estrategia: string,
  itemId: number,
  reemplazo: OpcionSustitucionResponse,
): GeneracionCircuitoResponse | undefined {
  const found = findAlternativaGeneradaItem(viajeId, estrategia, itemId)
  if (found === undefined) return undefined
  const { circuito, item } = found
  item.propuestaId = reemplazo.propuestaId
  item.propuestaNombre = reemplazo.propuestaNombre
  item.tipo = reemplazo.tipo
  item.categoria = reemplazo.categoria
  item.ciudad = reemplazo.ciudad
  item.localidad = reemplazo.localidad
  item.direccion = reemplazo.direccion
  item.horaInicio = reemplazo.horaInicio
  item.horaFin = reemplazo.horaFin
  item.duracionMinutos = reemplazo.duracionMinutos
  return circuito
}

/** Mismos topes que `dayMinimum` del backend. */
const MINIMO_POR_RITMO: Record<string, number> = {
  TRANQUILO: 2,
  EQUILIBRADO: 4,
  INTENSIVO: 5,
  MANUAL: 0,
}

function fechasEntre(desde: string, hasta: string): string[] {
  const fechas: string[] = []
  const cursor = new Date(`${desde}T00:00:00Z`)
  const fin = new Date(`${hasta}T00:00:00Z`)
  while (cursor <= fin) {
    fechas.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return fechas
}

/** Como `alternativeDaySummaries`: cuenta en vivo las paradas de cada día de la alternativa. */
export function diasAlternativaGenerada(
  viajeId: number,
  estrategia: string,
): ResumenDiaAlternativaResponse[] | undefined {
  const viaje = borradores.find((candidate) => candidate.id === viajeId)
  const circuito = circuitos.get(viajeId)
  const alternativa = circuito?.alternativas.find((alt) => alt.estrategia === estrategia)
  if (viaje === undefined || alternativa === undefined) return undefined
  if (!viaje.fechaInicio || !viaje.fechaFin) return []
  const minimo = MINIMO_POR_RITMO[viaje.ritmo ?? 'EQUILIBRADO'] ?? 0
  return fechasEntre(viaje.fechaInicio, viaje.fechaFin).map((fecha) => {
    const items = alternativa.propuestas.filter((item) => item.fecha === fecha)
    const agregadas = items.filter((item) => agregadasAntesDeConfirmar.has(item.itemId)).length
    const pendiente = minimo > 0 && items.length < minimo
    return {
      fecha,
      resumen: {
        asignadas: items.length - agregadas,
        minimo,
        agregadasPorUsuario: agregadas,
        avisoDescartado: false,
        mensaje: pendiente
          ? `Se asignaron ${items.length} de ${minimo} paradas pedidas para este día. La generación no rellena sola: podés completar con sugerencias.`
          : null,
        pendiente,
        puedeCompletar: pendiente,
      },
    }
  })
}

export function sugerenciasDiaAlternativa(
  viajeId: number,
  estrategia: string,
  fecha: string,
): SugerenciasDiaResponse | undefined {
  const dia = diasAlternativaGenerada(viajeId, estrategia)?.find((d) => d.fecha === fecha)
  if (dia === undefined) return undefined
  const alternativa = circuitos
    .get(viajeId)
    ?.alternativas.find((alt) => alt.estrategia === estrategia)
  const usadas = new Set(alternativa?.propuestas.map((item) => item.propuestaId) ?? [])
  const sugerencias =
    !dia.resumen.pendiente || sugerenciasVacias
      ? []
      : SUGERENCIAS_DIA.sugerencias.filter((s) => !usadas.has(s.propuestaId))
  return {
    sugerencias,
    mensaje: sugerencias.length === 0 ? 'No encontramos propuestas para completar este día' : null,
  }
}

export function addSuggestedAlternativaItem(
  viajeId: number,
  estrategia: string,
  fecha: string,
  propuestaId: number,
): GeneracionCircuitoResponse | 'not-found' | 'invalid' {
  const circuito = circuitos.get(viajeId)
  const alternativa = circuito?.alternativas.find((alt) => alt.estrategia === estrategia)
  const disponibles = sugerenciasDiaAlternativa(viajeId, estrategia, fecha)
  if (circuito === undefined || alternativa === undefined || disponibles === undefined) {
    return 'not-found'
  }
  const sugerencia = disponibles.sugerencias.find((s) => s.propuestaId === propuestaId)
  if (sugerencia === undefined) return 'invalid'
  const itemId = nextCircuitoItemId++
  alternativa.propuestas.push({
    itemId,
    propuestaId: sugerencia.propuestaId,
    propuestaNombre: sugerencia.nombre,
    descripcion: sugerencia.descripcion,
    categoria: sugerencia.categoria,
    tipo: sugerencia.tipo,
    fecha,
    orden: 0,
    horaInicio: sugerencia.horaInicio,
    horaFin: sugerencia.horaFin,
    trasladoKm: sugerencia.trasladoKm,
    trasladoMinutos: sugerencia.trasladoMinutos,
    disponible: true,
    motivoNoDisponible: null,
    imagenes: sugerencia.imagenes,
    ciudad: sugerencia.ciudad,
    localidad: sugerencia.localidad,
    direccion: sugerencia.direccion,
    lugarRecinto: sugerencia.lugarRecinto,
    latitud: sugerencia.latitud,
    longitud: sugerencia.longitud,
    tipoAcceso: sugerencia.tipoAcceso,
    montoEstimado: sugerencia.montoEstimado,
    descripcionArancel: sugerencia.descripcionArancel,
    sitioOficial: sugerencia.sitioOficial,
    duracionMinutos: sugerencia.duracionMinutos,
  })
  agregadasAntesDeConfirmar.add(itemId)
  alternativa.propuestas
    .filter((item) => item.fecha === fecha)
    .sort((a, b) => (a.horaInicio ?? '').localeCompare(b.horaInicio ?? ''))
    .forEach((item, index) => {
      item.orden = index + 1
    })
  return circuito
}

export function selectCircuito(
  viajeId: number,
  estrategia: CircuitStrategy,
): GeneracionCircuitoResponse | undefined {
  const circuito = circuitos.get(viajeId)
  if (circuito === undefined || circuito.estrategiaSeleccionada !== null) return undefined
  if (!circuito.alternativas.some((alternativa) => alternativa.estrategia === estrategia)) {
    return undefined
  }
  circuito.estrategiaSeleccionada = estrategia
  return circuito
}

export function deleteBorrador(id: number): boolean {
  const index = borradores.findIndex((borrador) => borrador.id === id)
  if (index === -1) return false
  borradores.splice(index, 1)
  return true
}

export function findEvento(id: number): EventoResponse | undefined {
  return eventos.find((evento) => evento.id === id)
}

export function findPublicador(id: number): PublicadorResponse | undefined {
  return publicadores.find((publicador) => publicador.id === id)
}

export function findPublicadorByEmail(email: string): PublicadorResponse | undefined {
  return publicadores.find((publicador) => publicador.email === email)
}

export function createPublicador(request: PublicadorRequest): PublicadorResponse {
  const created: PublicadorResponse = {
    id: nextPublicadorId++,
    nombre: request.nombre,
    email: request.email,
    telefono: request.telefono,
  }
  publicadores.push(created)
  return created
}

/**
 * Aplica el `EventoRequest` sobre un evento, replicando la regla del mapper del backend:
 * un `imagenes` en `null` **conserva** las imágenes y una lista vacía las borra.
 *
 * Esa regla es la que hace que el test de edición sirva de algo: si el handler no la respeta, un
 * PUT con `imagenes: []` dejaría las imágenes viejas y el test pasaría sin detectar el bug.
 */
/**
 * Mueve solo fechas preservando duración (espejo de `PATCH .../reprogramar`).
 * También crea notificaciones mock para el turista demo.
 */
export function reprogramarEvento(
  id: number,
  fechaInicio: string,
): EventoResponse | undefined {
  const evento = findEvento(id)
  if (evento === undefined) return undefined

  const fechaAnterior = evento.fechaInicio
  const [ys, ms, ds] = evento.fechaInicio.split('-').map(Number)
  const [ye, me, de] = evento.fechaFin.split('-').map(Number)
  const offsetDays = Math.round(
    (new Date(ye, me - 1, de).getTime() - new Date(ys, ms - 1, ds).getTime()) /
      (24 * 60 * 60 * 1000),
  )
  const [y, m, d] = fechaInicio.split('-').map(Number)
  const fin = new Date(y, m - 1, d + offsetDays)
  const fechaFin = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`

  const actualizado: EventoResponse = {
    ...evento,
    fechaInicio,
    fechaFin,
  }
  eventos[eventos.indexOf(evento)] = actualizado

  const destinatarios = countInscriptosMock(id)
  if (destinatarios > 0) {
    const titulo = `Evento reprogramado: ${evento.nombre}`
    const cuerpo = `El evento «${evento.nombre}» fue reprogramado del ${formatFechaEs(fechaAnterior)} al ${formatFechaEs(fechaInicio)}.`
    for (let i = 0; i < destinatarios; i += 1) {
      notificaciones.unshift({
        id: nextNotificacionId++,
        usuarioId: MOCK_TURISTA_ID,
        titulo,
        cuerpo,
        leida: false,
        creadaEn: new Date().toISOString(),
        propuestaId: id,
        tipo: 'EVENTO_REPROGRAMADO',
      })
    }
  }

  return actualizado
}

export function countInscriptosMock(_propuestaId: number): number {
  return MOCK_INSCRIPTOS_POR_PROPUESTA
}

export function previewReprogramacion(
  id: number,
  fechaInicio: string,
): { destinatarios: number; titulo: string; cuerpo: string } | undefined {
  const evento = findEvento(id)
  if (evento === undefined) return undefined
  const destinatarios = countInscriptosMock(id)
  return {
    destinatarios,
    titulo: `Evento reprogramado: ${evento.nombre}`,
    cuerpo: `El evento «${evento.nombre}» fue reprogramado del ${formatFechaEs(evento.fechaInicio)} al ${formatFechaEs(fechaInicio)}.`,
  }
}

export function allNotificaciones(usuarioId: number): NotificacionResponse[] {
  return notificaciones
    .filter((n) => n.usuarioId === usuarioId)
    .map(({ usuarioId: _u, ...rest }) => rest)
}

export function marcarNotificacionLeida(
  id: number,
  usuarioId: number,
): NotificacionResponse | undefined {
  const n = notificaciones.find((item) => item.id === id && item.usuarioId === usuarioId)
  if (!n) return undefined
  n.leida = true
  const { usuarioId: _u, ...rest } = n
  return rest
}

function formatFechaEs(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d}/${m}/${y}`
}

export function updateEvento(id: number, request: EventoRequest): EventoResponse | undefined {
  const evento = findEvento(id)
  if (evento === undefined) return undefined

  const esDePago = request.tipoAcceso === 'DE_PAGO'
  const publicadorId = request.publicadorId ?? evento.publicadorId
  const actualizado: EventoResponse = {
    ...evento,
    nombre: request.nombre,
    descripcion: request.descripcion,
    categoria: request.categoria,
    tipoPropuesta: request.tipoPropuesta,
    modalidad: request.modalidad,
    tipoAcceso: request.tipoAcceso ?? evento.tipoAcceso,
    // El backend calcula las coordenadas al guardar: un mock no las geocodifica y las conserva
    // como están. El arancel solo tiene sentido para un evento arancelado.
    montoEstimado: esDePago ? request.montoEstimado : null,
    descripcionArancel: esDePago ? request.descripcionArancel : null,
    sitioOficial: esDePago ? request.sitioOficial : null,
    lugarRecinto: request.lugarRecinto,
    localidad: request.localidad,
    direccion: request.direccion,
    fechaInicio: request.fechaInicio,
    fechaFin: request.fechaFin,
    horarioInicio: request.horarioInicio,
    horarioFin: request.horarioFin,
    imagenes: request.imagenes === null ? evento.imagenes : [...request.imagenes],
    publicadorId,
    publicadorNombre: findPublicador(publicadorId)?.nombre ?? '',
  }

  eventos[eventos.indexOf(evento)] = actualizado
  return actualizado
}

export function createEvento(request: EventoRequest): EventoResponse {
  const esDePago = request.tipoAcceso === 'DE_PAGO'
  const publicadorId = request.publicadorId ?? 1
  const created: EventoResponse = {
    id: nextEventoId++,
    nombre: request.nombre,
    descripcion: request.descripcion,
    categoria: request.categoria,
    tipoPropuesta: request.tipoPropuesta,
    modalidad: request.modalidad,
    tipoAcceso: request.tipoAcceso ?? 'GRATUITO',
    // Igual que el backend real: el estado es una regla de negocio, no algo que manda el usuario.
    estadoPropuesta: 'INICIADO',
    montoEstimado: esDePago ? request.montoEstimado : null,
    descripcionArancel: esDePago ? request.descripcionArancel : null,
    sitioOficial: esDePago ? request.sitioOficial : null,
    lugarRecinto: request.lugarRecinto,
    localidad: request.localidad,
    direccion: request.direccion,
    // El mock no geocodifica: las coordenadas las pone el servidor con Nominatim.
    latitud: null,
    longitud: null,
    fechaInicio: request.fechaInicio,
    fechaFin: request.fechaFin,
    horarioInicio: request.horarioInicio,
    horarioFin: request.horarioFin,
    imagenes: request.imagenes ?? [],
    publicadorId,
    publicadorNombre: findPublicador(publicadorId)?.nombre ?? '',
  }
  eventos.push(created)
  return created
}

export function deleteEvento(id: number): boolean {
  const evento = findEvento(id)
  if (evento === undefined) return false

  eventos.splice(eventos.indexOf(evento), 1)
  return true
}

// Los handlers se arman en el import del módulo, así que el store tiene que estar poblado antes de
// que se use el primer request.
resetStore()
