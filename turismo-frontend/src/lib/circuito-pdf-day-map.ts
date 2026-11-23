import type { CapturaMapa, CapturaMapaPunto } from '@/lib/circuito-mapa-captura'
import type { DayMapStopData } from '@/lib/circuito-pdf-day'
import { loadCanvasFonts } from '@/lib/pdf-assets'

const PAPER = '#FCFAF6'
const DEEP_BLUE = '#004e7c'
const BLUE = '#00658d'
const ROUTE_BLUE = '#008fbb'
const CORAL = '#e05d52'
const CHARCOAL = '#1C2421'
const SLATE = '#4A5551'
const MUTED = '#7A8883'
const SKY = '#bae6fd'
const WHITE = '#ffffff'

export interface DayMapComposeInput {
  capture: CapturaMapa | null
  /** Ancho y alto finales en puntos del PDF. */
  width: number
  height: number
  stops: DayMapStopData[]
  /** Ruta OSRM proyectada por la captura; si falta, el mapa no dibuja línea. */
  routePoints?: { x: number; y: number }[]
  dayNumber: number
  routeTitle: string
  totalKm: number
}

interface PointWithStop extends CapturaMapaPunto {
  stop: DayMapStopData
  /** Coordenadas en puntos del PDF. */
  px: number
  py: number
}

export interface ScaleBarData {
  /** Largo de la barra en puntos del PDF. */
  px: number
  label: string
}

const NICE_KM = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]

/**
 * Compone el mapa impreso de un día: parte de la captura de MapLibre, la tiñe de papel y dibuja
 * encima la ruta, los pines numerados, las etiquetas, la leyenda y la escala.
 *
 * Devuelve `null` si no hay captura o si el canvas no está disponible; la página muestra entonces
 * el bloque de ubicación.
 */
export async function composeDayMapDataUrl(
  input: DayMapComposeInput,
): Promise<string | null> {
  if (!input.capture || typeof document === 'undefined') return null

  try {
    await loadCanvasFonts()
  } catch {
    // Sin las fuentes de marca el mapa se dibuja igual con las del sistema.
  }

  try {
    const image = await loadImage(input.capture.image)
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(input.width * scale)
    canvas.height = Math.round(input.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.scale(scale, scale)

    const { width, height } = input
    roundedRect(context, 0, 0, width, height, 16)
    context.save()
    context.clip()

    context.fillStyle = PAPER
    context.fillRect(0, 0, width, height)
    try {
      context.filter = 'grayscale(0.35) sepia(0.06) saturate(0.92) contrast(0.96)'
    } catch {
      // Navegadores viejos ignoran `filter`; el mapa se ve igual.
    }
    context.drawImage(image, 0, 0, width, height)
    context.filter = 'none'

    context.fillStyle = 'rgba(252,250,246,0.3)'
    context.fillRect(0, 0, width, height)

    const points = projectPoints(input.capture, input.stops, width, height)
    const routeScaleX = width / input.capture.width
    const routeScaleY = height / input.capture.height
    const route = (input.routePoints ?? []).map((point) => ({
      x: point.x * routeScaleX,
      y: point.y * routeScaleY,
    }))
    if (route.length >= 2) drawRoute(context, route)
    drawPins(context, points)

    if (points.length <= 5) {
      drawLabels(context, points, width, height)
    }

    drawHeaderCard(context, input)
    drawNorth(context, width)
    drawLegend(context, height, route.length >= 2)
    const scaleBar = buildScaleBar(input.capture, input.stops, width, height)
    if (scaleBar) drawScaleBar(context, scaleBar, width, height)

    context.restore()

    context.strokeStyle = 'rgba(28,36,33,0.18)'
    context.lineWidth = 1
    roundedRect(context, 0.5, 0.5, width - 1, height - 1, 16)
    context.stroke()

    context.fillStyle = CORAL
    context.beginPath()
    context.arc(13, 13, 3, 0, Math.PI * 2)
    context.fill()

    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo cargar la captura del mapa'))
    image.src = src
  })
}

