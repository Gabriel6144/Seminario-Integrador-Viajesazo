export type RoutePoint = [number, number]

export interface RouteMetrics {
  points: RoutePoint[]
  lengths: number[]
  total: number
}

export interface RouteSample {
  position: RoutePoint
  path: RoutePoint[]
}

function meters(a: RoutePoint, b: RoutePoint): number {
  const r = Math.PI / 180
  const dLat = (b[0] - a[0]) * r
  const dLon = (b[1] - a[1]) * r
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function routeMetrics(points: RoutePoint[]): RouteMetrics {
  const lengths = points.slice(1).map((point, i) => meters(points[i], point))
  return { points, lengths, total: lengths.reduce((a, b) => a + b, 0) }
}

export function sampleRoute(metrics: RouteMetrics, progress: number): RouteSample {
  const { points, lengths, total } = metrics
  if (points.length === 0) return { position: [0, 0], path: [] }
  if (progress >= 1) return { position: points[points.length - 1], path: points }
  let remaining = total * Math.max(0, progress)
  let i = 0
  while (i < lengths.length - 1 && remaining > lengths[i]) {
    remaining -= lengths[i]
    i++
  }
  const f = lengths[i] ? Math.min(remaining / lengths[i], 1) : 0
  const a = points[i]
  const b = points[i + 1] ?? a
  const position: RoutePoint = [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
  ]
  return { position, path: [...points.slice(0, i + 1), position] }
}

/** Duración del recorrido según el largo de la ruta (entre 6 s y 14 s). */
export function animationDurationMs(totalMetros: number): number {
  const clamped = Math.min(Math.max(totalMetros, 500), 8000)
  const t = (clamped - 500) / (8000 - 500)
  return Math.round(6000 + t * (14000 - 6000))
}

export interface ParadaEnRuta {
  index: number
  /** Metros recorridos sobre la geometría hasta el vértice más cercano a la parada. */
  meters: number
}

/**
 * Distancia acumulada sobre la geometría hasta el vértice más cercano a cada parada.
 * Las paradas sin coordenadas se ignoran y el resultado queda ordenado por avance.
 */
export function stopDistancesAlongRoute(
  geom: RoutePoint[],
  paradas: Array<{ lat: number; lng: number } | null | undefined>,
): ParadaEnRuta[] {
  if (geom.length === 0) return []
  const metrics = routeMetrics(geom)
  const cum: number[] = [0]
  for (const len of metrics.lengths) {
    cum.push(cum[cum.length - 1] + len)
  }

  return paradas
    .map((parada, index) => {
      if (parada == null) return null
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < geom.length; i++) {
        const dLat = geom[i][0] - parada.lat
        const dLng = geom[i][1] - parada.lng
        const d = dLat * dLat + dLng * dLng
        if (d < bestDist) {
          bestDist = d
          best = cum[i] ?? 0
        }
      }
      return { index, meters: best }
    })
    .filter((x): x is ParadaEnRuta => x != null)
    .sort((a, b) => a.meters - b.meters)
}
