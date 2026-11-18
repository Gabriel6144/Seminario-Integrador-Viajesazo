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