function projectPoints(
  capture: CapturaMapa,
  stops: DayMapStopData[],
  width: number,
  height: number,
): PointWithStop[] {
  const scaleX = width / capture.width
  const scaleY = height / capture.height
  return capture.points.flatMap((point) => {
    const stop = stops.find((candidate) => candidate.number === point.number)
    if (!stop) return []
    return [{ ...point, stop, px: point.x * scaleX, py: point.y * scaleY }]
  })
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.quadraticCurveTo(x + width, y, x + width, y + r)
  context.lineTo(x + width, y + height - r)
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  context.lineTo(x + r, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
}

function polylinePath(
  context: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
): void {
  if (points.length === 0) return
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y)
  }
}

function drawRoute(
  context: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
): void {
  if (points.length < 2) return
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.setLineDash([])
  context.strokeStyle = 'rgba(255,255,255,0.96)'
  context.lineWidth = 6
  polylinePath(context, points)
  context.stroke()

  context.strokeStyle = ROUTE_BLUE
  context.lineWidth = 2.6
  polylinePath(context, points)
  context.stroke()
  context.restore()
}

function drawPins(context: CanvasRenderingContext2D, points: PointWithStop[]): void {
  for (const point of points) {
    const radius = 11
    context.save()
    context.shadowColor = 'rgba(14,22,18,0.22)'
    context.shadowBlur = 5
    context.shadowOffsetY = 2
    context.beginPath()
    context.arc(point.px, point.py, radius, 0, Math.PI * 2)
    context.fillStyle = WHITE
    context.fill()
    context.restore()

    context.beginPath()
    context.arc(point.px, point.py, radius, 0, Math.PI * 2)
    context.strokeStyle = BLUE
    context.lineWidth = 2.2
    context.stroke()

    context.fillStyle = BLUE
    context.font = '700 9px Montserrat, Inter, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(String(point.stop.number), point.px, point.py + 0.5)
  }
}

interface LabelCard {
  titleLines: string[]
  meta: string
  width: number
  height: number
}

