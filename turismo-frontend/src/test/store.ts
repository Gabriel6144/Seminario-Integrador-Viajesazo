import { BORRADORES, CIRCUITO, EVENTOS, PUBLICADORES } from './fixtures'
import type {
  CircuitStrategy,
  EventoRequest,
  EventoResponse,
  GeneracionCircuitoResponse,
  PublicadorRequest,
  PublicadorResponse,
  ViajeBorradorRequest,
  ViajeRequest,
  ViajeResponse,
} from '@/types/api'

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
let circuitos = new Map<number, GeneracionCircuitoResponse>()
let nextEventoId = 0
let nextPublicadorId = 0
let nextBorradorId = 0

export function resetStore(): void {
  eventos = structuredClone(EVENTOS)
  publicadores = structuredClone(PUBLICADORES)
  borradores = structuredClone(BORRADORES)
  circuitos = new Map()
  // Los fixtures ya traen ids 1..3 y 1..7, así que los siguientes arrancan por arriba.
  nextEventoId = Math.max(0, ...EVENTOS.map((evento) => evento.id)) + 1
  nextPublicadorId = Math.max(0, ...PUBLICADORES.map((publicador) => publicador.id)) + 1
  nextBorradorId = Math.max(0, ...BORRADORES.map((borrador) => borrador.id)) + 1
}

export function allEventos(): EventoResponse[] {
  return eventos
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
    estado: 'BORRADOR',
    pasoActual: request.pasoActual ?? null,
    usuario: request.usuario,
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
    usuario: request.usuario,
  })
  created.estado = 'PLANIFICADO'
  return created
}

export function findCircuito(viajeId: number): GeneracionCircuitoResponse | undefined {
  return circuitos.get(viajeId)
}

export function createCircuito(viajeId: number): GeneracionCircuitoResponse {
  const created = structuredClone(CIRCUITO)
  circuitos.set(viajeId, created)
  return created
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
export function updateEvento(id: number, request: EventoRequest): EventoResponse | undefined {
  const evento = findEvento(id)
  if (evento === undefined) return undefined

  const esDePago = request.tipoAcceso === 'DE_PAGO'
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
    publicadorId: request.publicadorId,
    publicadorNombre: findPublicador(request.publicadorId)?.nombre ?? '',
  }

  eventos[eventos.indexOf(evento)] = actualizado
  return actualizado
}

export function createEvento(request: EventoRequest): EventoResponse {
  const esDePago = request.tipoAcceso === 'DE_PAGO'
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
    publicadorId: request.publicadorId,
    publicadorNombre: findPublicador(request.publicadorId)?.nombre ?? '',
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
