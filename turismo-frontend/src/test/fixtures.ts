import type {
  EventoResponse,
  GeneracionCircuitoResponse,
  Page,
  PublicadorResponse,
  ViajeResponse,
} from '@/types/api'

/**
 * Datos de prueba.
 *
 * Copian el contenido del seed (`data.sql` del backend) pero con **fechas fijas**, no relativas a
 * `CURRENT_DATE` como el seed: los tests tienen que dar el mismo resultado hoy, en un mes y en un
 * año. Es la diferencia entre una suite que se puede confiar y una que se rompe sola.
 *
 * Los eventos son representativos de Córdoba: Festival de Doma y Folklore de Jesús María,
 * Semana Gastronómica de las Sierras Chicas, Circuito Peatonal Histórico, etc.
 * Las imágenes son URLs reales de Wikimedia Commons y sitios oficiales de turismo.
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
  nombre: 'Festival de Doma y Folklore de Jesús María',
  descripcion:
    'La mayor fiesta de la tradición gaucha y música folklórica en el norte cordobés, con destacados artistas nacionales y destrezas criollas.',
  categoria: 'CULTURA',
  tipoPropuesta: 'FESTIVAL',
  modalidad: 'ECUESTRE',
  tipoAcceso: 'GRATUITO',
  estadoPropuesta: 'INICIADO',
  montoEstimado: null,
  descripcionArancel: null,
  sitioOficial: null,
  lugarRecinto: 'Anfiteatro José Hernández',
  localidad: 'Jesús María',
  direccion: 'Av. San Martín 100',
  // Las coordenadas son aproximadas, como las que devuelve Nominatim: el mapa las usa para
  // centrarse. El detalle lo testea con el componente de mapa mockeado para no arrastrar Leaflet
  // a jsdom.
  latitud: -30.9816,
  longitud: -64.0959,
  fechaInicio: '2026-10-01',
  fechaFin: '2026-10-04',
  horarioInicio: '20:00:00',
  horarioFin: '23:30:00',
  imagenes: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Festival_de_Doma_y_Folklore_de_Jes%C3%BAs_Mar%C3%ADa.jpg/1200px-Festival_de_Doma_y_Folklore_de_Jes%C3%BAs_Mar%C3%ADa.jpg'],
  publicadorId: 1,
  publicadorNombre: 'Turismo Córdoba',
}

export const ARTESANIAS: EventoResponse = {
  id: 2,
  nombre: 'Semana Gastronómica de las Sierras Chicas',
  descripcion:
    'Sabores típicos, cocina criolla y cata de vinos regionales en el corazón de las Sierras Chicas.',
  categoria: 'GASTRONOMIA',
  tipoPropuesta: 'FERIA',
  modalidad: 'PEDESTRE',
  tipoAcceso: 'GRATUITO',
  estadoPropuesta: 'INICIADO',
  montoEstimado: null,
  descripcionArancel: null,
  sitioOficial: null,
  lugarRecinto: 'Plaza Central',
  localidad: 'Río Ceballos',
  direccion: 'Plaza Central',
  latitud: -31.1651,
  longitud: -64.3195,
  fechaInicio: '2026-10-03',
  fechaFin: '2026-10-06',
  // Jackson 3 manda `LocalTime` siempre con segundos: el seed tiene '10:00' y la API responde
  // "10:00:00". El fixture copia lo que llega de verdad, no lo que se escribe en `data.sql`.
  horarioInicio: '10:00:00',
  horarioFin: '18:00:00',
  imagenes: ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Semana_Gastronomica_Sierras_Chicas.jpg/1200px-Semana_Gastronomica_Sierras_Chicas.jpg'],
  publicadorId: 3,
  publicadorNombre: 'Asociación de Artesanos',
}

export const GASTRONOMIA_ESTANCIA: EventoResponse = {
  id: 3,
  nombre: 'Circuito Peatonal Histórico Córdoba Jesuítica',
  descripcion:
    'Recorrido patrimonial guiado por templos, claustros y museos fundacionales de la Manzana Jesuítica.',
  categoria: 'CULTURA',
  tipoPropuesta: 'VISITA_GUIADA',
  modalidad: 'PEDESTRE',
  // Arancelado a propósito: es el único fixture que ejercita el bloque de arancel del detalle.
  tipoAcceso: 'DE_PAGO',
  estadoPropuesta: 'INICIADO',
  montoEstimado: 1500,
  descripcionArancel: 'Entrada general. Menores de 12 años sin cargo.',
  sitioOficial: 'https://entradas.cordoba.gob.ar/circuito-peatonal',
  lugarRecinto: 'Manzana Jesuítica',
  localidad: 'Córdoba Capital',
  direccion: 'Av. Vélez Sarsfield 264',
  latitud: -31.4173,
  longitud: -64.1835,
  fechaInicio: '2026-10-05',
  fechaFin: '2026-10-05',
  horarioInicio: '12:30:00',
  // Solo hora de inicio: el backend no obliga a informar la de fin.
  horarioFin: null,
  imagenes: ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Manzana_Jesuitica_Cordoba.jpg/1200px-Manzana_Jesuitica_Cordoba.jpg'],
  publicadorId: 1,
  publicadorNombre: 'Turismo Córdoba',
}

export const SIN_CATEGORIA: EventoResponse = {
  id: 4,
  nombre: 'Encuentro de la comunidad',
  descripcion: null,
  // El campo es nullable en el backend: la tarjeta tiene que tolerarlo y no mostrar badge.
  categoria: null,
  tipoAcceso: 'GRATUITO',
  estadoPropuesta: 'INICIADO',
  montoEstimado: null,
  descripcionArancel: null,
  sitioOficial: null,
  // Sin coordenadas a propósito: el detalle de este evento no puede mostrar el mapa.
  lugarRecinto: 'Salón comunitario',
  localidad: null,
  direccion: null,
  latitud: null,
  longitud: null,
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

/**
 * Respuesta de ejemplo de `GET /nominatim/search`, con la forma real de Nominatim: `lat`/`lon`
 * como **string** y `addressdetails` anidado. Es lo que consume el buscador de ubicación del
 * formulario.
 */
