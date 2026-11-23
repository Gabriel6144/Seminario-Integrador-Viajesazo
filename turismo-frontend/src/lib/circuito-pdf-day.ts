import type {
  CircuitoRecomendado,
  ParadaCircuitoDetalle,
} from '@/components/planificador/types'
import type { ViajeResponse } from '@/types/api'

/** Medidas en puntos del mapa de cada día dentro de la página A4 vertical. */
export const DAY_MAP = { width: 302, height: 410 } as const

export interface DayMapStopData {
  number: number
  title: string
  hours: string
  category: string
  latitud?: number
  longitud?: number
}

export interface DayStopData {
  number: number
  time: string
  hours: string
  title: string
  category: string
  duration: string
  description: string
  location: string
}

export interface DayData {
  number: number
  title: string
  badge: string
  dateLabel: string
  location: string
  summary: string
  totalKm: number
  stops: DayStopData[]
  mapStops: DayMapStopData[]
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim() !== ''))]
}

export function routeTitle(stops: ParadaCircuitoDetalle[], fallback: string): string {
  const places = unique(stops.flatMap((stop) => [stop.localidad ?? '', stop.ciudad ?? '']))
  if (places.length === 0) return fallback
  if (places.length === 1) return places[0]
  return `${places[0]} — ${places[places.length - 1]}`
}

export function formatKilometers(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`
}

function clock(value: string): string {
  const match = value.match(/\d{1,2}:\d{2}/)
  return match ? match[0] : ''
}

function startTime(stop: ParadaCircuitoDetalle): string {
  return clock(stop.horaInicio ?? '') || clock(stop.hours.split(/\s*[-–]\s*/)[0] ?? '') || stop.time
}

function mainCategory(stops: ParadaCircuitoDetalle[]): string {
  const counts = new Map<string, number>()
  for (const stop of stops) {
    const category = stop.category.trim()
    if (category === '') continue
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  let winner = ''
  let winnerCount = 0
  for (const [category, count] of counts) {
    if (count > winnerCount) {
      winner = category
      winnerCount = count
    }
  }
  return winner
}

function dayLocation(
  stops: ParadaCircuitoDetalle[],
  viaje: ViajeResponse | null,
  fallback: string,
): string {
  const first = stops.find((stop) => stop.location.trim() !== '')
  if (first) return first.location
  const places = unique(stops.flatMap((stop) => [stop.localidad ?? '', stop.ciudad ?? '']))
  if (places.length > 0) return places.join(' · ')
  return viaje?.ubicacion?.nombre ?? viaje?.ubicacion?.ciudad ?? fallback
}

/**
 * Datos de una página de día, separados de pdfmake para poder testearlos y para que el compositor
 * del mapa use exactamente los mismos textos y números que la timeline.
 */
export function buildDayData(
  day: CircuitoRecomendado['days'][number],
  circuito: CircuitoRecomendado,
  viaje: ViajeResponse | null,
): DayData {
  const rawStops = circuito.stopsByDay[day.number] ?? []
  const totalKm = rawStops.reduce((total, stop) => total + stop.trasladoKm, 0)
  const category = mainCategory(rawStops)

  const stops: DayStopData[] = rawStops.map((stop) => ({
    number: stop.number,
    time: startTime(stop),
    hours: stop.hours,
    title: stop.title,
    category: stop.category,
    duration: stop.duration,
    description: stop.detailDescription || stop.description || stop.location,
    location: stop.location,
  }))

  return {
    number: day.number,
    title: routeTitle(rawStops, day.label),
    badge: category ? `DÍA ${day.number} · ${category.toUpperCase()}` : `DÍA ${day.number}`,
    dateLabel: day.label,
    location: dayLocation(rawStops, viaje, day.summary),
    summary: day.summary,
    totalKm,
    stops,
    mapStops: rawStops.map((stop) => ({
      number: stop.number,
      title: stop.title,
      hours: stop.hours,
      category: stop.category,
      latitud: stop.latitud,
      longitud: stop.longitud,
    })),
  }
}
