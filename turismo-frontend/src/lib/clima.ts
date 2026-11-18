/** Clima Córdoba vía Open-Meteo (mismo criterio que el top bar). */

const CORDOBA_LAT = -31.4201
const CORDOBA_LON = -64.1888
const TIMEZONE = 'America%2FArgentina%2FCordoba'

export interface ClimaDia {
  fecha: string
  weatherCode: number
  icono: string
  descripcion: string
  malClima: boolean
}

export function resolverIconoClima(
  code: number,
  isDay = 1,
): { icono: string; descripcion: string } {
  const deDia = isDay === 1
  if (code === 0) {
    return {
      icono: deDia ? 'sunny' : 'clear_night',
      descripcion: 'Cielo despejado',
    }
  }
  if (code === 1 || code === 2) {
    return {
      icono: deDia ? 'partly_cloudy_day' : 'partly_cloudy_night',
      descripcion: 'Parcialmente nublado',
    }
  }
  if (code === 3) {
    return { icono: 'cloud', descripcion: 'Nublado' }
  }
  if (code === 45 || code === 48) {
    return { icono: 'foggy', descripcion: 'Neblina' }
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { icono: 'rainy', descripcion: 'Lluvia' }
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { icono: 'ac_unit', descripcion: 'Nieve' }
  }
  if (code >= 95) {
    return { icono: 'thunderstorm', descripcion: 'Tormenta' }
  }
  return {
    icono: deDia ? 'partly_cloudy_day' : 'partly_cloudy_night',
    descripcion: 'Clima en Córdoba',
  }
}

/** Lluvia, nieve o tormenta según códigos WMO de Open-Meteo. */
export function esMalClima(code: number): boolean {
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return true
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return true
  if (code >= 95) return true
  return false
}

/**
 * Forecast diario para el mes visible (aprox. 16 días de Open-Meteo free;
 * pedimos un rango amplio y mapeamos lo disponible).
 */
export async function fetchClimaDiarioCordoba(
  signal?: AbortSignal,
): Promise<Map<string, ClimaDia>> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${CORDOBA_LAT}&longitude=${CORDOBA_LON}` +
    `&daily=weather_code&timezone=${TIMEZONE}&forecast_days=16`

  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`clima Open-Meteo HTTP ${res.status}`)
  }
  const data = (await res.json()) as {
    daily?: { time?: string[]; weather_code?: number[] }
  }
  const times = data.daily?.time ?? []
  const codes = data.daily?.weather_code ?? []
  const map = new Map<string, ClimaDia>()
  for (let i = 0; i < times.length; i++) {
    const fecha = times[i]
    const weatherCode = codes[i] ?? 1
    const { icono, descripcion } = resolverIconoClima(weatherCode, 1)
    map.set(fecha, {
      fecha,
      weatherCode,
      icono,
      descripcion,
      malClima: esMalClima(weatherCode),
    })
  }
  return map
}
