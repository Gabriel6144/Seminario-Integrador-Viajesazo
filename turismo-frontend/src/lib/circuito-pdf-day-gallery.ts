import { loadCanvasFonts } from '@/lib/pdf-assets'

/** Medidas de la galería editorial que va debajo del mapa, en puntos del PDF. */
export const DAY_GALLERY = { width: 531, height: 225 } as const
export const GALLERY_MAX_CARDS = 3

export interface DayGalleryStop {
  number: number
  time: string
  title: string
  category: string
  duration: string
  description: string
  location: string
  imageDataUrl?: string | null
}

export interface DayGalleryInput {
  stops: DayGalleryStop[]
  width?: number
  height?: number
}

export interface GalleryLayout {
  columns: number
  cardWidth: number
  gap: number
  startX: number
}

const PAPER = '#FCFAF6'
const CARD = '#F5F2E9'
const CHARCOAL = '#1C2421'
const SLATE = '#4A5551'
const MUTED = '#7A8883'
const CORAL = '#e05d52'
const DEEP_BLUE = '#004e7c'
const FRAME = '#1C2421'
const WHITE = '#ffffff'

const CARD_ROTATIONS = [-2.2, 1.8, -1.2]
const CAPSULE_RADII: [number, number, number, number][] = [
  [34, 12, 34, 12],
  [12, 34, 12, 34],
  [36, 36, 36, 12],
]

export function selectGalleryStops<T>(stops: T[]): T[] {
  return stops.slice(0, GALLERY_MAX_CARDS)
}

export function remainingGalleryStops(total: number): number {
  return Math.max(0, total - GALLERY_MAX_CARDS)
}

export function galleryLayout(count: number, width: number = DAY_GALLERY.width): GalleryLayout {
  const columns = Math.max(1, Math.min(count, GALLERY_MAX_CARDS))
  const gap = columns === 3 ? 18 : 24
  const cardWidth = columns === 1 ? 250 : columns === 2 ? 210 : (width - gap * 2) / 3
  const totalWidth = columns * cardWidth + (columns - 1) * gap
  return {
    columns,
    cardWidth,
    gap,
    startX: (width - totalWidth) / 2,
  }
}

/**
 * Compone la galería editorial de un día: hasta tres tarjetas con foto inclinada y cápsula de
 * texto, más una pastilla con las paradas que no entraron.
 *
 * El texto va rasterizado a propósito: pdfmake no rota imágenes ni dibuja cápsulas con radios
 * asimétricos, así que el canvas es la única forma de reproducir el diseño del Stitch. Se dibuja
 * a 2× y se exporta JPEG para no inflar el PDF.
 */
export async function composeDayGalleryDataUrl(
  input: DayGalleryInput,
): Promise<string | null> {
  const selected = selectGalleryStops(input.stops)
  if (selected.length === 0 || typeof document === 'undefined') return null

  try {
    await loadCanvasFonts()
  } catch {
    // Sin las fuentes de marca, el canvas usa las del sistema.
  }

  try {
    const width = input.width ?? DAY_GALLERY.width
    const height = input.height ?? DAY_GALLERY.height
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.scale(scale, scale)

    context.fillStyle = PAPER
    context.fillRect(0, 0, width, height)

    const layout = galleryLayout(selected.length, width)
    const cardHeight = height - 16
    const images = await Promise.all(
      selected.map(async (stop) =>
        stop.imageDataUrl ? await loadImage(stop.imageDataUrl).catch(() => null) : null,
      ),
    )

    selected.forEach((stop, index) => {
      drawCard(
        context,
        stop,
        images[index],
        layout.startX + index * (layout.cardWidth + layout.gap),
        2,
        layout.cardWidth,
        cardHeight,
        index,
      )
    })

    const remaining = remainingGalleryStops(input.stops.length)
    if (remaining > 0) drawRemainingPill(context, remaining, width, height)

    return canvas.toDataURL('image/jpeg', 0.92)
  } catch {
    return null
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo cargar la foto de la parada'))
    image.src = src
  })
}