export const NOMINATIM_SEARCH = [
  {
    lat: '-30.9816',
    lon: '-64.0959',
    display_name:
      'Anfiteatro José Hernández, Cleto Peña 82, Jesús María, Córdoba, Argentina',
    name: 'Anfiteatro José Hernández',
    address: { road: 'Cleto Peña', city: 'Jesús María', state: 'Córdoba' },
  },
  {
    lat: '-31.4167',
    lon: '-64.1833',
    display_name: 'Manzana Jesuítica, Av. Vélez Sarsfield 264, Córdoba, Argentina',
    name: 'Manzana Jesuítica',
    address: { road: 'Avenida Vélez Sarsfield', city: 'Córdoba', state: 'Córdoba' },
  },
]

/** Respuesta de ejemplo de `GET /nominatim/reverse`. */
export const NOMINATIM_REVERSE = {
  display_name: 'Anfiteatro José Hernández, Cleto Peña 82, Jesús María, Córdoba, Argentina',
  address: { road: 'Cleto Peña', city: 'Jesús María', state: 'Córdoba' },
}

export const BORRADORES: ViajeResponse[] = [
  {
    id: 1,
    nombre: 'Borrador de ejemplo',
    ubicacion: {
      nombre: 'Córdoba',
      localidad: 'Centro',
      ciudad: 'Córdoba',
      latitud: -31.42,
      longitud: -64.18,
    },
    rangoInteresKm: 20,
    fechaInicio: '2026-11-01',
    fechaFin: '2026-11-03',
    ritmo: 'EQUILIBRADO',
    interesesCategoria: ['NATURALEZA'],
    estado: 'BORRADOR',
    pasoActual: 4,
    usuario: 'turista_demo',
  },
]

/**
 * Respuesta de `POST /api/viajes/{id}/circuito`. Las tres alternativas son fijas y comparten
 * fechas para que el test pueda recorrer los tabs sin depender del reloj. Los ítems traen el
 * snapshot (`descripcion`/`categoria`) que devuelve el backend real.
 */
export const CIRCUITO: GeneracionCircuitoResponse = {
  generadoEn: '2026-10-20T12:00:00',
  estrategiaSeleccionada: null,
  distanciasEstimadas: false,
  advertencia: null,
  alternativas: [
    {
      estrategia: 'CERCANIA',
      distanciaTotalKm: 8.4,
      afinidadIntereses: 0.5,
      categoriasCubiertas: ['CULTURA', 'GASTRONOMIA'],
      advertencia: null,
      propuestas: [
        {
          propuestaId: 3,
          propuestaNombre: 'Circuito Peatonal Histórico Córdoba Jesuítica',
          descripcion: 'Recorrido patrimonial guiado por templos y museos fundacionales.',
          categoria: 'CULTURA',
          tipo: 'EVENTO',
          fecha: '2026-11-01',
          orden: 1,
          horaInicio: '09:00:00',
          horaFin: '11:00:00',
          trasladoKm: 0,
          trasladoMinutos: 0,
          disponible: true,
          motivoNoDisponible: null,
        },
        {
          propuestaId: 2,
          propuestaNombre: 'Semana Gastronómica de las Sierras Chicas',
          descripcion: 'Sabores típicos y cocina criolla en el corazón de las Sierras Chicas.',
          categoria: 'GASTRONOMIA',
          tipo: 'EVENTO',
          fecha: '2026-11-01',
          orden: 2,
          horaInicio: '12:30:00',
          horaFin: '14:30:00',
          trasladoKm: 3.2,
          trasladoMinutos: 18,
          disponible: true,
          motivoNoDisponible: null,
        },
      ],
    },
    {
      estrategia: 'INTERESES',
      distanciaTotalKm: 12.7,
      afinidadIntereses: 0.87,
      categoriasCubiertas: ['CULTURA', 'MUSICA'],
      advertencia: null,
      propuestas: [
        {
          propuestaId: 1,
          propuestaNombre: 'Festival de Doma y Folklore de Jesús María',
          descripcion: 'La mayor fiesta de la tradición gaucha y música folklórica.',
          categoria: 'MUSICA',
          tipo: 'EVENTO',
          fecha: '2026-11-01',
          orden: 1,
          horaInicio: '20:00:00',
          horaFin: '23:30:00',
          trasladoKm: 0,
          trasladoMinutos: 0,
          disponible: true,
          motivoNoDisponible: null,
        },
      ],
    },
    {
      estrategia: 'DESCUBRIMIENTO',
      distanciaTotalKm: 21.3,
      afinidadIntereses: 0.25,
      categoriasCubiertas: ['NATURALEZA', 'HISTORIA'],
      advertencia: 'Hay pocas propuestas compatibles; el itinerario puede quedar corto.',
      propuestas: [
        {
          propuestaId: 3,
          propuestaNombre: 'Circuito Peatonal Histórico Córdoba Jesuítica',
          descripcion: 'Recorrido patrimonial guiado por templos y museos fundacionales.',
          categoria: 'HISTORIA',
          tipo: 'EVENTO',
          fecha: '2026-11-01',
          orden: 1,
          horaInicio: '17:00:00',
          horaFin: '19:00:00',
          trasladoKm: 0,
          trasladoMinutos: 0,
          disponible: false,
          motivoNoDisponible: 'la fecha de la propuesta ya pasó',
        },
      ],
    },
  ],
}
