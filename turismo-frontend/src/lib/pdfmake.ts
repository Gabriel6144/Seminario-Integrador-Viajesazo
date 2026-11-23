import type {
  TCreatedPdf,
  TDocumentDefinitions,
  TFontDictionary,
  TVirtualFileSystem,
} from 'pdfmake/interfaces'
import pdfmakeScriptUrl from 'pdfmake/build/pdfmake.min.js?url'

/**
 * Tipos mínimos de la instancia global que deja `pdfmake.min.js` en `window`.
 *
 * La build UMD de pdfmake 0.3.x no se lleva bien con el bundler: la cargamos como
 * script sólo cuando el turista pide el PDF, así no pesa en la carga inicial.
 */
interface PdfMakeInstance {
  addVirtualFileSystem(vfs: TVirtualFileSystem): void
  addFonts(fonts: TFontDictionary): void
  createPdf(documentDefinitions: TDocumentDefinitions): TCreatedPdf
}

declare global {
  interface Window {
    pdfMake?: PdfMakeInstance
  }
}

let pdfMakePromise: Promise<PdfMakeInstance> | null = null
let fontsRegistered = false

function loadScript(): Promise<PdfMakeInstance> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('El generador de PDF sólo funciona en el navegador'))
      return
    }
    if (window.pdfMake) {
      resolve(window.pdfMake)
      return
    }

    const script = document.createElement('script')
    script.src = pdfmakeScriptUrl
    script.async = true
    script.onload = () => {
      if (window.pdfMake) {
        resolve(window.pdfMake)
      } else {
        reject(new Error('pdfmake no se inicializó correctamente'))
      }
    }
    script.onerror = () => reject(new Error('No se pudo cargar el generador de PDF'))
    document.head.appendChild(script)
  })
}

/** Carga pdfmake una sola vez y devuelve la instancia global. */
export function loadPdfMake(): Promise<PdfMakeInstance> {
  if (pdfMakePromise === null) {
    pdfMakePromise = loadScript().catch((error) => {
      // Si falla la carga (red, script bloqueado), permitimos reintentar.
      pdfMakePromise = null
      throw error
    })
  }
  return pdfMakePromise
}

/**
 * Registra las fuentes de marca (Inter para el cuerpo, Montserrat para títulos).
 * `fonts` mapea nombre de archivo a su contenido base64.
 */
export async function registerBrandFonts(fonts: Record<string, string>): Promise<PdfMakeInstance> {
  const pdfMake = await loadPdfMake()
  if (fontsRegistered) return pdfMake

  pdfMake.addVirtualFileSystem(fonts)
  pdfMake.addFonts({
    Inter: {
      normal: 'Inter-Regular.ttf',
      bold: 'Inter-Bold.ttf',
      italics: 'Inter-Regular.ttf',
      bolditalics: 'Inter-Bold.ttf',
    },
    Montserrat: {
      normal: 'Montserrat-Regular.ttf',
      bold: 'Montserrat-Bold.ttf',
      italics: 'Montserrat-Regular.ttf',
      bolditalics: 'Montserrat-Bold.ttf',
    },
    MontserratBlack: {
      normal: 'Montserrat-Black.ttf',
      bold: 'Montserrat-Black.ttf',
      italics: 'Montserrat-Black.ttf',
      bolditalics: 'Montserrat-Black.ttf',
    },
    Caveat: {
      normal: 'Caveat-SemiBold.ttf',
      bold: 'Caveat-Bold.ttf',
      italics: 'Caveat-SemiBold.ttf',
      bolditalics: 'Caveat-Bold.ttf',
    },
  })
  fontsRegistered = true
  return pdfMake
}

/** Resetea el singleton. Sólo para tests. */
export function resetPdfMakeForTests(): void {
  pdfMakePromise = null
  fontsRegistered = false
}