function drawCard(
  context: CanvasRenderingContext2D,
  stop: DayGalleryStop,
  image: HTMLImageElement | null,
  left: number,
  top: number,
  width: number,
  height: number,
  index: number,
): void {
  const photoWidth = width - 8
  const photoHeight = 120
  const photoX = left + 4
  const photoY = top + 2
  const angle = (CARD_ROTATIONS[index % CARD_ROTATIONS.length] * Math.PI) / 180
  const centerX = photoX + photoWidth / 2
  const centerY = photoY + photoHeight / 2

  const capsuleX = left + 2
  const capsuleY = photoY + photoHeight - 18
  const capsuleWidth = width - 4
  const capsuleHeight = height - (capsuleY - top) - 4
  const radii = CAPSULE_RADII[index % CAPSULE_RADII.length]

  context.save()
  context.shadowColor = 'rgba(20, 24, 22, 0.22)'
  context.shadowBlur = 8
  context.shadowOffsetY = 3
  capsulePath(context, capsuleX, capsuleY, capsuleWidth, capsuleHeight, radii)
  context.fillStyle = CARD
  context.fill()
  context.restore()

  capsulePath(context, capsuleX, capsuleY, capsuleWidth, capsuleHeight, radii)
  context.strokeStyle = 'rgba(28, 36, 33, 0.12)'
  context.lineWidth = 0.8
  context.stroke()

  context.save()
  context.translate(centerX, centerY)
  context.rotate(angle)
  context.translate(-centerX, -centerY)
  context.shadowColor = 'rgba(20, 24, 22, 0.34)'
  context.shadowBlur = 9
  context.shadowOffsetY = 4
  roundedRect(context, photoX, photoY, photoWidth, photoHeight, 11)
  context.fillStyle = FRAME
  context.fill()

  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetY = 0
  context.save()
  roundedRect(context, photoX + 5, photoY + 5, photoWidth - 10, photoHeight - 10, 7)
  context.clip()
  if (image) {
    try {
      context.filter = 'saturate(1.04) contrast(1.03)'
    } catch {
      // Navegadores viejos ignoran `filter`; la foto se ve igual.
    }
    drawImageCover(
      context,
      image,
      photoX + 5,
      photoY + 5,
      photoWidth - 10,
      photoHeight - 10,
    )
    context.filter = 'none'
  } else {
    drawPhotoPlaceholder(
      context,
      stop.number,
      photoX + 5,
      photoY + 5,
      photoWidth - 10,
      photoHeight - 10,
    )
  }
  context.restore()
  context.restore()

  const padding = 11
  const textX = capsuleX + padding
  const textWidth = capsuleWidth - padding * 2
  const entryTop = capsuleY + 24

  context.textBaseline = 'top'
  context.textAlign = 'left'
  context.fillStyle = CORAL
  context.font = '700 6.1px Montserrat, Inter, sans-serif'
  context.fillText(`PARADA ${String(stop.number).padStart(2, '0')}`, textX, entryTop)

  context.textAlign = 'right'
  context.fillStyle = MUTED
  context.font = '600 6.1px Inter, sans-serif'
  context.fillText(stop.time, textX + textWidth, entryTop)

  context.textAlign = 'left'
  context.fillStyle = CHARCOAL
  context.font = '700 9px Montserrat, Inter, sans-serif'
  const titleLines = wrapLines(context, stop.title, textWidth, 2)
  const titleTop = entryTop + 11
  titleLines.forEach((line, lineIndex) => {
    context.fillText(line, textX, titleTop + lineIndex * 10)
  })

  const footerTop = capsuleY + capsuleHeight - 15
  const descTop = titleTop + titleLines.length * 10 + 3
  const maxDescLines = Math.max(1, Math.min(3, Math.floor((footerTop - descTop - 3) / 7.8)))
  context.fillStyle = SLATE
  context.font = '400 6.4px Inter, sans-serif'
  const descriptionLines = wrapLines(context, stop.description, textWidth, maxDescLines)
  descriptionLines.forEach((line, lineIndex) => {
    context.fillText(line, textX, descTop + lineIndex * 7.8)
  })

  context.strokeStyle = 'rgba(28, 36, 33, 0.12)'
  context.lineWidth = 0.6
  context.beginPath()
  context.moveTo(textX, footerTop - 3)
  context.lineTo(textX + textWidth, footerTop - 3)
  context.stroke()

  context.fillStyle = MUTED
  context.font = '600 5.7px Inter, sans-serif'
  context.textBaseline = 'middle'
  const meta = [stop.category, stop.duration].filter(Boolean).join(' · ')
  context.fillText(ellipsize(context, meta, textWidth * 0.52), textX, footerTop + 5)
  context.textAlign = 'right'
  context.fillStyle = DEEP_BLUE
  context.fillText(
    ellipsize(context, stop.location, textWidth * 0.42),
    textX + textWidth,
    footerTop + 5,
  )
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  const sourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
}

