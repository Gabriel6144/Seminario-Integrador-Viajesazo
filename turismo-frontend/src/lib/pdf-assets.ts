import caveatBoldUrl from '@/assets/fonts/Caveat-Bold.ttf?url'
import caveatSemiBoldUrl from '@/assets/fonts/Caveat-SemiBold.ttf?url'
import interBoldUrl from '@/assets/fonts/Inter-Bold.ttf?url'
import interRegularUrl from '@/assets/fonts/Inter-Regular.ttf?url'
import montserratBlackUrl from '@/assets/fonts/Montserrat-Black.ttf?url'
import montserratBoldUrl from '@/assets/fonts/Montserrat-Bold.ttf?url'
import montserratRegularUrl from '@/assets/fonts/Montserrat-Regular.ttf?url'
import montserratSemiBoldUrl from '@/assets/fonts/Montserrat-SemiBold.ttf?url'
import playfairBoldItalicUrl from '@/assets/fonts/PlayfairDisplay-BoldItalic.ttf?url'
import playfairItalicUrl from '@/assets/fonts/PlayfairDisplay-Italic.ttf?url'
import heroUrl from '@/assets/brand/hero-cordoba.jpg?url'
import rumbiUrl from '@/assets/brand/rumbi.png?url'
import { registerBrandFonts } from '@/lib/pdfmake'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const base64 = arrayBufferToBase64(await blob.arrayBuffer())
  return `data:${blob.type || 'application/octet-stream'};base64,${base64}`
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen (${response.status})`)
  }
  return response.blob()
}

async function fetchAsBase64(url: string): Promise<string> {
  const buffer = await (await fetchBlob(url)).arrayBuffer()
  return arrayBufferToBase64(buffer)
}

let brandFontsPromise: Promise<void> | null = null
let canvasFontsPromise: Promise<void> | null = null
let logoPromise: Promise<string | null> | null = null
let heroPromise: Promise<string | null> | null = null
const imageCache = new Map<string, Promise<string | null>>()

/** Carga las fuentes de marca una sola vez y las registra en pdfmake. */
export function loadBrandFonts(): Promise<void> {
  if (brandFontsPromise === null) {
    brandFontsPromise = (async () => {
      const [
        interRegular,
        interBold,
        montserratRegular,
        montserratBold,
        montserratBlack,
        caveatSemiBold,
        caveatBold,
      ] = await Promise.all([
        fetchAsBase64(interRegularUrl),
        fetchAsBase64(interBoldUrl),
        fetchAsBase64(montserratRegularUrl),
        fetchAsBase64(montserratBoldUrl),
        fetchAsBase64(montserratBlackUrl),
        fetchAsBase64(caveatSemiBoldUrl),
        fetchAsBase64(caveatBoldUrl),
      ])
      await registerBrandFonts({
        'Inter-Regular.ttf': interRegular,
        'Inter-Bold.ttf': interBold,
        'Montserrat-Regular.ttf': montserratRegular,
        'Montserrat-Bold.ttf': montserratBold,
        'Montserrat-Black.ttf': montserratBlack,
        'Caveat-SemiBold.ttf': caveatSemiBold,
        'Caveat-Bold.ttf': caveatBold,
      })
    })().catch((error) => {
      // Un fallo de red no debe dejar la promesa rota para siempre: el "Reintentar" vuelve a pedir.
      brandFontsPromise = null
      throw error
    })
  }
  return brandFontsPromise
}

/**
 * Registra las fuentes como `FontFace` para que el canvas del hero y los badges pueda usarlas.
 * pdfmake usa su propio VFS; esto es sólo para el texto que se dibuja como imagen.
 */
export function loadCanvasFonts(): Promise<void> {
  if (canvasFontsPromise === null) {
    canvasFontsPromise = (async () => {
      if (typeof FontFace === 'undefined' || typeof document === 'undefined') return
      const faces = [
        new FontFace('Caveat', `url(${caveatSemiBoldUrl})`, { weight: '600' }),
        new FontFace('Caveat', `url(${caveatBoldUrl})`, { weight: '700' }),
        new FontFace('Playfair Display', `url(${playfairItalicUrl})`, {
          style: 'italic',
          weight: '600',
        }),
        new FontFace('Playfair Display', `url(${playfairBoldItalicUrl})`, {
          style: 'italic',
          weight: '700',
        }),
        new FontFace('Montserrat', `url(${montserratRegularUrl})`, { weight: '400' }),
        new FontFace('Montserrat', `url(${montserratSemiBoldUrl})`, { weight: '600' }),
        new FontFace('Montserrat', `url(${montserratBoldUrl})`, { weight: '700' }),
        new FontFace('Montserrat', `url(${montserratBlackUrl})`, { weight: '900' }),
      ]
      await Promise.all(
        faces.map(async (face) => {
          await face.load()
          document.fonts.add(face)
        }),
      )
    })().catch((error) => {
      canvasFontsPromise = null
      throw error
    })
  }
  return canvasFontsPromise
}

/** Logo de Rumbi como data URL (PNG con transparencia). */
export function loadLogoDataUrl(): Promise<string | null> {
  if (logoPromise === null) {
    logoPromise = fetchBlob(rumbiUrl).then(blobToDataUrl).catch(() => null)
  }
  return logoPromise
}

/** Foto del hero del Stitch como data URL. */
export function loadHeroDataUrl(): Promise<string | null> {
  if (heroPromise === null) {
    heroPromise = fetchBlob(heroUrl).then(blobToDataUrl).catch(() => null)
  }
  return heroPromise
}

/**
 * Convierte una imagen remota en data URL para embeberla en el PDF.
 *
 * Primero intenta `fetch` (funciona con CDNs que permiten CORS y con las imágenes subidas al
 * backend). Si falla, intenta dibujarla en un canvas; si tampoco se puede, devuelve `null` y el
 * documento usa el placeholder de marca.
 */
export function loadImageDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || url.trim() === '') return Promise.resolve(null)
  const cached = imageCache.get(url)
  if (cached) return cached

  const promise = (async () => {
    try {
      return await blobToDataUrl(await fetchBlob(url))
    } catch {
      try {
        return await drawImageToDataUrl(url)
      } catch {
        return null
      }
    }
  })()
  imageCache.set(url, promise)
  return promise
}

function drawImageToDataUrl(url: string, maxSize = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      try {
        const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('No hay canvas disponible'))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    image.src = url
  })
}

/** Resetea la caché. Sólo para tests. */
export function resetPdfAssetsForTests(): void {
  brandFontsPromise = null
  canvasFontsPromise = null
  logoPromise = null
  heroPromise = null
  imageCache.clear()
}
