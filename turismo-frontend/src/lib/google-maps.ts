/**
 * URLs de Google Maps Directions (sin API key, sin travelmode).
 * El turista elige a pie / auto / transporte en la app o web de Google.
 */

export type PuntoGoogleMaps = {
  latitud?: number | null
  longitud?: number | null
  /** Texto ya armado (p.ej. stop.location); se ignora el placeholder vacío. */
  direccionTexto?: string | null
}

const DIR_BASE = 'https://www.google.com/maps/dir/'
const PLACEHOLDER_DIRECCION = 'Ubicación a confirmar'
const MAX_URL_LENGTH = 2048
/** Origen + hasta 3 intermedias + destino. */
const MAX_PARADAS_POR_TRAMO = 5

function direccionUsable(texto: string | null | undefined): string | null {
  if (!texto) return null
  const trimmed = texto.trim()
  if (!trimmed || trimmed === PLACEHOLDER_DIRECCION) return null
  return trimmed
}

/** Convierte un punto a parámetro de Google Maps, o null si no hay datos. */
export function puntoAParam(punto: PuntoGoogleMaps): string | null {
  if (
    punto.latitud != null &&
    punto.longitud != null &&
    Number.isFinite(punto.latitud) &&
    Number.isFinite(punto.longitud)
  ) {
    return `${punto.latitud},${punto.longitud}`
  }
  return direccionUsable(punto.direccionTexto ?? null)
}

function buildDirUrl(params: {
  origin?: string
  destination: string
  waypoints?: string[]
}): string | null {
  const search = new URLSearchParams()
  search.set('api', '1')
  if (params.origin) search.set('origin', params.origin)
  search.set('destination', params.destination)
  if (params.waypoints && params.waypoints.length > 0) {
    search.set('waypoints', params.waypoints.join('|'))
  }
  const url = `${DIR_BASE}?${search.toString()}`
  if (url.length > MAX_URL_LENGTH) return null
  return url
}

/**
 * Direcciones hasta un destino. Sin origen: Google usa la ubicación del dispositivo.
 */
export function linkComoLlegar(
  destino: PuntoGoogleMaps,
  origen?: PuntoGoogleMaps | null,
): string | null {
  const destination = puntoAParam(destino)
  if (!destination) return null
  const origin = origen ? puntoAParam(origen) : null
  return buildDirUrl({
    destination,
    ...(origin ? { origin } : {}),
  })
}

/**
 * Una o varias URLs para recorrer el día en orden.
 * Tramos de hasta 5 paradas (origen + 3 intermedias + destino), encadenados.
 * Un solo punto usable → solo `destination`.
 */
export function linksDiaCompleto(paradas: PuntoGoogleMaps[]): string[] {
  const params = paradas
    .map(puntoAParam)
    .filter((p): p is string => p != null)

  if (params.length === 0) return []
  if (params.length === 1) {
    const url = buildDirUrl({ destination: params[0] })
    return url ? [url] : []
  }

  const urls: string[] = []
  let start = 0
  while (start < params.length - 1 || (start === 0 && params.length >= 2)) {
    const end = Math.min(start + MAX_PARADAS_POR_TRAMO - 1, params.length - 1)
    const slice = params.slice(start, end + 1)
    if (slice.length < 2) break

    const origin = slice[0]
    const destination = slice[slice.length - 1]
    const waypoints = slice.slice(1, -1)
    const url = buildDirUrl({ origin, destination, waypoints })
    if (url) urls.push(url)

    if (end >= params.length - 1) break
    // Encadenar: la última del tramo es la primera del siguiente.
    start = end
  }

  return urls
}
