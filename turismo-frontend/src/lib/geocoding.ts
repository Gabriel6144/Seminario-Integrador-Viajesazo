/**
 * Geocoding del **cliente**, solo para ayudar a la UX del formulario (elegir un lugar del mapa).
 *
 * La fuente de verdad de las coordenadas sigue siendo el backend: al guardar, `EventoService`
 * geocodifica `lugarRecinto + direccion + localidad` con Nominatim y persiste `latitud`/`longitud`.
 * Acá no se mandan coordenadas al backend; el buscador solo completa esos tres campos de texto con
 * valores que Nominatim sí resuelve, para reducir los 400 de "no se encontró la ubicación".
 *
 * Las requests van por rutas **relativas** (`/nominatim/...`) a propósito: el proxy de Vite las
 * hace same-origin en desarrollo (mismo criterio que `/api`), evita CORS y deja que MSW las
 * intercepte por URL relativa en los tests. En producción hace falta un proxy inverso delante.
 *
 * Tolerante a fallos: un error de red o una respuesta no-2xx devuelven `[]`/`null`, igual que
 * `GeocodingService` del backend. La red no debe romper el formulario.
 */

/** Un resultado del buscador, ya normalizado a los campos que usa el formulario. */
export interface LugarEncontrado {
  /** Nombre corto para mostrar en la lista de resultados. */
  nombre: string
  /** Valor para el campo `lugarRecinto`. */
  lugarRecinto: string
  /** Valor para el campo `localidad`. Puede ser `""` si Nominatim no la informa. */
  localidad: string
  /**
   * Valor para el campo `direccion`: la calle (a nivel vía), no el `display_name`. El backend
   * vuelve a concatenar los tres campos y un `display_name` entero ahí rompe la búsqueda.
   */
  direccion: string
  lat: number
  lng: number
}

/** Resultado del geocoding inverso: lo que se puede pisar en el formulario al mover el pin. */
export interface UbicacionInversa {
  localidad: string
  direccion: string
}

/**
 * Destino del planificador: una zona de interés, no un hospedaje. Se separa de `LugarEncontrado`
 * porque la API de viajes pide `ciudad` + `localidad` (sin `direccion`) y el mapa necesita un
 * nombre corto para el marcador.
 */
export interface DestinoGeocodificado {
  nombre: string
  ciudad: string
  localidad: string | null
  lat: number
  lng: number
}

interface NominatimAddress {
  city?: string
  town?: string
  village?: string
  hamlet?: string
  municipality?: string
  county?: string
  road?: string
  suburb?: string
  neighbourhood?: string
  city_district?: string
}

interface NominatimSearchItem {
  lat: string
  lon: string
  display_name: string
  name?: string
  amenity?: string
  tourism?: string
  road?: string
  address?: NominatimAddress
}

interface NominatimReverseItem {
  name?: string
  display_name?: string
  address?: NominatimAddress
}

/**
 * Encuadre aproximado de la provincia de Córdoba (`left,top,right,bottom`). Con `bounded=1`
 * Nominatim no devuelve lugares fuera de la provincia, que es el dominio de la tesis.
 */
const CORDOBA_VIEWBOX = '-65.8,-29.5,-61.8,-35.1'

const MAX_TEXTO = 150

function recortar(texto: string): string {
  return texto.trim().slice(0, MAX_TEXTO)
}

function ciudadDe(address?: NominatimAddress): string {
  return (
    address?.city ??
    address?.town ??
    address?.village ??
    address?.hamlet ??
    address?.municipality ??
    address?.county ??
    ''
  )
}

function localidadDe(address?: NominatimAddress): string {
  return ciudadDe(address)
}

function zonaDe(address?: NominatimAddress): string {
  return (
    address?.suburb ??
    address?.neighbourhood ??
    address?.city_district ??
    address?.county ??
    ''
  )
}

function nombreDelLugar(item: NominatimSearchItem): string {
  const candidatos = [item.name, item.amenity, item.tourism, item.road]
  for (const candidato of candidatos) {
    const limpio = candidato?.trim()
    if (limpio !== undefined && limpio.length > 0) return limpio
  }
  return item.display_name.split(',')[0]?.trim() ?? ''
}

/**
 * Arma el valor de `direccion` a nivel calle: la vía de Nominatim, sin el número (con número, la
 * búsqueda free-form de un POI devuelve vacío). Si no hay vía, cae al barrio y, si tampoco, a la
 * localidad, para no mandar nunca el `display_name` entero ni un `direccion` vacío.
 */
