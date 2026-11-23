import { loadCanvasFonts } from '@/lib/pdf-assets'

export interface HeroComposerInput {
  imageDataUrl: string | null
  badge: string
  statLabel: string
  statValue: string
  title: string
  meta: string
  width: number
  height: number
}

/**
 * Puntos del borde rasgado del hero, en porcentajes del ancho/alto. Es la misma silueta del
 * `clip-path` del diseño de Stitch, adaptada al canvas.
 */
const TORN_EDGE: Array<[number, number]> = [
  [0, 0],
  [0.965, 0],
  [0.978, 0.035],
  [0.962, 0.078],
  [0.984, 0.112],
  [0.968, 0.156],
  [0.989, 0.198],
  [0.964, 0.243],
  [0.976, 0.285],
  [0.961, 0.331],
  [0.982, 0.378],
  [0.965, 0.424],
  [0.986, 0.471],
  [0.969, 0.515],
  [0.979, 0.562],
  [0.963, 0.608],
  [0.987, 0.654],
  [0.966, 0.701],
  [0.984, 0.745],
  [0.968, 0.792],
  [0.981, 0.837],
  [0.964, 0.883],
  [0.978, 0.926],
  [0.962, 0.968],
  [0.975, 1],
  [0, 1],
]

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo cargar la imagen del hero'))
    image.src = source
  })
}

function drawTornClip(context: CanvasRenderingContext2D, width: number, height: number) {
  context.beginPath()
  TORN_EDGE.forEach(([x, y], index) => {
    const px = x * width
    const py = y * height
    if (index === 0) context.moveTo(px, py)
    else context.lineTo(px, py)
  })
  context.closePath()
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  if (typeof context.roundRect === 'function') {
    context.beginPath()
    context.roundRect(x, y, width, height, radius)
    return
  }
  context.beginPath()
  context.rect(x, y, width, height)
}

function drawBadge(context: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const label = text.toUpperCase()
  context.font = '600 8px Montserrat, sans-serif'
  const paddingX = 10
  const textWidth = context.measureText(label).width
  const width = textWidth + paddingX * 2
  const height = 20

  context.fillStyle = 'rgba(0, 91, 142, 0.72)'
  context.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  context.lineWidth = 1
  roundedRect(context, x, y, width, height, 10)
  context.fill()
  context.stroke()

  context.fillStyle = '#ffffff'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(label, x + paddingX, y + height / 2 + 0.5)
}

function drawStat(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  right: number,
  top: number,
) {
  context.textAlign = 'right'
  context.textBaseline = 'top'
  context.fillStyle = 'rgba(255,255,255,0.75)'
  context.font = '500 7px Montserrat, sans-serif'
  context.fillText(label.toUpperCase(), right, top)
  context.fillStyle = '#ffffff'
  context.font = '700 13px Montserrat, sans-serif'
  context.fillText(value, right, top + 10)
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current === '' ? word : `${current} ${word}`
    if (context.measureText(next).width <= maxWidth || current === '') {
      current = next
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current !== '') lines.push(current)
  return lines
}

function drawBottomText(
  context: CanvasRenderingContext2D,
  title: string,
  meta: string,
  width: number,
  height: number,
) {
  const margin = 18
  const maxWidth = width - margin * 2

  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.fillStyle = 'rgba(186, 230, 253, 0.95)'
  context.font = '600 7.5px Montserrat, sans-serif'
  context.fillText('TU VIAJE', margin, height - 118)

  context.fillStyle = 'rgba(255,255,255,0.97)'
  context.font = 'italic 700 22px "Playfair Display", serif'
  const lines = wrapText(context, title, maxWidth).slice(0, 3)
  lines.forEach((line, index) => {
    context.fillText(line, margin, height - 104 + index * 24)
  })

  context.fillStyle = 'rgba(226, 232, 240, 0.9)'
  context.font = '500 7.5px Montserrat, sans-serif'
  context.fillText(meta, margin, height - 24)
}

/**
 * Compone el hero izquierdo del resumen: foto recortada, degradado, badge, dato y narrativa.
 * Devuelve un PNG; el texto queda raster a propósito para conservar el diseño del Stitch.
 */
export async function composeHeroDataUrl(input: HeroComposerInput): Promise<string | null> {
  if (!input.imageDataUrl) return null
  if (typeof document === 'undefined') return null

  try {
    await loadCanvasFonts()
    const image = await loadImage(input.imageDataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = input.width
    canvas.height = input.height
    const context = canvas.getContext('2d')
    if (!context) return null

    context.save()
    drawTornClip(context, input.width, input.height)
    context.clip()
    drawCover(context, image, input.width, input.height)

    const gradient = context.createLinearGradient(0, input.height * 0.3, 0, input.height)
    gradient.addColorStop(0, 'rgba(0,0,0,0.05)')
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.45)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.86)')
    context.fillStyle = gradient
    context.fillRect(0, 0, input.width, input.height)

    drawBadge(context, input.badge, 18, 18)
    drawStat(context, input.statLabel, input.statValue, input.width - 18, 18)
    drawBottomText(context, input.title, input.meta, input.width, input.height)
    context.restore()

    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

/** Círculo con un número, para los badges de días y paradas. */
export async function buildNumberBadgeDataUrl(
  number: number,
  color: string,
  size = 36,
): Promise<string | null> {
  if (typeof document === 'undefined') return null
  try {
    await loadCanvasFonts()
    const canvas = document.createElement('canvas')
    canvas.width = size * 2
    canvas.height = size * 2
    const context = canvas.getContext('2d')
    if (!context) return null
    context.scale(2, 2)

    context.beginPath()
    context.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
    context.fillStyle = color
    context.fill()
    context.strokeStyle = 'rgba(255,255,255,0.92)'
    context.lineWidth = 1.5
    context.stroke()

    context.fillStyle = '#ffffff'
    context.font = `700 ${Math.round(size * 0.42)}px Montserrat, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(String(number), size / 2, size / 2 + 0.5)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

/** Círculo blanco con borde de color y el número, para la timeline del día. */
export async function buildOutlineBadgeDataUrl(
  number: number,
  color = '#00658d',
  size = 24,
): Promise<string | null> {
  if (typeof document === 'undefined') return null
  try {
    await loadCanvasFonts()
    const canvas = document.createElement('canvas')
    canvas.width = size * 2
    canvas.height = size * 2
    const context = canvas.getContext('2d')
    if (!context) return null
    context.scale(2, 2)

    context.beginPath()
    context.arc(size / 2, size / 2, size / 2 - 1.4, 0, Math.PI * 2)
    context.fillStyle = '#ffffff'
    context.fill()
    context.strokeStyle = color
    context.lineWidth = 1.6
    context.stroke()

    context.fillStyle = color
    context.font = `700 ${Math.round(size * 0.46)}px Montserrat, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(String(number), size / 2, size / 2 + 0.5)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}
