export interface MapaStopInput {
  number: number
  title: string
  latitud?: number | null
  longitud?: number | null
}

export interface MapaMarcadorSvg {
  x: number
  y: number
  number: number
  title: string
}

export interface CircuitoMapaSvg {
  viewBox: string
  width: number
  height: number
  /** Puntos `x,y` para el `<polyline>`; vacío si no hay coordenadas. */
  points: string
  markers: MapaMarcadorSvg[]
  sinCoordenadas: boolean
}

/**
 * Proyección esquemática de las paradas de un día a un `viewBox` SVG.
 *
 * No es un mapa real: alcanza para imprimir el recorrido y el orden de las paradas sin depender
 * de tiles, red ni canvas (Leaflet/MapLibre no salen en `window.print`).
 */
export function buildCircuitoMapaSvg(
  stops: MapaStopInput[],
  { width = 560, height = 220, padding = 28 }: { width?: number; height?: number; padding?: number } = {},
): CircuitoMapaSvg {
  const conCoordenadas = stops.filter(
    (stop) =>
      typeof stop.latitud === 'number' &&
      Number.isFinite(stop.latitud) &&
      typeof stop.longitud === 'number' &&
      Number.isFinite(stop.longitud),
  )

  if (conCoordenadas.length === 0) {
    return {
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      points: '',
      markers: [],
      sinCoordenadas: true,
    }
  }

  const lats = conCoordenadas.map((stop) => stop.latitud as number)
  const lngs = conCoordenadas.map((stop) => stop.longitud as number)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const spanLat = maxLat - minLat
  const spanLng = maxLng - minLng
  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const center = { x: width / 2, y: height / 2 }

  const project = (lat: number, lng: number) => {
    if (spanLat === 0 && spanLng === 0) return center
    const x =
      spanLng === 0 ? center.x : padding + ((lng - minLng) / spanLng) * innerW
    const y =
      spanLat === 0 ? center.y : padding + ((maxLat - lat) / spanLat) * innerH
    return { x, y }
  }

  const markers = conCoordenadas.map((stop) => {
    const { x, y } = project(stop.latitud as number, stop.longitud as number)
    return { x, y, number: stop.number, title: stop.title }
  })

  return {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    points: markers.map((marker) => `${marker.x.toFixed(1)},${marker.y.toFixed(1)}`).join(' '),
    markers,
    sinCoordenadas: false,
  }
}

/**
 * Versión en string del mapa esquemático, para el fallback del PDF: se convierte a PNG con un
 * canvas y se embebe como imagen.
 */
export function buildCircuitoMapaSvgMarkup(
  map: CircuitoMapaSvg,
  {
    background = '#f7f9fb',
    lineColor = '#00658d',
    markerColor = '#00658d',
    markerTextColor = '#ffffff',
  }: {
    background?: string
    lineColor?: string
    markerColor?: string
    markerTextColor?: string
  } = {},
): string {
  const polyline = map.points
    ? `<polyline points="${map.points}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-dasharray="6 4" stroke-linecap="round" stroke-linejoin="round"/>`
    : ''
  const markers = map.markers
    .map(
      (marker) =>
        `<g><circle cx="${marker.x.toFixed(1)}" cy="${marker.y.toFixed(1)}" r="12" fill="${markerColor}" stroke="#ffffff" stroke-width="2"/>` +
        `<text x="${marker.x.toFixed(1)}" y="${(marker.y + 4).toFixed(1)}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700" fill="${markerTextColor}">${marker.number}</text></g>`,
    )
    .join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${map.width}" height="${map.height}" viewBox="${map.viewBox}">` +
    `<rect width="${map.width}" height="${map.height}" fill="${background}"/>` +
    polyline +
    markers +
    `</svg>`
  )
}
