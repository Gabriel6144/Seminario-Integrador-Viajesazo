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

export interface ClimaActualCordoba {
  temperatura: number
  icono: string
  descripcion: string
  sensacionTermica?: number
  humedad?: number
}

const WTTR_CORDOBA_URL = 'https://wttr.in/Cordoba,Argentina?format=j1&lang=es'
const OPEN_METEO_CURRENT_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${CORDOBA_LAT}&longitude=${CORDOBA_LON}` +
  `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day&timezone=${TIMEZONE}`

const WWO_TO_WMO: Record<number, number> = {
  113: 0, // Despejado
  116: 2, // Parcialmente nublado
  119: 3, // Nublado
  122: 3, // Cubierto
  143: 45, // Neblina
  248: 45, // Niebla
  260: 48, // Niebla helada
  176: 61, // Lluvias aisladas
  263: 51, // Llovizna ligera
  266: 53, // Llovizna
  281: 56,
  284: 57,
  293: 61, // Lluvia débil
  296: 61,
  299: 63, // Lluvia moderada
  302: 63,
  305: 65, // Lluvia fuerte
  308: 65,
  353: 80, // Chaparrón
  356: 81,
  359: 82,
  179: 71, // Nieve
  227: 73,
  230: 75,
  323: 71,
  326: 71,
  329: 73,
  332: 73,
  335: 75,
  338: 75,
  200: 95, // Tormenta
  386: 95,
  389: 96,
  392: 95,
  395: 99,
}

/** Traduce códigos WWO (wttr.in) a códigos WMO para reutilizar `resolverIconoClima`. */
export function wwoToWmoCode(wwoCode: number): number {
  return WWO_TO_WMO[wwoCode] ?? 2
}

function esDeDiaEnCordoba(): number {
  try {
    const horaStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Cordoba',
      hour: 'numeric',
      hour12: false,
    }).format(new Date())
    const hora = Number(horaStr)
    return hora >= 6 && hora < 20 ? 1 : 0
  } catch {
    return 1
  }
}

async function fetchWttrCordoba(signal?: AbortSignal): Promise<ClimaActualCordoba | null> {
  const localController = new AbortController()
  const timeoutId = window.setTimeout(() => localController.abort(), 3500)
  const onParentAbort = () => localController.abort()
  signal?.addEventListener('abort', onParentAbort)

  try {
    const res = await fetch(WTTR_CORDOBA_URL, { signal: localController.signal })
    if (!res.ok) return null
    const data = (await res.json()) as {
      current_condition?: Array<{
        temp_C?: string
        FeelsLikeC?: string
        humidity?: string
        weatherCode?: string
        lang_es?: Array<{ value?: string }>
      }>
    }
    const current = data.current_condition?.[0]
    const temp = Number(current?.temp_C)
    if (!Number.isFinite(temp)) return null

    const wwoCode = Number(current?.weatherCode ?? 116)
    const wmoCode = wwoToWmoCode(wwoCode)
    const { icono, descripcion } = resolverIconoClima(wmoCode, esDeDiaEnCordoba())
    const descEs = current?.lang_es?.[0]?.value?.trim()
    const feels = Number(current?.FeelsLikeC)
    const humidity = Number(current?.humidity)

    return {
      temperatura: Math.round(temp),
      icono,
      descripcion: descEs || descripcion,
      sensacionTermica: Number.isFinite(feels) ? Math.round(feels) : undefined,
      humedad: Number.isFinite(humidity) ? Math.round(humidity) : undefined,
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', onParentAbort)
  }
}

async function fetchOpenMeteoActual(signal?: AbortSignal): Promise<ClimaActualCordoba | null> {
  const res = await fetch(OPEN_METEO_CURRENT_URL, { signal })
  if (!res.ok) return null
  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number
      apparent_temperature?: number
      relative_humidity_2m?: number
      weather_code?: number
      is_day?: number
    }
  }
  const temp = data.current?.temperature_2m
  if (typeof temp !== 'number') return null
  const code = data.current?.weather_code ?? 1
  const isDay = data.current?.is_day ?? 1
  const { icono, descripcion } = resolverIconoClima(code, isDay)
  const feels = data.current?.apparent_temperature
  const humidity = data.current?.relative_humidity_2m

  return {
    temperatura: Math.round(temp),
    icono,
    descripcion,
    sensacionTermica: typeof feels === 'number' ? Math.round(feels) : undefined,
    humedad: typeof humidity === 'number' ? Math.round(humidity) : undefined,
  }
}

/**
 * Obtiene el clima actual de Córdoba priorizando observación de estación (`wttr.in`)
 * y usando Open-Meteo como respaldo automático si falla o demora.
 */
export async function fetchClimaActualCordoba(
  signal?: AbortSignal,
): Promise<ClimaActualCordoba | null> {
  const estacion = await fetchWttrCordoba(signal)
  if (estacion !== null) return estacion
  if (signal?.aborted) return null
  return fetchOpenMeteoActual(signal)
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
