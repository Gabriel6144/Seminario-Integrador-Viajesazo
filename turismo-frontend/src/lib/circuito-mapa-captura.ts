import {
  buildCircuitoMapaSvg,
  buildCircuitoMapaSvgMarkup,
  type MapaStopInput,
} from '@/lib/circuito-svg'

const STYLE_URL = '/viajezaso/assets/maps/cordoba-style.json'
const DEFAULT_WIDTH = 720
const DEFAULT_HEIGHT = 300
const DEFAULT_TIMEOUT_MS = 8000

export interface CapturaMapaOptions {
  width?: number
  height?: number
  timeoutMs?: number
}

export interface CapturaMapaPunto {
  number: number
  /** Coordenada en píxeles CSS del canvas capturado, con origen arriba a la izquierda. */
  x: number
  y: number
}

export interface CapturaMapa {
  image: string
  points: CapturaMapaPunto[]
  width: number
  height: number
}

function conCoordenadas(stops: MapaStopInput[]): MapaStopInput[] {
  return stops.filter(
    (stop) =>
      typeof stop.latitud === 'number' &&
      Number.isFinite(stop.latitud) &&
      typeof stop.longitud === 'number' &&
      Number.isFinite(stop.longitud),
  )
}

/**
 * Captura un mapa real del día con MapLibre y devuelve el PNG junto con las coordenadas en píxeles
 * de cada parada, para que el compositor del PDF dibuje la ruta y los pines encima.
 *
 * Si WebGL, los tiles o el estilo fallan, cae al mapa esquemático SVG convertido a PNG. Si no hay
 * coordenadas, devuelve `null` y el documento muestra el bloque "Sin ubicación".
 */
export async function captureCircuitoDiaMapa(
  stops: MapaStopInput[],
  options: CapturaMapaOptions = {},
): Promise<CapturaMapa | null> {
  const width = options.width ?? DEFAULT_WIDTH
  const height = options.height ?? DEFAULT_HEIGHT
  const validas = conCoordenadas(stops)
  if (validas.length === 0) return null

  try {
    return await captureWithMapLibre(
      validas,
      width,
      height,
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )
  } catch {
    // Sin WebGL, sin red o con tiles lentos: el SVG garantiza que haya mapa.
  }

  return captureSvgFallback(validas, width, height)
}

async function captureWithMapLibre(
  stops: MapaStopInput[],
  width: number,
  height: number,
  timeoutMs: number,
): Promise<CapturaMapa> {
  const { Map: MapLibreMap, LngLatBounds } = await import('maplibre-gl')

  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;pointer-events:none;`
  document.body.appendChild(container)

  const first = stops[0]
  const map = new MapLibreMap({
    container,
    style: STYLE_URL,
    center: [first.longitud as number, first.latitud as number],
    zoom: 11,
    pitch: 0,
    bearing: 0,
    interactive: false,
    attributionControl: false,
    canvasContextAttributes: { preserveDrawingBuffer: true },
  })

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false
      let timer: ReturnType<typeof setTimeout>
      const fail = (error: unknown) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error('No se pudo capturar el mapa'))
      }
      timer = setTimeout(() => fail(new Error('El mapa tardó demasiado en cargar')), timeoutMs)
      const finish = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve()
      }
      let loaded = false
      map.on('error', (event) => {
        // Después de `load`, los errores suelen ser tiles sueltos: no abortamos la captura.
        if (!loaded) fail(event.error)
      })

      map.on('load', () => {
        loaded = true
        try {
          // Las etiquetas del estilo ensucian el mapa impreso: las dibujamos nosotros.
          try {
            const layers = map.getStyle().layers ?? []
            for (const layer of layers) {
              if (layer.type === 'symbol') {
                map.setLayoutProperty(layer.id, 'visibility', 'none')
              }
            }
          } catch {
            // Si el estilo no expone capas, seguimos con el mapa base.
          }

          if (stops.length === 1) {
            map.setCenter([first.longitud as number, first.latitud as number])
            map.setZoom(14)
          } else {
            const bounds = new LngLatBounds()
            for (const stop of stops) {
              bounds.extend([stop.longitud as number, stop.latitud as number])
            }
            map.fitBounds(bounds, { padding: 48, duration: 0 })
          }
          map.once('idle', finish)
        } catch (error) {
          fail(error)
        }
      })
    })

    const points = stops.map((stop) => {
      const point = map.project([stop.longitud as number, stop.latitud as number])
      return { number: stop.number, x: point.x, y: point.y }
    })

    return {
      image: map.getCanvas().toDataURL('image/png'),
      points,
      width,
      height,
    }
  } finally {
    map.remove()
    container.remove()
  }
}

async function captureSvgFallback(
  stops: MapaStopInput[],
  width: number,
  height: number,
): Promise<CapturaMapa | null> {
  const map = buildCircuitoMapaSvg(stops, { width, height })
  if (map.sinCoordenadas) return null
  const svg = buildCircuitoMapaSvgMarkup(map)
  try {
    const image = await svgToPngDataUrl(svg, width, height)
    return {
      image,
      points: map.markers.map((marker) => ({
        number: marker.number,
        x: marker.x,
        y: marker.y,
      })),
      width,
      height,
    }
  } catch {
    return null
  }
}

/** Convierte un SVG string a PNG data URL usando un canvas. */
export function svgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width * 2
        canvas.height = height * 2
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('No hay canvas disponible'))
          return
        }
        context.fillStyle = '#f7f9fb'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => reject(new Error('No se pudo dibujar el SVG'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}
