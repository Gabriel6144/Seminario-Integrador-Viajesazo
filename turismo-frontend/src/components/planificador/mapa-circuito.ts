/** Interfaz común para el mapa 2D (Leaflet) y 3D (MapLibre) de la consulta. */

export interface ParadaMapa {
  index: number
  number: number
  title: string
  hours: string
  latitud: number
  longitud: number
}

export interface MapaCircuito {
  setRuta(geom: [number, number][]): void
  setParadas(paradas: ParadaMapa[], activa: number): void
  setActiva(i: number): void
  encuadrarRuta(): void
  setProgreso(
    path: [number, number][],
    position: [number, number] | null,
  ): void
  destruir(): void
}

export type ModoMapaVista = '2d' | '3d'

export const STORAGE_MODO_MAPA = 'vz-mapa-modo'

export function leerModoMapa(): ModoMapaVista {
  try {
    const raw = localStorage.getItem(STORAGE_MODO_MAPA)
    if (raw === '3d' || raw === '2d') return raw
  } catch {
    /* localStorage no disponible */
  }
  return '2d'
}

export function guardarModoMapa(modo: ModoMapaVista): void {
  try {
    localStorage.setItem(STORAGE_MODO_MAPA, modo)
  } catch {
    /* ignore */
  }
}

export function pathToGeoJson(path: [number, number][]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: path.map(([lat, lng]) => [lng, lat]),
    },
  }
}

export function crearMarcadorNumero(
  number: number,
  isActive: boolean,
): HTMLButtonElement {
  const size = isActive ? 36 : 28
  const bg = isActive ? '#00658d' : '#ffffff'
  const color = isActive ? '#ffffff' : '#008fbb'
  const border = isActive ? '#00658d' : '#008fbb'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = String(number)
  btn.style.width = `${size}px`
  btn.style.height = `${size}px`
  btn.style.borderRadius = '9999px'
  btn.style.border = `2px solid ${border}`
  btn.style.background = bg
  btn.style.color = color
  btn.style.display = 'flex'
  btn.style.alignItems = 'center'
  btn.style.justifyContent = 'center'
  btn.style.fontWeight = '700'
  btn.style.fontSize = isActive ? '13px' : '12px'
  btn.style.boxShadow = isActive
    ? '0 0 0 6px rgba(0,101,141,0.25)'
    : '0 1px 4px rgba(0,0,0,0.2)'
  btn.style.cursor = 'pointer'
  btn.style.padding = '0'
  return btn
}

export const TURISTA_SRC = '/viajezaso/assets/turista.png'
export const TURISTA_ANCHO = 44
export const TURISTA_ALTO = 49

/**
 * Imagen del muñequito que recorre la ruta. El tamaño va en `style` (no en los atributos
 * width/height): la hoja de estilos de Leaflet fuerza `width: auto` en las imágenes de los
 * marcadores y, sin esto, el PNG se dibuja en su tamaño original (enorme).
 */
export function crearImagenTurista(): HTMLImageElement {
  const img = document.createElement('img')
  img.src = TURISTA_SRC
  img.alt = ''
  img.draggable = false
  img.style.display = 'block'
  img.style.width = `${TURISTA_ANCHO}px`
  img.style.height = `${TURISTA_ALTO}px`
  img.style.maxWidth = 'none'
  img.style.filter = 'drop-shadow(0 3px 3px rgba(0,0,0,0.3))'
  img.style.transformOrigin = '50% 100%'
  img.style.pointerEvents = 'none'

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reducedMotion && typeof img.animate === 'function') {
    // Balanceo suave de "caminata" mientras avanza por la ruta.
    img.animate(
      [
        { transform: 'translateY(0) rotate(-3deg)' },
        { transform: 'translateY(-4px) rotate(3deg)' },
        { transform: 'translateY(0) rotate(-3deg)' },
      ],
      { duration: 450, iterations: Infinity, easing: 'ease-in-out' },
    )
  }
  return img
}
