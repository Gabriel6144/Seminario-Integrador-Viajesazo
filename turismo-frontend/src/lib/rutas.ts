/**
 * Cliente OSRM FOSSGIS para la geometría a pie del mapa de consulta.
 *
 * Solo routed-foot (el muñequito recorre esa geometría). Cola ≥1,1 s entre
 * requests; timeout 8 s. Si falla, la UI usa geometriaLineaRecta.
 */

export interface ParadaCoord {
  lat: number
  lng: number
}

export interface RutaDia {
  /** Coordenadas [lat, lng] listas para Leaflet. */
  geometria: [number, number][]
}

const FOOT_BASE = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving'
const MIN_GAP_MS = 1100
const TIMEOUT_MS = 8000

let queue: Promise<unknown> = Promise.resolve()
let lastStartedAt = 0

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastStartedAt))
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
    lastStartedAt = Date.now()
    return task()
  }
  const next = queue.then(run, run)
  queue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

interface OsrmResponse {
  code: string
  routes?: Array<{
    geometry?: { coordinates: [number, number][] }
  }>
}

async function fetchOsrmFoot(
  paradas: ParadaCoord[],
  signal?: AbortSignal,
): Promise<RutaDia> {
  if (paradas.length < 2) {
    return {
      geometria: paradas.map((p) => [p.lat, p.lng] as [number, number]),
    }
  }

  const coords = paradas.map((p) => `${p.lng},${p.lat}`).join(';')
  const url = `${FOOT_BASE}/${coords}?overview=full&geometries=geojson&steps=false`

  const controller = new AbortController()
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)

  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status}`)
    }
    const data = (await response.json()) as OsrmResponse
    if (data.code !== 'Ok' || !data.routes?.[0]) {
      throw new Error(`OSRM code ${data.code}`)
    }
    const route = data.routes[0]
    const geometria: [number, number][] = (route.geometry?.coordinates ?? []).map(
      ([lng, lat]) => [lat, lng],
    )
    return { geometria }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/** Obtiene la geometría a pie del día. Encola para respetar ~1 req/s. */
export function obtenerRutaDia(
  paradas: ParadaCoord[],
  signal?: AbortSignal,
): Promise<RutaDia> {
  return enqueue(() => fetchOsrmFoot(paradas, signal))
}

/** Geometría de respaldo: línea recta entre paradas. */
export function geometriaLineaRecta(paradas: ParadaCoord[]): [number, number][] {
  return paradas.map((p) => [p.lat, p.lng])
}