function buildLabelCard(
  context: CanvasRenderingContext2D,
  point: PointWithStop,
  maxWidth: number,
): LabelCard {
  const time = point.stop.hours.split(/\s*[-–]\s*/)[0] || ''
  const meta = [time, point.stop.category].filter(Boolean).join(' · ')
  context.font = '700 8px Montserrat, Inter, sans-serif'
  const titleLines = wrapText(context, point.stop.title, maxWidth - 12, 2)
  let titleWidth = 0
  for (const line of titleLines) {
    titleWidth = Math.max(titleWidth, context.measureText(line).width)
  }
  context.font = '500 6.3px Inter, sans-serif'
  const metaWidth = context.measureText(meta).width
  const width = Math.min(maxWidth, Math.max(titleWidth, metaWidth) + 12)
  const height = 10 + titleLines.length * 9 + 8
  return { titleLines, meta, width, height }
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (context.measureText(candidate).width <= maxWidth || current === '') {
      current = candidate
    } else {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  return lines
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function drawLabels(
  context: CanvasRenderingContext2D,
  points: PointWithStop[],
  width: number,
  height: number,
): void {
  const placed: { x: number; y: number; width: number; height: number }[] = []
  const margin = 7
  for (const point of points) {
    placed.push({ x: point.px - 12, y: point.py - 12, width: 24, height: 24 })
  }
  placed.push(
    { x: 10, y: 10, width: 108, height: 34 },
    { x: width - 32, y: 12, width: 20, height: 20 },
    { x: 10, y: height - 28, width: 86, height: 18 },
  )

  for (const point of points) {
    const card = buildLabelCard(context, point, 112)
    const candidates = [
      { x: point.px + 15, y: point.py - card.height / 2 },
      { x: point.px + 15, y: point.py + 15 },
      { x: point.px - 15 - card.width, y: point.py - card.height / 2 },
      { x: point.px - 15 - card.width, y: point.py + 15 },
    ]

    const chosen = candidates.find((candidate) => {
      const rect = { ...candidate, width: card.width, height: card.height }
      if (
        rect.x < margin ||
        rect.y < margin ||
        rect.x + rect.width > width - margin ||
        rect.y + rect.height > height - margin
      ) {
        return false
      }
      return placed.every((other) => !intersects(rect, other))
    })
    if (!chosen) continue

    placed.push({ ...chosen, width: card.width, height: card.height })

    context.save()
    context.shadowColor = 'rgba(14,22,18,0.2)'
    context.shadowBlur = 6
    context.shadowOffsetY = 2
    roundedRect(context, chosen.x, chosen.y, card.width, card.height, 6)
    context.fillStyle = WHITE
    context.fill()
    context.restore()

    roundedRect(context, chosen.x, chosen.y, card.width, card.height, 6)
    context.strokeStyle = 'rgba(186,230,253,0.9)'
    context.lineWidth = 0.8
    context.stroke()

    context.textAlign = 'left'
    context.textBaseline = 'top'
    context.fillStyle = CHARCOAL
    context.font = '700 8px Montserrat, Inter, sans-serif'
    card.titleLines.forEach((line, index) => {
      context.fillText(line, chosen.x + 6, chosen.y + 5 + index * 9)
    })
    context.fillStyle = SLATE
    context.font = '500 6.3px Inter, sans-serif'
    context.fillText(card.meta, chosen.x + 6, chosen.y + 5 + card.titleLines.length * 9 + 1)
  }
}

function drawHeaderCard(
  context: CanvasRenderingContext2D,
  input: DayMapComposeInput,
): void {
  const cardWidth = 108
  const cardHeight = 34
  roundedRect(context, 10, 10, cardWidth, cardHeight, 7)
  context.fillStyle = 'rgba(252,250,246,0.94)'
  context.fill()
  context.strokeStyle = 'rgba(186,230,253,0.9)'
  context.lineWidth = 0.8
  context.stroke()

  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.fillStyle = CORAL
  context.font = '700 6.2px Montserrat, Inter, sans-serif'
  context.fillText(`DÍA ${input.dayNumber}`, 16, 15)
  context.fillStyle = DEEP_BLUE
  context.font = '700 7.4px Montserrat, Inter, sans-serif'
  context.fillText(truncate(input.routeTitle.toUpperCase(), 22), 16, 24)
  context.fillStyle = MUTED
  context.font = '500 6px Inter, sans-serif'
  context.fillText(
    `${input.stops.length} paradas · ${input.totalKm.toFixed(1).replace('.', ',')} km`,
    16,
    34,
  )
}

function drawNorth(context: CanvasRenderingContext2D, width: number): void {
  const cx = width - 22
  const cy = 22
  context.beginPath()
  context.arc(cx, cy, 10, 0, Math.PI * 2)
  context.fillStyle = 'rgba(252,250,246,0.94)'
  context.fill()
  context.strokeStyle = SKY
  context.lineWidth = 0.9
  context.stroke()

  context.beginPath()
  context.moveTo(cx, cy - 6)
  context.lineTo(cx + 3.2, cy + 3)
  context.lineTo(cx, cy + 1.2)
  context.lineTo(cx - 3.2, cy + 3)
  context.closePath()
  context.fillStyle = DEEP_BLUE
  context.fill()

  context.fillStyle = DEEP_BLUE
  context.font = '700 5.8px Montserrat, Inter, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'top'
  context.fillText('N', cx, cy + 4)
}

function drawLegend(
  context: CanvasRenderingContext2D,
  height: number,
  hasRoute: boolean,
): void {
  if (!hasRoute) return
  const x = 10
  const y = height - 28
  roundedRect(context, x, y, 86, 18, 6)
  context.fillStyle = 'rgba(252,250,246,0.94)'
  context.fill()
  context.strokeStyle = 'rgba(186,230,253,0.9)'
  context.lineWidth = 0.8
  context.stroke()

  context.save()
  context.setLineDash([])
  context.strokeStyle = ROUTE_BLUE
  context.lineWidth = 1.6
  context.beginPath()
  context.moveTo(x + 8, y + 9)
  context.lineTo(x + 26, y + 9)
  context.stroke()
  context.restore()

  context.fillStyle = SLATE
  context.font = '600 5.8px Inter, sans-serif'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText('Recorrido', x + 32, y + 9.5)
}

/** Distancia Haversine en kilómetros. */
export function haversineKm(
  a: { latitud: number; longitud: number },
  b: { latitud: number; longitud: number },
): number {
  const earth = 6371
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(b.latitud - a.latitud)
  const dLng = toRad(b.longitud - a.longitud)
  const lat1 = toRad(a.latitud)
  const lat2 = toRad(b.latitud)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Calcula una barra de escala honesta a partir de dos paradas con coordenadas: compara su distancia
 * real con la distancia en píxeles que quedó en la captura.
 */
export function buildScaleBar(
  capture: CapturaMapa,
  stops: DayMapStopData[],
  width: number,
  height: number,
): ScaleBarData | null {
  const scaleX = width / capture.width
  const scaleY = height / capture.height
  const candidates = capture.points.flatMap((point) => {
    const stop = stops.find((item) => item.number === point.number)
    if (
      !stop ||
      typeof stop.latitud !== 'number' ||
      typeof stop.longitud !== 'number' ||
      !Number.isFinite(stop.latitud) ||
      !Number.isFinite(stop.longitud)
    ) {
      return []
    }
    return [
      {
        x: point.x * scaleX,
        y: point.y * scaleY,
        latitud: stop.latitud,
        longitud: stop.longitud,
      },
    ]
  })

  let best: { distance: number; km: number } | null = null
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i]
      const b = candidates[j]
      const distance = Math.hypot(b.x - a.x, b.y - a.y)
      if (distance < 20) continue
      if (!best || distance > best.distance) {
        best = { distance, km: haversineKm(a, b) }
      }
    }
  }
  if (!best) return null

  const kmPerPoint = best.km / best.distance
  const target = 56
  const raw = target * kmPerPoint
  let nice = NICE_KM[0]
  for (const value of NICE_KM) {
    if (value <= raw) nice = value
  }
  const px = Math.max(28, Math.min(86, nice / kmPerPoint))
  const label = nice < 1 ? `${Math.round(nice * 1000)} m` : `${nice} km`
  return { px, label }
}

function drawScaleBar(
  context: CanvasRenderingContext2D,
  bar: ScaleBarData,
  width: number,
  height: number,
): void {
  const x = width - bar.px - 14
  const y = height - 18
  context.save()
  context.strokeStyle = DEEP_BLUE
  context.lineWidth = 1.6
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(x, y)
  context.lineTo(x + bar.px, y)
  context.moveTo(x, y - 3)
  context.lineTo(x, y + 3)
  context.moveTo(x + bar.px, y - 3)
  context.lineTo(x + bar.px, y + 3)
  context.stroke()

  context.fillStyle = DEEP_BLUE
  context.font = '600 5.8px Inter, sans-serif'
  context.textAlign = 'right'
  context.textBaseline = 'bottom'
  const labelWidth = context.measureText(bar.label).width
  roundedRect(context, x + bar.px - labelWidth - 7, y - 16, labelWidth + 6, 10, 3)
  context.fillStyle = 'rgba(252,250,246,0.94)'
  context.fill()
  context.fillStyle = DEEP_BLUE
  context.fillText(bar.label, x + bar.px, y - 4)
  context.restore()
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}