function direccionDe(address: NominatimAddress | undefined, fallback: string): string {
  const candidatos = [
    address?.road,
    address?.suburb,
    address?.neighbourhood,
    address?.city_district,
  ]
  for (const candidato of candidatos) {
    const limpio = candidato?.trim()
    if (limpio !== undefined && limpio.length > 0) return limpio
  }
  return fallback.trim()
}

async function buscarEnNominatim(
  texto: string,
  signal?: AbortSignal,
): Promise<NominatimSearchItem[]> {
  try {
    const params = new URLSearchParams({
      q: texto,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'ar',
      'accept-language': 'es',
      viewbox: CORDOBA_VIEWBOX,
      bounded: '1',
    })

    const response = await fetch(`/nominatim/search?${params.toString()}`, { signal })
    if (!response.ok) return []

    return (await response.json()) as NominatimSearchItem[]
  } catch {
    return []
  }
}

function nombreDesdeDisplayName(displayName: string | undefined): string {
  return displayName?.split(',')[0]?.trim() ?? ''
}

/**
 * Busca lugares por texto en Córdoba. Devuelve `[]` ante cualquier fallo, incluida la cancelación.
 */
export async function buscarLugar(
  query: string,
  signal?: AbortSignal,
): Promise<LugarEncontrado[]> {
  const texto = query.trim()
  if (texto.length === 0) return []

  const data = await buscarEnNominatim(texto, signal)

  return data.flatMap((item) => {
    const lat = Number(item.lat)
    const lng = Number(item.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []

    const localidad = localidadDe(item.address)
    const nombre = nombreDelLugar(item)

    return [
      {
        nombre,
        lugarRecinto: nombre,
        localidad,
        direccion: direccionDe(item.address, localidad || nombre),
        lat,
        lng,
      },
    ]
  })
}

/**
 * Busca zonas de destino en Córdoba para el planificador. A diferencia de `buscarLugar`, no arma
 * una dirección de evento: devuelve la ciudad y la zona que espera `UbicacionRequest`.
 */
export async function buscarDestino(
  query: string,
  signal?: AbortSignal,
): Promise<DestinoGeocodificado[]> {
  const texto = query.trim()
  if (texto.length === 0) return []

  const data = await buscarEnNominatim(texto, signal)

  return data.flatMap((item) => {
    const lat = Number(item.lat)
    const lng = Number(item.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []

    const nombre = nombreDelLugar(item) || nombreDesdeDisplayName(item.display_name)
    const ciudad = ciudadDe(item.address) || nombre
    if (ciudad.length === 0) return []

    const zona = zonaDe(item.address)

    return [
      {
        nombre: recortar(nombre || ciudad),
        ciudad: recortar(ciudad),
        localidad: zona.length > 0 && zona !== ciudad ? recortar(zona) : null,
        lat,
        lng,
      },
    ]
  })
}

/**
 * Geocoding inverso: qué dirección hay en unas coordenadas. Se usa cuando el usuario arrastra el
 * pin del mapa. Devuelve `null` ante cualquier fallo.
 */
export async function geocodificarInverso(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<UbicacionInversa | null> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      'accept-language': 'es',
    })

    const response = await fetch(`/nominatim/reverse?${params.toString()}`, { signal })
    if (!response.ok) return null

    const data = (await response.json()) as NominatimReverseItem
    const localidad = localidadDe(data.address)
    const direccion = direccionDe(
      data.address,
      localidad || nombreDesdeDisplayName(data.display_name),
    )
    if (direccion.length === 0) return null

    return { direccion, localidad }
  } catch {
    return null
  }
}

/**
 * Geocoding inverso para el planificador: dado un punto del mapa, devuelve la zona de destino que
 * se puede guardar como `UbicacionRequest`. Devuelve `null` ante cualquier fallo o si Nominatim no
 * puede identificar una ciudad (sin `ciudad` la API rechaza el viaje).
 */
export async function geocodificarDestinoInverso(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<DestinoGeocodificado | null> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      'accept-language': 'es',
    })

    const response = await fetch(`/nominatim/reverse?${params.toString()}`, { signal })
    if (!response.ok) return null

    const data = (await response.json()) as NominatimReverseItem
    const nombre = data.name?.trim() || nombreDesdeDisplayName(data.display_name)
    const ciudad = ciudadDe(data.address) || nombre
    if (ciudad.length === 0) return null

    const zona = zonaDe(data.address) || localidadDe(data.address)

    return {
      nombre: recortar(nombre || ciudad),
      ciudad: recortar(ciudad),
      localidad: zona.length > 0 && zona !== ciudad ? recortar(zona) : null,
      lat,
      lng,
    }
  } catch {
    return null
  }
}
