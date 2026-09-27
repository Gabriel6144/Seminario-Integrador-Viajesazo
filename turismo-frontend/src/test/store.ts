import { EVENTOS, PUBLICADORES } from './fixtures'
import type { EventoRequest, EventoResponse, PublicadorRequest, PublicadorResponse } from '@/types/api'

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
let nextEventoId = 0
let nextPublicadorId = 0

export function resetStore(): void {
  eventos = structuredClone(EVENTOS)
  publicadores = structuredClone(PUBLICADORES)
  // Los fixtures ya traen ids 1..3 y 1..7, así que los siguientes arrancan por arriba.
  nextEventoId = Math.max(0, ...EVENTOS.map((evento) => evento.id)) + 1
  nextPublicadorId = Math.max(0, ...PUBLICADORES.map((publicador) => publicador.id)) + 1
}

export function allEventos(): EventoResponse[] {
  return eventos
}

export function allPublicadores(): PublicadorResponse[] {
  return publicadores
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

  const actualizado: EventoResponse = {
    ...evento,
    nombre: request.nombre,
    descripcion: request.descripcion,
    categoria: request.categoria,
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
  const created: EventoResponse = {
    id: nextEventoId++,
    nombre: request.nombre,
    descripcion: request.descripcion,
    categoria: request.categoria,
    localidad: request.localidad,
    direccion: request.direccion,
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
