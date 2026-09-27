import type { EventoResponse, Page, PublicadorResponse } from '@/types/api'

/**
 * Datos de prueba.
 *
 * Copian el contenido del seed (`data.sql` del backend) pero con **fechas fijas**, no relativas a
 * `CURRENT_DATE` como el seed: los tests tienen que dar el mismo resultado hoy, en un mes y en un
 * año. Es la diferencia entre una suite que se puede confiar y una que se rompe sola.
 */

export const TURISMO: PublicadorResponse = {
  id: 1,
  nombre: 'Turismo Córdoba',
  email: 'info@cordoba.gob.ar',
  telefono: '0351-1234567',
}

export const COSQUIN: PublicadorResponse = {
  id: 2,
  nombre: 'Municipalidad de Cosquín',
  email: 'cosquin@cordoba.gob.ar',
  telefono: '0351-4601002',
}

export const ARTESANOS: PublicadorResponse = {
  id: 3,
  nombre: 'Asociación de Artesanos',
  email: 'artesanos@cordoba.gob.ar',
  telefono: null,
}

export const FOLKLORE: EventoResponse = {
  id: 1,
  nombre: 'Festival de Folklore',
  descripcion: 'Encuentro de syrigamis y danzas tradicionales.',
  categoria: 'CULTURA',
  localidad: 'Cosquín',
  direccion: 'Plaza Pringles',
  fechaInicio: '2026-10-01',
  fechaFin: '2026-10-04',
  horarioInicio: '20:00:00',
  horarioFin: '23:30:00',
  imagenes: ['https://cdn.cordoba.gob.ar/folklore-cosquin.jpg'],
  publicadorId: 1,
  publicadorNombre: 'Turismo Córdoba',
}

export const ARTESANIAS: EventoResponse = {
  id: 2,
  nombre: 'Exposición de artesanías',
  descripcion: 'Muestra de cerámica y tejido de la región.',
  categoria: 'CULTURA',
  localidad: 'Alta Gracia',
  direccion: 'Museo Jesús L. Werribar',
  fechaInicio: '2026-10-03',
  fechaFin: '2026-10-06',
  // Jackson 3 manda `LocalTime` siempre con segundos: el seed tiene '10:00' y la API responde
  // "10:00:00". El fixture copia lo que llega de verdad, no lo que se escribe en `data.sql`.
  horarioInicio: '10:00:00',
  horarioFin: '18:00:00',
  imagenes: [],
  publicadorId: 3,
  publicadorNombre: 'Asociación de Artesanos',
}

export const GASTRONOMIA_ESTANCIA: EventoResponse = {
  id: 3,
  nombre: 'Gastronomía de la estancia',
  descripcion: null,
  categoria: 'GASTRONOMIA',
  localidad: 'Alta Gracia',
  direccion: null,
  fechaInicio: '2026-10-05',
  fechaFin: '2026-10-05',
  horarioInicio: '12:30:00',
  // Solo hora de inicio: el backend no obliga a informar la de fin.
  horarioFin: null,
  imagenes: [],
  publicadorId: 1,
  publicadorNombre: 'Turismo Córdoba',
}

export const SIN_CATEGORIA: EventoResponse = {
  id: 4,
  nombre: 'Encuentro de la comunidad',
  descripcion: null,
  // El campo es nullable en el backend: la tarjeta tiene que tolerarlo y no mostrar badge.
  categoria: null,
  localidad: null,
  direccion: null,
  fechaInicio: '2026-10-07',
  fechaFin: '2026-10-07',
  horarioInicio: null,
  horarioFin: null,
  imagenes: [],
  publicadorId: 1,
  publicadorNombre: 'Turismo Córdoba',
}

export const PUBLICADORES: PublicadorResponse[] = [ARTESANOS, COSQUIN, TURISMO]

export const EVENTOS: EventoResponse[] = [
  FOLKLORE,
  ARTESANIAS,
  GASTRONOMIA_ESTANCIA,
  SIN_CATEGORIA,
]

/**
 * Envuelve contenido en la `Page` de Spring Data.
 *
 * Reproduce la forma real, con los metadatos **anidados bajo `page`**, y no la del `Page` clásico.
 * Si el mock usara `{ content, totalElements }` la app andaría en el test y fallaría contra la API
 * real: el error saldría recién en producción.
 */
export function page<T>(
  content: T[],
  { number = 0, size = 12, totalElements }: Partial<Page<T>['page']> = {},
): Page<T> {
  return {
    content,
    page: {
      size,
      number,
      totalElements: totalElements ?? content.length,
      totalPages: Math.max(1, Math.ceil((totalElements ?? content.length) / size)),
    },
  }
}

/** Cuerpo de error con la forma de `ErrorResponse` (claves en inglés, valores en español). */
export function errorBody(status: number, message: string) {
  return {
    status,
    error: status === 404 ? 'Not Found' : 'Internal Server Error',
    message,
    timestamp: '2026-10-01T12:00:00',
  }
}