function drawPhotoPlaceholder(
  context: CanvasRenderingContext2D,
  number: number,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.fillStyle = '#E0F2FE'
  context.fillRect(x, y, width, height)

  context.strokeStyle = 'rgba(186, 230, 253, 0.65)'
  context.lineWidth = 0.6
  for (let offset = 12; offset < width + height; offset += 14) {
    context.beginPath()
    context.moveTo(x + Math.max(0, offset - height), y + Math.min(height, offset))
    context.lineTo(x + Math.min(width, offset), y + Math.max(0, offset - width))
    context.stroke()
  }

  const centerX = x + width / 2
  const centerY = y + height / 2 - 4
  context.beginPath()
  context.arc(centerX, centerY, 18, 0, Math.PI * 2)
  context.fillStyle = WHITE
  context.fill()
  context.strokeStyle = DEEP_BLUE
  context.lineWidth = 1.4
  context.stroke()

  context.fillStyle = DEEP_BLUE
  context.font = '900 18px Montserrat, Inter, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(String(number), centerX, centerY + 0.5)

  context.fillStyle = MUTED
  context.font = '700 5.2px Inter, sans-serif'
  context.textBaseline = 'bottom'
  context.fillText('SIN FOTO', centerX, y + height - 7)
}

function drawRemainingPill(
  context: CanvasRenderingContext2D,
  remaining: number,
  width: number,
  height: number,
): void {
  const text = `+ ${remaining} ${remaining === 1 ? 'PARADA MÁS' : 'PARADAS MÁS'}`
  context.font = '700 5.8px Montserrat, Inter, sans-serif'
  const textWidth = context.measureText(text).width
  const pillWidth = textWidth + 14
  const pillHeight = 11
  const x = width - pillWidth - 2
  const y = height - pillHeight

  roundedRect(context, x, y, pillWidth, pillHeight, pillHeight / 2)
  context.fillStyle = CORAL
  context.fill()

  context.fillStyle = WHITE
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, x + pillWidth / 2, y + pillHeight / 2 + 0.3)
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  capsulePath(context, x, y, width, height, [radius, radius, radius, radius])
}

function capsulePath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radii: [number, number, number, number],
): void {
  const maxRadius = Math.min(width / 2, height / 2)
  const [tl, tr, br, bl] = radii.map((radius) => Math.min(radius, maxRadius))
  context.beginPath()
  context.moveTo(x + tl, y)
  context.lineTo(x + width - tr, y)
  context.quadraticCurveTo(x + width, y, x + width, y + tr)
  context.lineTo(x + width, y + height - br)
  context.quadraticCurveTo(x + width, y + height, x + width - br, y + height)
  context.lineTo(x + bl, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - bl)
  context.lineTo(x, y + tl)
  context.quadraticCurveTo(x, y, x + tl, y)
  context.closePath()
}

function wrapLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (words.length === 0) return []

  const lines: string[] = []
  let current = ''
  for (let index = 0; index < words.length; index += 1) {
    const candidate = current ? `${current} ${words[index]}` : words[index]
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }
    if (lines.length === maxLines - 1) {
      const rest = current ? `${current} ${words.slice(index).join(' ')}` : words.slice(index).join(' ')
      lines.push(ellipsize(context, rest, maxWidth))
      return lines
    }
    if (current) lines.push(current)
    current = words[index]
  }
  if (current) lines.push(current)
  return lines
}

function ellipsize(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  let value = text.trim()
  if (context.measureText(value).width <= maxWidth) return value
  while (value.length > 1 && context.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1).trimEnd()
  }
  return `${value}…`
}
